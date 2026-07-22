import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useVacationData from '../../hooks/useVacationData';
import ConfirmModal from '../ConfirmModal';

export default function VacationForm({ onBack, requestToEdit }) {
  const { employees } = useEmployeeData();
  const { addRequest, updateRequest, calculateEmployeeBalance } = useVacationData();

  const [selectedEmpId, setSelectedEmpId] = useState(requestToEdit ? requestToEdit.employeeId : '');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [year, setYear] = useState(requestToEdit ? requestToEdit.year : new Date().getFullYear().toString());
  const [type, setType] = useState(requestToEdit ? requestToEdit.type : 'Férias Anuais');
  const [startDate, setStartDate] = useState(requestToEdit ? requestToEdit.startDate : '');
  const [endDate, setEndDate] = useState(requestToEdit ? requestToEdit.endDate : '');
  const [notes, setNotes] = useState(requestToEdit ? requestToEdit.notes : '');

  const [errorMsg, setErrorMsg] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });

  // Pega o funcionário selecionado
  const selectedEmp = useMemo(() => {
    return employees.find(e => e.id === selectedEmpId) || null;
  }, [selectedEmpId, employees]);

  // Filtra os funcionários para o autocomplete
  const filteredEmployees = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return employees.filter(e => 
      e.isActive !== false && 
      (e.name.toLowerCase().includes(term) || (e.nip && e.nip.toLowerCase().includes(term)))
    ).slice(0, 5);
  }, [searchTerm, employees]);

  // Calcula balanço (saldo)
  const balance = useMemo(() => {
    if (!selectedEmp) return null;
    return calculateEmployeeBalance(selectedEmp.id, selectedEmp.admissionDate);
  }, [selectedEmp, calculateEmployeeBalance]);

  // Calcula dias selecionados
  const calculatedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end - start);
    // +1 para incluir o próprio dia
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedEmp) {
      setErrorMsg("Selecione um funcionário.");
      return;
    }

    if (calculatedDays <= 0) {
      setErrorMsg("O período de datas é inválido.");
      return;
    }

    if (balance && calculatedDays > balance.balance && !['Férias Excecionais', 'Licença Sem Vencimento', 'Licença Registada', 'Licença de Junta de Saúde'].includes(type)) {
      setErrorMsg(`Saldo insuficiente! Tentou marcar ${calculatedDays} dias mas só tem ${balance.balance} disponíveis.`);
      return;
    }

    const payload = {
      employeeId: selectedEmp.id,
      employeeNip: selectedEmp.nip,
      employeeName: selectedEmp.name,
      year,
      type,
      startDate,
      endDate,
      daysCount: calculatedDays,
      notes,
      createdBy: 'Admin'
    };

    if (requestToEdit) {
      await updateRequest(requestToEdit.id, payload, 'Admin', 'Edição de formulário');
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Pedido de férias atualizado com sucesso!',
        onConfirm: onBack,
        hideCancel: true
      });
    } else {
      await addRequest(payload);
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Pedido de férias criado com sucesso!',
        onConfirm: onBack,
        hideCancel: true
      });
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.btnBack}>← Voltar</button>
        <h3 style={styles.title}>{requestToEdit ? 'Editar Pedido de Férias/Licença' : 'Nova Solicitação de Férias/Licença'}</h3>
      </div>

      <div style={styles.content}>
        {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

        <div style={styles.twoCol}>
          {/* Coluna 1: Funcionário e Saldo */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Dados do Funcionário</h4>
            
            {!selectedEmp && (
              <div style={styles.formGroup}>
                <label style={styles.label}>Pesquisar NUIT ou Nome</label>
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  style={styles.input} 
                  placeholder="Ex: 123456 ou João..."
                />
                {filteredEmployees.length > 0 && (
                  <div style={styles.autocomplete}>
                    {filteredEmployees.map(e => (
                      <div key={e.id} style={styles.autocompleteItem} onClick={() => { setSelectedEmpId(e.id); setSearchTerm(''); }}>
                        <strong>{e.nip}</strong> - {e.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedEmp && (
              <div style={styles.empDetails}>
                <div style={styles.empHeaderRow}>
                  <h5 style={{margin: 0, fontSize: '16px', color: 'var(--color-primary)'}}>{selectedEmp.name}</h5>
                  {!requestToEdit && (
                    <button onClick={() => setSelectedEmpId('')} style={styles.btnLink}>Alterar</button>
                  )}
                </div>
                <div style={{fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px'}}>NUIT: {selectedEmp.nip}</div>
                <div style={{fontSize: '13px', color: 'var(--color-text-muted)'}}>Cargo: {selectedEmp.role || 'N/A'}</div>
                <div style={{fontSize: '13px', color: 'var(--color-text-muted)'}}>Admissão: {selectedEmp.admissionDate || 'Desconhecida'}</div>

                {balance && (
                  <div style={styles.balanceBox}>
                    <div style={styles.balanceItem}>
                      <span style={styles.balanceLabel}>Dias a que tem direito:</span>
                      <strong style={styles.balanceValue}>{balance.entitled}</strong>
                    </div>
                    <div style={styles.balanceItem}>
                      <span style={styles.balanceLabel}>Dias marcados/gozados:</span>
                      <strong style={styles.balanceValue}>{balance.used}</strong>
                    </div>
                    <div style={{...styles.balanceItem, borderTop: '1px solid var(--color-border)', paddingTop: '8px', marginTop: '4px'}}>
                      <span style={styles.balanceLabel}>Saldo Restante:</span>
                      <strong style={{...styles.balanceValue, color: balance.balance > 0 ? '#10B981' : '#EF4444', fontSize: '18px'}}>{balance.balance}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Coluna 2: Dados do Pedido */}
          <div style={styles.card}>
            <h4 style={styles.cardTitle}>Dados da Solicitação</h4>
            
            <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ano de Referência</label>
                <select value={year} onChange={e => setYear(e.target.value)} style={styles.input}>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tipo de Pedido</label>
                <select value={type} onChange={e => setType(e.target.value)} style={styles.input}>
                  <optgroup label="Férias">
                    <option value="Férias Anuais">Férias Anuais</option>
                    <option value="Férias Acumuladas">Férias Acumuladas</option>
                    <option value="Férias Remarcadas">Férias Remarcadas</option>
                    <option value="Férias Excecionais">Férias Excecionais (Fora do Saldo)</option>
                  </optgroup>
                  <optgroup label="Licenças">
                    <option value="Licença Sem Vencimento">Licença Sem Vencimento</option>
                    <option value="Licença Registada">Licença Registada</option>
                    <option value="Licença de Junta de Saúde">Licença de Junta de Saúde</option>
                  </optgroup>
                </select>
              </div>

              <div style={{display: 'flex', gap: '16px'}}>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.label}>Data de Início</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={styles.input} required />
                </div>
                <div style={{...styles.formGroup, flex: 1}}>
                  <label style={styles.label}>Data de Término</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={styles.input} required />
                </div>
              </div>

              {calculatedDays > 0 && (
                <div style={styles.infoBanner}>
                  Total de <strong>{calculatedDays}</strong> dias solicitados.
                </div>
              )}

              <div style={styles.formGroup}>
                <label style={styles.label}>Observações (Opcional)</label>
                <textarea 
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  style={{...styles.input, minHeight: '80px', resize: 'vertical'}} 
                  placeholder="Indique substituto, contactos durante as férias, etc."
                />
              </div>

              <button type="submit" style={styles.btnSubmit} disabled={!selectedEmp}>
                {requestToEdit ? 'Salvar Alterações' : 'Submeter Pedido'}
              </button>
            </form>
          </div>

        </div>
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) confirmModal.onConfirm();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
      />
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', gap: '16px' },
  header: { display: 'flex', alignItems: 'center', gap: '16px' },
  btnBack: { padding: '8px 16px', backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' },
  title: { fontSize: '20px', fontWeight: '700', color: 'var(--color-text-base)', margin: 0 },
  content: { display: 'flex', flexDirection: 'column', gap: '20px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '4px', border: '1px solid #F87171', fontWeight: '500', fontSize: '14px' },
  twoCol: { display: 'flex', gap: '24px', flexWrap: 'wrap' },
  card: { flex: 1, minWidth: '300px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '8px', padding: '24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' },
  cardTitle: { fontSize: '16px', fontWeight: '600', color: 'var(--color-text-base)', margin: '0 0 8px 0', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '10px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', backgroundColor: 'var(--color-bg-subtle)', color: 'var(--color-text-base)', fontSize: '14px' },
  autocomplete: { position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, maxHeight: '200px', overflowY: 'auto', marginTop: '4px' },
  autocompleteItem: { padding: '10px 12px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer', fontSize: '14px', color: 'var(--color-text-base)' },
  empDetails: { backgroundColor: 'var(--color-bg-subtle)', padding: '16px', borderRadius: '6px', border: '1px solid var(--color-border)' },
  empHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  btnLink: { background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' },
  balanceBox: { marginTop: '16px', padding: '12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' },
  balanceItem: { display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' },
  balanceLabel: { color: 'var(--color-text-muted)' },
  balanceValue: { color: 'var(--color-text-base)', fontWeight: '600' },
  infoBanner: { padding: '10px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#1E40AF', borderRadius: '4px', border: '1px solid rgba(59, 130, 246, 0.3)', fontSize: '14px' },
  btnSubmit: { padding: '12px 16px', backgroundColor: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', marginTop: '8px' }
};
