import React, { useState, useMemo } from 'react';
import useDisciplinaryData from '../../hooks/useDisciplinaryData';
import DraggableModal from '../common/DraggableModal';
import ConfirmModal from '../ConfirmModal';
import * as XLSX from 'xlsx';
import { showToast } from '../common/Toast';

const initialFormState = {
  employeeId: '',
  processNumber: '',
  openDate: new Date().toISOString().split('T')[0],
  infractionDate: '',
  decisionDate: '',
  type: 'Advertência',
  status: 'Aberto',
  authority: '',
  description: '',
  legalFoundation: '',
  observations: '',
  multaDays: '',
  multaPercentage: '',
  multaValue: '',
  files: []
};

export default function DisciplinaryList({ orgData, employeesData }) {
  const { data } = orgData;
  const { getAllActiveProcesses, addProcess, updateProcess, deleteProcess } = useDisciplinaryData();
  const processes = getAllActiveProcesses();

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    type: ''
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [formData, setFormData] = useState(initialFormState);
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, processId: null, processNumber: '' });
  const [submitting, setSubmitting] = useState(false);
  const [empModalSearchQuery, setEmpModalSearchQuery] = useState('');

  const employeesList = useMemo(() => {
    if (!employeesData) return [];
    if (Array.isArray(employeesData)) return employeesData;
    if (Array.isArray(employeesData.employees)) return employeesData.employees;
    return [];
  }, [employeesData]);

  const getName = (list, id) => (list && Array.isArray(list) ? list.find(item => String(item.id) === String(id))?.name || '-' : '-');

  const filteredModalEmployees = useMemo(() => {
    if (!empModalSearchQuery.trim()) return employeesList;
    const q = empModalSearchQuery.toLowerCase();
    return employeesList.filter(emp => {
      const nameMatch = emp.name && emp.name.toLowerCase().includes(q);
      const nipMatch = emp.nip && String(emp.nip).toLowerCase().includes(q);
      const nuitMatch = emp.nuit && String(emp.nuit).toLowerCase().includes(q);
      const dirName = getName(data?.directorates, emp.directorateId);
      const dirMatch = dirName && dirName.toLowerCase().includes(q);
      return nameMatch || nipMatch || nuitMatch || dirMatch;
    });
  }, [employeesList, empModalSearchQuery, data]);

  const enrichedProcesses = useMemo(() => {
    return processes.map(p => {
      const emp = employeesList.find(e => String(e.id) === String(p.employeeId));
      return {
        ...p,
        employeeName: emp ? emp.name : 'Funcionário Desconhecido',
        employeeNip: emp ? (emp.nip || emp.nuit || '-') : '-',
        directorate: emp ? getName(data?.directorates, emp.directorateId) : '-'
      };
    }).filter(p => {
      const matchSearch = p.employeeName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                          String(p.processNumber || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                          String(p.employeeNip || '').toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchStatus = filters.status ? p.status === filters.status : true;
      const matchType = filters.type ? p.type === filters.type : true;
      return matchSearch && matchStatus && matchType;
    }).sort((a, b) => new Date(b.createdAt || b.openDate || 0) - new Date(a.createdAt || a.openDate || 0));
  }, [processes, employeesList, data, filters]);

  const [expandedRows, setExpandedRows] = useState({});
  const toggleRow = (empId) => setExpandedRows(prev => ({ ...prev, [empId]: !prev[empId] }));

  const groupedEmployees = useMemo(() => {
    const map = new Map();
    enrichedProcesses.forEach(p => {
      if (!map.has(p.employeeId)) {
        map.set(p.employeeId, {
          employeeId: p.employeeId,
          employeeName: p.employeeName,
          employeeNip: p.employeeNip,
          directorate: p.directorate,
          processes: []
        });
      }
      map.get(p.employeeId).processes.push(p);
    });
    return Array.from(map.values());
  }, [enrichedProcesses]);

  // Modal Handlers
  const handleOpenNew = (empId = '') => {
    setEditingProcess(null);
    setIsViewOnly(false);
    setEmpModalSearchQuery('');
    setFormData({ ...initialFormState, employeeId: empId });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (process) => {
    setEditingProcess(process);
    setIsViewOnly(false);
    setFormData({
      employeeId: process.employeeId || '',
      processNumber: process.processNumber || '',
      openDate: process.openDate || new Date().toISOString().split('T')[0],
      infractionDate: process.infractionDate || '',
      decisionDate: process.decisionDate || '',
      type: process.type || 'Advertência',
      status: process.status || 'Aberto',
      authority: process.authority || '',
      description: process.description || '',
      legalFoundation: process.legalFoundation || '',
      observations: process.observations || '',
      multaDays: process.multaDays || '',
      multaPercentage: process.multaPercentage || '',
      multaValue: process.multaValue || '',
      files: process.files || []
    });
    setIsModalOpen(true);
  };

  const handleOpenView = (process) => {
    setEditingProcess(process);
    setIsViewOnly(true);
    setFormData({
      employeeId: process.employeeId || '',
      processNumber: process.processNumber || '',
      openDate: process.openDate || '',
      infractionDate: process.infractionDate || '',
      decisionDate: process.decisionDate || '',
      type: process.type || '',
      status: process.status || '',
      authority: process.authority || '',
      description: process.description || '',
      legalFoundation: process.legalFoundation || '',
      observations: process.observations || '',
      multaDays: process.multaDays || '',
      multaPercentage: process.multaPercentage || '',
      multaValue: process.multaValue || '',
      files: process.files || []
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
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
      setFormData(prev => ({ ...prev, files: [...(prev.files || []), ...newFiles] }));
    }
  };

  const handleSaveProcess = async (e) => {
    e.preventDefault();
    if (!formData.employeeId) {
      showToast('Por favor, seleccione o funcionário a quem se aplica o processo.', 'warning');
      return;
    }
    if (!formData.processNumber.trim()) {
      showToast('Por favor, introduza o Número do Processo.', 'warning');
      return;
    }
    if (!formData.type) {
      showToast('Por favor, seleccione o Tipo de Sanção.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (editingProcess) {
        await updateProcess(editingProcess.id, formData);
      } else {
        await addProcess(formData);
      }
      setIsModalOpen(false);
      setFormData(initialFormState);
      setEditingProcess(null);
    } catch (err) {
      showToast('Erro ao guardar processo: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (confirmDelete.processId) {
      await deleteProcess(confirmDelete.processId);
      setConfirmDelete({ isOpen: false, processId: null, processNumber: '' });
    }
  };

  const exportExcel = () => {
    const exportData = enrichedProcesses.map(p => ({
      'Nº Processo': p.processNumber,
      'Funcionário': p.employeeName,
      'NIB / NUIT': p.employeeNip,
      'Direcção': p.directorate,
      'Tipo de Sanção': p.type,
      'Estado': p.status,
      'Data Infração': p.infractionDate || '-',
      'Data Abertura': p.openDate || '-',
      'Autoridade Sancionadora': p.authority || '-'
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Processos");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Processos_Disciplinares_${dateStr}.xlsx`);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s' }}>
      <div style={styles.toolbar}>
        <button onClick={() => handleOpenNew()} style={styles.btnAddProcess}>
          <span style={{ fontSize: '16px', fontWeight: 'bold' }}>+</span> Novo Processo Disciplinar
        </button>

        <input 
          type="text" 
          placeholder="Pesquisar funcionário, NIP ou nº processo..." 
          value={filters.searchTerm}
          onChange={(e) => setFilters(p => ({ ...p, searchTerm: e.target.value }))}
          style={styles.searchInput}
        />
        <select value={filters.type} onChange={(e) => setFilters(p => ({ ...p, type: e.target.value }))} style={styles.select}>
          <option value="">Todos os Tipos de Sanção</option>
          <option value="Advertência">Advertência</option>
          <option value="Repreensão Pública">Repreensão Pública</option>
          <option value="Multa">Multa</option>
          <option value="Despromoção">Despromoção</option>
          <option value="Demissão">Demissão</option>
          <option value="Expulsão">Expulsão</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilters(p => ({ ...p, status: e.target.value }))} style={styles.select}>
          <option value="">Todos os Estados</option>
          <option value="Aberto">Aberto</option>
          <option value="Em Instrução">Em Instrução</option>
          <option value="Concluído">Concluído</option>
          <option value="Arquivado">Arquivado</option>
          <option value="Suspenso">Suspenso</option>
        </select>
        
        <button onClick={exportExcel} style={styles.btnExport}>
          📊 Exportar Excel
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>Nº Processo</th>
              <th>Funcionário</th>
              <th>Direcção</th>
              <th>Tipo Sanção</th>
              <th>Data Infração</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {groupedEmployees.length === 0 ? (
              <tr><td colSpan="7" style={styles.empty}>Nenhum processo disciplinar encontrado.</td></tr>
            ) : (
              groupedEmployees.map(emp => (
                <React.Fragment key={emp.employeeId}>
                  <tr 
                    style={{ ...styles.tr, backgroundColor: 'rgba(0,0,0,0.02)', cursor: 'pointer' }}
                    onClick={() => toggleRow(emp.employeeId)}
                  >
                    <td colSpan="7" style={styles.td}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ color: 'var(--color-primary)' }}>{emp.employeeName}</strong>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginLeft: '6px' }}>
                            (NIP: {emp.employeeNip}) • {emp.directorate}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenNew(emp.employeeId); }}
                            style={styles.btnQuickAdd}
                            title="Adicionar Processo a este Funcionário"
                          >
                            + Adicionar Processo
                          </button>
                          <span style={{ fontSize: '12px', padding: '4px 10px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', borderRadius: '12px', fontWeight: 'bold' }}>
                            {emp.processes.length} Processo{emp.processes.length > 1 ? 's' : ''}
                          </span>
                          <span style={{ transform: expandedRows[emp.employeeId] ? 'rotate(180deg)' : 'none', transition: '0.2s', fontSize: '12px' }}>▼</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {expandedRows[emp.employeeId] && emp.processes.map(p => (
                    <tr key={p.id} style={{ ...styles.tr, backgroundColor: 'var(--color-bg-base)' }}>
                      <td style={{ ...styles.td, paddingLeft: '32px' }}>
                        <strong style={{ color: 'var(--color-primary)' }}>{p.processNumber}</strong>
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td><strong>{p.type}</strong></td>
                      <td>{p.infractionDate || '-'}</td>
                      <td>
                        <span style={{
                          padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                          backgroundColor: p.status === 'Concluído' ? 'rgba(16, 185, 129, 0.15)' : (p.status === 'Aberto' || p.status === 'Em Instrução' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                          color: p.status === 'Concluído' ? 'var(--color-success)' : (p.status === 'Aberto' || p.status === 'Em Instrução' ? 'var(--color-warning)' : 'var(--color-text-muted)')
                        }}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenView(p); }}
                            style={styles.btnActionView}
                            title="Ver Detalhes do Processo"
                          >
                            👁️ Ver
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(p); }}
                            style={styles.btnActionEdit}
                            title="Editar Processo"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ isOpen: true, processId: p.id, processNumber: p.processNumber }); }}
                            style={styles.btnActionDelete}
                            title="Eliminar Processo"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REGISTO / EDIÇÃO DE PROCESSO DISCIPLINAR */}
      <DraggableModal
        isOpen={isModalOpen}
        title={isViewOnly ? `Detalhes do Processo (${formData.processNumber})` : (editingProcess ? `Editar Processo (${formData.processNumber})` : '+ Novo Processo Disciplinar')}
        onClose={() => setIsModalOpen(false)}
        maxWidth="750px"
      >
        <form onSubmit={handleSaveProcess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SELEÇÃO E PESQUISA DO FUNCIONÁRIO NO MODAL */}
          <div style={{
            padding: '12px 14px',
            borderRadius: '8px',
            backgroundColor: 'rgba(27, 54, 93, 0.05)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ ...styles.label, color: 'var(--color-primary)', fontWeight: 'bold' }}>
                🔍 Pesquisar & Seleccionar Funcionário *
              </label>
              {formData.employeeId && (
                <span style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold' }}>
                  ✓ Funcionário Seleccionado
                </span>
              )}
            </div>

            {!isViewOnly && !editingProcess && (
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Digite o nome, NIP, NUIT ou Direcção para pesquisar..."
                  value={empModalSearchQuery}
                  onChange={(e) => setEmpModalSearchQuery(e.target.value)}
                  style={{
                    ...styles.input,
                    paddingLeft: '32px',
                    fontSize: '13px',
                    backgroundColor: 'var(--color-bg-base)',
                    borderColor: 'var(--color-primary)'
                  }}
                />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            )}

            <select
              name="employeeId"
              value={formData.employeeId}
              onChange={handleFormChange}
              disabled={isViewOnly || (editingProcess && formData.employeeId)}
              style={{ ...styles.input, fontWeight: 'bold', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', cursor: 'pointer' }}
              required
            >
              <option value="">
                -- Seleccione o Funcionário ({filteredModalEmployees.length} {filteredModalEmployees.length === 1 ? 'encontrado' : 'encontrados'}) --
              </option>
              {filteredModalEmployees.map(emp => (
                <option key={emp.id} value={emp.id}>
                  👤 {emp.name} {emp.nip ? `(NIP: ${emp.nip})` : (emp.nuit ? `(NUIT: ${emp.nuit})` : '')} - {getName(data?.directorates, emp.directorateId)}
                </option>
              ))}
            </select>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              💡 Pode digitar o nome no campo acima para localizar e selecionar o funcionário.
            </p>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº do Processo Disciplinar *</label>
              <input
                type="text"
                name="processNumber"
                value={formData.processNumber}
                onChange={handleFormChange}
                placeholder="Ex: PROC-2026/001"
                disabled={isViewOnly}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de Sanção *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
                required
              >
                <option value="Advertência">Advertência</option>
                <option value="Repreensão Pública">Repreensão Pública</option>
                <option value="Multa">Multa</option>
                <option value="Despromoção">Despromoção</option>
                <option value="Demissão">Demissão</option>
                <option value="Expulsão">Expulsão</option>
              </select>
            </div>
          </div>

          <div style={styles.grid3}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Estado do Processo</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              >
                <option value="Aberto">Aberto</option>
                <option value="Em Instrução">Em Instrução</option>
                <option value="Concluído">Concluído</option>
                <option value="Arquivado">Arquivado</option>
                <option value="Suspenso">Suspenso</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Autoridade Sancionadora</label>
              <input
                type="text"
                name="authority"
                value={formData.authority}
                onChange={handleFormChange}
                placeholder="Ex: Diretor Provincial"
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data da Infração</label>
              <input
                type="date"
                name="infractionDate"
                value={formData.infractionDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.grid2}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Abertura</label>
              <input
                type="date"
                name="openDate"
                value={formData.openDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Decisão / Conclusão</label>
              <input
                type="date"
                name="decisionDate"
                value={formData.decisionDate}
                onChange={handleFormChange}
                disabled={isViewOnly}
                style={styles.input}
              />
            </div>
          </div>

          {/* CAMPOS DE MULTA */}
          {formData.type === 'Multa' && (
            <div style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: '12px', borderRadius: '6px', border: '1px solid var(--color-warning)' }}>
              <h5 style={{ margin: '0 0 10px 0', color: 'var(--color-text-main)', fontSize: '13px', fontWeight: 'bold' }}>
                Detalhes da Sanção por Multa
              </h5>
              <div style={styles.grid3}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Dias de Multa</label>
                  <input
                    type="number"
                    name="multaDays"
                    value={formData.multaDays}
                    onChange={handleFormChange}
                    disabled={isViewOnly}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Desconto (%)</label>
                  <input
                    type="number"
                    name="multaPercentage"
                    value={formData.multaPercentage}
                    onChange={handleFormChange}
                    disabled={isViewOnly}
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Valor (MT)</label>
                  <input
                    type="number"
                    name="multaValue"
                    value={formData.multaValue}
                    onChange={handleFormChange}
                    disabled={isViewOnly}
                    style={styles.input}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>Descrição Detalhada da Infração</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              disabled={isViewOnly}
              placeholder="Descreva brevemente os factos ocorridos..."
              style={styles.textarea}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Fundamentação Legal / Artigo do Regulamento</label>
            <input
              type="text"
              name="legalFoundation"
              value={formData.legalFoundation}
              onChange={handleFormChange}
              disabled={isViewOnly}
              placeholder="Ex: Artigo 123º do EGFAE"
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Observações Adicionais</label>
            <textarea
              name="observations"
              value={formData.observations}
              onChange={handleFormChange}
              disabled={isViewOnly}
              placeholder="Notas complementares..."
              style={{ ...styles.textarea, minHeight: '50px' }}
            />
          </div>

          {!isViewOnly && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Anexar Documentos (PDF, DOCX, Imagens)</label>
              <input type="file" multiple onChange={handleFileChange} style={styles.input} />
              {formData.files && formData.files.length > 0 && (
                <ul style={{ fontSize: '12px', marginTop: '6px', color: 'var(--color-text-muted)' }}>
                  {formData.files.map((f, i) => (
                    <li key={i}>{f.name} ({(f.size / 1024).toFixed(1)} KB)</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              style={styles.btnCancelModal}
            >
              {isViewOnly ? 'Fechar' : 'Cancelar'}
            </button>
            {!isViewOnly && (
              <button
                type="submit"
                disabled={submitting}
                style={styles.btnSaveModal}
              >
                {submitting ? 'A guardar...' : (editingProcess ? 'Atualizar Processo' : 'Confirmar Processo')}
              </button>
            )}
          </div>
        </form>
      </DraggableModal>

      {/* CONFIRMAÇÃO DE ELIMINAÇÃO */}
      <ConfirmModal
        isOpen={confirmDelete.isOpen}
        title="Eliminar Processo Disciplinar"
        message={`Tem a certeza que deseja eliminar o processo ${confirmDelete.processNumber || ''}? Esta ação não pode ser desfeita.`}
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmDelete({ isOpen: false, processId: null, processNumber: '' })}
      />
    </div>
  );
}

const styles = {
  toolbar: { display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' },
  btnAddProcess: { padding: '10px 18px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' },
  btnQuickAdd: { padding: '4px 10px', backgroundColor: 'transparent', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' },
  searchInput: { flex: 1, minWidth: '220px', padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px' },
  select: { padding: '9px 14px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px' },
  btnExport: { padding: '9px 16px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  tableContainer: { overflowX: 'auto', backgroundColor: 'var(--color-bg-card)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-main)' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  empty: { textAlign: 'center', padding: '30px', color: 'var(--color-text-muted)', fontStyle: 'italic' },
  btnActionView: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '11px' },
  btnActionEdit: { padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-primary)', backgroundColor: 'transparent', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' },
  btnActionDelete: { padding: '4px 8px', borderRadius: '4px', border: '1px solid #ef4444', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '11px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' },
  grid3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-main)' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px', outline: 'none' },
  textarea: { padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-main)', fontSize: '13px', minHeight: '70px', resize: 'vertical', outline: 'none' },
  btnCancelModal: { padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'transparent', color: 'var(--color-text-main)', cursor: 'pointer', fontSize: '13px' },
  btnSaveModal: { padding: '8px 18px', borderRadius: '6px', border: 'none', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }
};
