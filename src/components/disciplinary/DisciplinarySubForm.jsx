import React, { useState } from 'react';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { marginTop: '20px', padding: '15px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'var(--color-text-main)' },
  input: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  textarea: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '14px', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', minHeight: '80px', resize: 'vertical' },
  btnRow: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' },
  btnSave: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnCancel: { backgroundColor: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' },
  th: { padding: '10px', textAlign: 'left', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' },
  td: { padding: '10px', borderBottom: '1px solid var(--color-border)' },
  badge: { padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }
};

export default function DisciplinarySubForm({ employeeId, tempProcesses, setTempProcesses }) {
  const { getProcessesByEmployee, deleteProcess } = useDisciplinaryData();
  const [isAdding, setIsAdding] = useState(false);
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'alert', action: null });
  const showModal = (title, message, type = 'alert', action = null) => setModalConfig({ isOpen: true, title, message, type, action });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });
  
  const [formData, setFormData] = useState({
    processNumber: '',
    openDate: '',
    infractionDate: '',
    decisionDate: '',
    type: '',
    status: 'Aberto',
    authority: '',
    description: '',
    legalFoundation: '',
    observations: '',
    // Multa
    multaDays: '',
    multaPercentage: '',
    multaValue: '',
    // Arquivos simulados
    files: []
  });

  // Se já existir ID, carrega da base, senão usa os temporários
  const savedProcesses = employeeId ? getProcessesByEmployee(employeeId) : [];
  const allProcesses = [...savedProcesses, ...tempProcesses];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        type: f.type,
        size: f.size,
        date: new Date().toISOString()
      }));
      setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
    }
  };

  const handleAdd = () => {
    if (!formData.processNumber || !formData.type) {
      showModal('Erro', "Por favor, preencha o Número do Processo e o Tipo.");
      return;
    }
    setTempProcesses([...tempProcesses, { ...formData, id: 'temp_' + Date.now(), isTemp: true }]);
    setIsAdding(false);
    setFormData({ processNumber: '', openDate: '', infractionDate: '', decisionDate: '', type: '', status: 'Aberto', authority: '', description: '', legalFoundation: '', observations: '', multaDays: '', multaPercentage: '', multaValue: '', files: [] });
  };

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h4 style={{ margin: 0, color: 'var(--color-primary)' }}>Histórico Disciplinar</h4>
        {!isAdding && (
          <button type="button" onClick={() => setIsAdding(true)} style={styles.btnSave}>
            + Adicionar Processo
          </button>
        )}
      </div>

      {allProcesses.length === 0 && !isAdding ? (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Nenhum processo disciplinar registado.</p>
      ) : (
        !isAdding && (
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Tipo</th>
                <th>Data Infração</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {allProcesses.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.processNumber}</strong></td>
                  <td>{p.type}</td>
                  <td>{p.infractionDate}</td>
                  <td>
                    <span style={{...styles.badge, backgroundColor: p.status === 'Concluído' ? '#4CAF50' : '#FF9800', color: '#fff'}}>
                      {p.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button style={styles.btnCancel}>Ver</button>
                      <button style={{ ...styles.btnCancel, color: 'red', borderColor: 'red' }} onClick={() => {
                        showModal('Atenção', 'Pretende eliminar este registo?', 'confirm', () => {
                          if (p.isTemp) {
                            setTempProcesses(tempProcesses.filter(t => t.id !== p.id));
                          } else {
                            deleteProcess(p.id);
                          }
                        });
                      }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {isAdding && (
        <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.05)', padding: '15px', borderRadius: '6px', border: '1px dashed var(--color-border)' }}>
          <h5 style={{ margin: '0 0 15px 0', color: 'var(--color-text-main)' }}>Novo Processo Disciplinar</h5>
          
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº do Processo *</label>
              <input type="text" name="processNumber" value={formData.processNumber} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Sanção *</label>
              <select name="type" value={formData.type} onChange={handleChange} style={styles.input}>
                <option value="">-- Selecione --</option>
                <option value="Advertência">Advertência</option>
                <option value="Repreensão Pública">Repreensão Pública</option>
                <option value="Multa">Multa</option>
                <option value="Despromoção">Despromoção</option>
                <option value="Demissão">Demissão</option>
                <option value="Expulsão">Expulsão</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado do Processo</label>
              <select name="status" value={formData.status} onChange={handleChange} style={styles.input}>
                <option value="Aberto">Aberto</option>
                <option value="Em Instrução">Em Instrução</option>
                <option value="Concluído">Concluído</option>
                <option value="Arquivado">Arquivado</option>
                <option value="Suspenso">Suspenso</option>
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Autoridade Sancionadora</label>
              <input type="text" name="authority" value={formData.authority} onChange={handleChange} style={styles.input} placeholder="Ex: Diretor Provincial" />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data da Infração</label>
              <input type="date" name="infractionDate" value={formData.infractionDate} onChange={handleChange} style={styles.input} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Abertura</label>
              <input type="date" name="openDate" value={formData.openDate} onChange={handleChange} style={styles.input} />
            </div>
          </div>

          {formData.type === 'Multa' && (
            <div style={{ ...styles.grid, marginTop: '15px', backgroundColor: '#fff3e0', padding: '10px', borderRadius: '4px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Dias de Multa</label>
                <input type="number" name="multaDays" value={formData.multaDays} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Percentagem Desconto (%)</label>
                <input type="number" name="multaPercentage" value={formData.multaPercentage} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Valor (MT)</label>
                <input type="number" name="multaValue" value={formData.multaValue} onChange={handleChange} style={styles.input} />
              </div>
            </div>
          )}

          <div style={{ ...styles.formGroup, marginTop: '15px' }}>
            <label style={styles.label}>Descrição da Infração</label>
            <textarea name="description" value={formData.description} onChange={handleChange} style={styles.textarea}></textarea>
          </div>
          <div style={{ ...styles.formGroup, marginTop: '15px' }}>
            <label style={styles.label}>Fundamentação Legal</label>
            <input type="text" name="legalFoundation" value={formData.legalFoundation} onChange={handleChange} style={styles.input} placeholder="Ex: Artigo 123 do EGFAE" />
          </div>

          <div style={{ ...styles.formGroup, marginTop: '15px' }}>
            <label style={styles.label}>Anexar Documentos (PDF, DOCX, Imagens)</label>
            <input type="file" multiple onChange={handleFileChange} style={styles.input} />
            {formData.files.length > 0 && (
              <ul style={{ fontSize: '12px', marginTop: '5px' }}>
                {formData.files.map((f, i) => <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>)}
              </ul>
            )}
          </div>

          <div style={styles.btnRow}>
            <button type="button" onClick={() => setIsAdding(false)} style={styles.btnCancel}>Cancelar</button>
            <button type="button" onClick={handleAdd} style={styles.btnSave}>Confirmar Processo</button>
          </div>
        </div>
      )}
      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title}
        message={modalConfig.message}
        hideCancel={modalConfig.type === 'alert'}
        onConfirm={() => {
          if (modalConfig.action) modalConfig.action();
          closeModal();
        }}
        onCancel={closeModal}
      />
    </div>
  );
}
