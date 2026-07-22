import React, { useState } from 'react';

export default function RegistoSaudeModal({ isOpen, onClose, employees, onSave }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [tipoDoenca, setTipoDoenca] = useState('Temporária');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [motivo, setMotivo] = useState('');
  const [documento, setDocumento] = useState(null);
  const [erro, setErro] = useState('');

  if (!isOpen) return null;

  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchTerm('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmployee) {
      setErro('Por favor, selecione um funcionário.');
      return;
    }
    if (!dataInicio) {
      setErro('A data de início é obrigatória.');
      return;
    }
    if (tipoDoenca === 'Permanente' && !documento) {
      setErro('Para casos de Doença Permanente/Incapacidade é OBRIGATÓRIO anexar o Relatório da Junta Médica.');
      return;
    }

    onSave({
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      employeeNip: selectedEmployee.nip,
      tipoCondicao: tipoDoenca,
      dataInicio,
      dataFim,
      motivo,
      documento: documento ? documento.name : null,
      status: 'Em Baixa'
    });
  };

      const searchResults = searchTerm.length > 2 
    ? employees.filter(e => 
        e.isActive && 
        e.healthStatus !== 'Baixa Médica' &&
        ((e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
         (e.nip || '').toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h2 style={styles.title}>Registar Baixa ou Junta Médica</h2>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        <div style={styles.content}>
          {erro && <div style={styles.errorAlert}>{erro}</div>}

          {!selectedEmployee ? (
            <div style={styles.section}>
              <label style={styles.label}>1. Selecionar Funcionário</label>
              <input 
                type="text" 
                placeholder="Pesquisar por Nome ou NUIT..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.input}
              />
              {searchResults.length > 0 && (
                <div style={styles.searchResults}>
                  {searchResults.map(emp => (
                    <div key={emp.id} style={styles.searchItem} onClick={() => handleSelectEmployee(emp)}>
                      <strong>{emp.name}</strong> (NUIT: {emp.nip})
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={styles.section}>
              <div style={styles.selectedEmp}>
                <span>Funcionário Selecionado: <strong>{selectedEmployee.name}</strong></span>
                <button onClick={() => setSelectedEmployee(null)} style={styles.changeBtn}>Alterar</button>
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.label}>2. Tipo de Condição</label>
            <div style={styles.radioGroup}>
              <label style={tipoDoenca === 'Temporária' ? styles.radioSelected : styles.radio}>
                <input 
                  type="radio" 
                  checked={tipoDoenca === 'Temporária'} 
                  onChange={() => setTipoDoenca('Temporária')} 
                  style={{display: 'none'}}
                />
                Baixa Médica (Temporária)
              </label>
              <label style={tipoDoenca === 'Permanente' ? styles.radioSelectedDanger : styles.radio}>
                <input 
                  type="radio" 
                  checked={tipoDoenca === 'Permanente'} 
                  onChange={() => setTipoDoenca('Permanente')} 
                  style={{display: 'none'}}
                />
                Incapacidade (Junta Médica)
              </label>
            </div>
            {tipoDoenca === 'Permanente' && (
              <div style={styles.alertDanger}>
                <strong>Atenção:</strong> Ao declarar Incapacidade Permanente, o funcionário será retirado da escala de serviço ativo e será obrigatória a anexação do Parecer da Junta Médica.
              </div>
            )}
          </div>

          <div style={styles.row}>
            <div style={styles.col}>
              <label style={styles.label}>Data de Início</label>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} style={styles.input} />
            </div>
            <div style={styles.col}>
              <label style={styles.label}>Data Prevista Fim {tipoDoenca === 'Permanente' && '(Opcional)'}</label>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} style={styles.input} />
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Motivo / Diagnóstico (Opcional)</label>
            <textarea 
              value={motivo} 
              onChange={e => setMotivo(e.target.value)} 
              style={styles.textarea}
              placeholder="Descreva brevemente o motivo da baixa..."
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Documento Comprovativo {tipoDoenca === 'Permanente' && <span style={{color:'red'}}>* (Obrigatório)</span>}</label>
            <div style={styles.fileUpload}>
              <input type="file" onChange={e => setDocumento(e.target.files[0])} />
            </div>
          </div>

        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleSubmit} style={styles.btnSubmit}>Registar Condição</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.2s ease-out' },
  modal: { backgroundColor: 'var(--color-bg-card)', borderRadius: '12px', width: '100%', maxWidth: '650px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  header: { padding: '24px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  title: { margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--color-text-main)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', color: 'var(--color-text-muted)', cursor: 'pointer' },
  content: { padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'flex', gap: '20px' },
  col: { flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '15px' },
  textarea: { padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '15px', minHeight: '80px', resize: 'vertical' },
  searchResults: { maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', marginTop: '4px' },
  searchItem: { padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', ':hover': { backgroundColor: 'var(--color-bg-base)' } },
  selectedEmp: { padding: '16px', backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1e40af' },
  changeBtn: { padding: '6px 12px', borderRadius: '6px', backgroundColor: '#fff', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3B82F6', cursor: 'pointer', fontWeight: '600' },
  radioGroup: { display: 'flex', gap: '12px' },
  radio: { flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--color-border)', cursor: 'pointer', fontWeight: '600', color: 'var(--color-text-muted)', transition: 'all 0.2s' },
  radioSelected: { flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', border: '2px solid #F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.1)', cursor: 'pointer', fontWeight: '700', color: '#D97706', transition: 'all 0.2s' },
  radioSelectedDanger: { flex: 1, padding: '12px', textAlign: 'center', borderRadius: '8px', border: '2px solid #EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', cursor: 'pointer', fontWeight: '700', color: '#B91C1C', transition: 'all 0.2s' },
  alertDanger: { padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #EF4444', color: '#991B1B', borderRadius: '4px', fontSize: '13px', marginTop: '8px' },
  errorAlert: { padding: '12px 16px', backgroundColor: '#FEF2F2', border: '1px solid #F87171', color: '#991B1B', borderRadius: '8px', fontSize: '14px', fontWeight: '500' },
  fileUpload: { padding: '16px', border: '2px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  footer: { padding: '20px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', backgroundColor: 'var(--color-bg-base)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' },
  btnCancel: { padding: '12px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-text-base)', fontWeight: '600', cursor: 'pointer' },
  btnSubmit: { padding: '12px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#F59E0B', color: '#fff', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px rgba(245, 158, 11, 0.2)' }
};
