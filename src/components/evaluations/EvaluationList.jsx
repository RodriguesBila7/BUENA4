import React, { useState, useMemo } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useOrgData from '../../hooks/useOrgData';
import useEmployeeData from '../../hooks/useEmployeeData';
import { getClassification, EVALUATION_STATES } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import DraggableModal from '../common/DraggableModal';
import ConfirmModal from '../ConfirmModal';

export default function EvaluationList({ user }) {
  const { evaluations = [], loading, error, updateEvaluation, removeEvaluation } = useEvaluationData();
  const { data: orgData } = useOrgData();
  const { employees = [] } = useEmployeeData();

  // Permissões
  const perms = user?.permissions || user?.roleDetails?.permissions || {};
  const isSuperAdmin = ['super_admin', 'super_admin_1', 'admin_1', 'admin_2'].includes(user?.roleId || user?.role) || user?.username === 'admin' || perms.all === true;
  const evalPerms = perms['Gestão de Desempenho Individual'] || perms['Gestao de Desempenho Individual'] || perms['Avaliação de Desempenho'] || perms['Avaliacao de Desempenho'] || (isSuperAdmin ? ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'] : ['Visualizar']);
  const canEdit = isSuperAdmin || evalPerms.includes('Editar') || evalPerms.includes('Administrar');
  const canDelete = isSuperAdmin || evalPerms.includes('Eliminar') || evalPerms.includes('Administrar');

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const [filterCareer, setFilterCareer] = useState('');

  const availableDepartments = useMemo(() => {
    if (!filterDirectorate) return [];
    return (orgData?.departments || []).filter(d => String(d.directorateId) === String(filterDirectorate));
  }, [orgData?.departments, filterDirectorate]);

  const availableDivisions = useMemo(() => {
    if (!filterDirectorate) return [];
    if (filterDepartment) {
      return (orgData?.divisions || []).filter(div => String(div.departmentId) === String(filterDepartment));
    }
    const depIds = new Set(availableDepartments.map(d => String(d.id)));
    return (orgData?.divisions || []).filter(div => 
      String(div.directorateId) === String(filterDirectorate) || (div.departmentId && depIds.has(String(div.departmentId)))
    );
  }, [orgData?.divisions, filterDirectorate, filterDepartment, availableDepartments]);

  // Modais
  const [viewingEval, setViewingEval] = useState(null);
  const [editingEval, setEditingEval] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    hideCancel: false,
    isDestructive: false
  });

  // Lista dinâmica de anos para o filtro
  const availableYears = useMemo(() => {
    const yearsSet = new Set(['2026', '2025', '2024', '2023']);
    (evaluations || []).forEach(e => {
      if (e?.year) yearsSet.add(String(e.year));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [evaluations]);

  // Lista filtrada de avaliações
  const filtered = useMemo(() => {
    const rawList = Array.isArray(evaluations) ? evaluations : [];
    const scopedList = user ? filterByProvincialScope(rawList, user, orgData) : rawList;

    return scopedList.filter(e => {
      if (!e) return false;
      
      // Filtro por Ano
      if (filterYear && String(e.year) !== String(filterYear)) return false;

      // Filtro por Classificação
      if (filterClass) {
        const cls = getClassification(e.score);
        if (cls.label !== filterClass) return false;
      }

      // Filtro por Estado
      if (filterStatus && String(e.status || '').toLowerCase() !== filterStatus.toLowerCase()) return false;

      const emp = (employees || []).find(empItem => String(empItem.id) === String(e.employeeId));

      // Filtro por Direcção
      if (filterDirectorate) {
        const dirId = e.directorateId || emp?.directorateId;
        if (String(dirId) !== String(filterDirectorate)) return false;
      }

      // Filtro por Departamento
      if (filterDepartment) {
        if (!emp || String(emp.departmentId) !== String(filterDepartment)) return false;
      }

      // Filtro por Repartição / Repartição Central
      if (filterDivision) {
        if (!emp || String(emp.divisionId) !== String(filterDivision)) return false;
      }

      // Filtro por Carreira (cruzando com cadastro de funcionário se necessário)
      if (filterCareer) {
        if (!emp || String(emp.careerId) !== String(filterCareer)) return false;
      }

      // Filtro textual por Nome ou NUIT/NIP
      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        const name = String(e.employeeName || '').toLowerCase();
        const nip = String(e.employeeNip || '').toLowerCase();
        if (!name.includes(lower) && !nip.includes(lower)) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = a?.createdAt || a?.evaluationDate || '';
      const dateB = b?.createdAt || b?.evaluationDate || '';
      return dateB.localeCompare(dateA);
    });
  }, [evaluations, user, orgData, employees, searchTerm, filterYear, filterClass, filterStatus, filterDirectorate, filterDepartment, filterDivision, filterCareer]);

  // Limpar todos os filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterYear('');
    setFilterClass('');
    setFilterStatus('');
    setFilterDirectorate('');
    setFilterDepartment('');
    setFilterDivision('');
    setFilterCareer('');
  };

  const hasActiveFilters = Boolean(
    searchTerm || filterYear || filterClass || filterStatus || filterDirectorate || filterDepartment || filterDivision || filterCareer
  );

  // Abertura do Modal de Edição
  const handleOpenEdit = (ev) => {
    setEditingEval(ev);
    setEditFormData({
      year: ev.year || new Date().getFullYear().toString(),
      period: ev.period || 'Anual',
      score: ev.score ?? '',
      evaluationDate: ev.evaluationDate || new Date().toISOString().split('T')[0],
      evaluatorName: ev.evaluatorName || '',
      evaluatorRole: ev.evaluatorRole || '',
      dispatchNumber: ev.dispatchNumber || '',
      status: ev.status || EVALUATION_STATES.EVALUATED,
      observations: ev.observations || '',
      pdfBase64: ev.pdfBase64 || ''
    });
  };

  // Alteração nos inputs do formulário de edição
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  // Alteração de anexo PDF no modal de edição
  const handleEditFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setConfirmModal({
        isOpen: true,
        title: 'Formato Inválido',
        message: 'O documento anexado deve ser estritamente em formato PDF.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    if (file.size > 1024 * 500) {
      setConfirmModal({
        isOpen: true,
        title: 'Ficheiro Excede o Limite',
        message: 'O ficheiro PDF não pode ultrapassar 500KB. Por favor comprima o documento antes de anexar.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditFormData(prev => ({ ...prev, pdfBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // Gravar alterações da avaliação
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingEval || !editFormData) return;

    if (editFormData.score === '' || isNaN(parseFloat(editFormData.score)) || parseFloat(editFormData.score) < 0 || parseFloat(editFormData.score) > 20) {
      setConfirmModal({
        isOpen: true,
        title: 'Pontuação Inválida',
        message: 'A pontuação da avaliação deve ser um número compreendido entre 0 e 20.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    try {
      const cls = getClassification(editFormData.score);
      await updateEvaluation(editingEval.id, {
        ...editFormData,
        classificationLabel: cls.label
      });
      setEditingEval(null);
      setEditFormData(null);
      setConfirmModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Avaliação de desempenho atualizada com sucesso.',
        hideCancel: true,
        confirmText: 'OK'
      });
    } catch (err) {
      setConfirmModal({
        isOpen: true,
        title: 'Erro ao Gravar',
        message: err.message || 'Ocorreu um erro ao atualizar os dados da avaliação.',
        hideCancel: true,
        confirmText: 'OK'
      });
    }
  };

  // Confirmação de exclusão
  const handleDelete = (ev) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Avaliação',
      message: `Tem a certeza que deseja eliminar permanentemente a avaliação do funcionário ${ev.employeeName || 'selecionado'} referente ao ano de ${ev.year}? Esta operação é irreversível.`,
      isDestructive: true,
      hideCancel: false,
      confirmText: 'Sim, Eliminar',
      cancelText: 'Cancelar',
      onConfirm: async () => {
        try {
          await removeEvaluation(ev.id);
          setConfirmModal({
            isOpen: true,
            title: 'Registo Eliminado',
            message: 'A avaliação foi removida com sucesso.',
            hideCancel: true,
            confirmText: 'OK'
          });
        } catch (err) {
          setConfirmModal({
            isOpen: true,
            title: 'Erro ao Eliminar',
            message: err.message || 'Não foi possível eliminar a avaliação.',
            hideCancel: true,
            confirmText: 'OK'
          });
        }
      }
    });
  };

  // Impressão da Ficha Oficial da Avaliação Individual
  const handlePrintOfficialSheet = (ev) => {
    const emp = (employees || []).find(e => String(e.id) === String(ev.employeeId)) || {};
    const cls = getClassification(ev?.score);
    const dirName = (orgData?.directorates || []).find(d => String(d.id) === String(ev?.directorateId || emp?.directorateId))?.name || 'Direcção Geral';
    const careerName = (orgData?.careers || []).find(c => String(c.id) === String(emp?.careerId))?.name || '-';
    const categoryName = (orgData?.categories || []).find(c => String(c.id) === String(emp?.categoryId))?.name || '-';
    const evalDate = ev.evaluationDate ? ev.evaluationDate.split('-').reverse().join('/') : '-';

    const printWin = window.open('', '', 'width=900,height=800');
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Ficha de Avaliação Individual - ${ev.employeeName || 'SERNIC'}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 25px;
              color: #111;
              font-size: 13px;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
            }
            .header h2 { margin: 0; font-size: 15px; text-transform: uppercase; font-weight: 800; color: #1B365D; }
            .header h3 { margin: 3px 0; font-size: 13px; text-transform: uppercase; color: #1B365D; }
            .header h4 { margin: 3px 0; font-size: 12px; text-transform: uppercase; color: #1B365D; }
            .header .dir { font-weight: bold; font-size: 12px; color: #1B365D; text-transform: uppercase; margin-top: 4px; }
            .header .title {
              margin-top: 15px;
              padding: 8px;
              background-color: #f1f5f9;
              border: 1px solid #cbd5e1;
              font-size: 14px;
              font-weight: 800;
              text-transform: uppercase;
              color: #1B365D;
            }
            .section {
              margin-bottom: 20px;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
              overflow: hidden;
            }
            .section-title {
              background-color: #1B365D;
              color: #fff;
              padding: 6px 12px;
              font-weight: bold;
              font-size: 12px;
              text-transform: uppercase;
            }
            .section-body {
              padding: 12px;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .item {
              font-size: 12.5px;
            }
            .item strong {
              color: #334155;
            }
            .score-box {
              display: flex;
              align-items: center;
              justify-content: space-around;
              padding: 15px;
              background-color: #f8fafc;
              border: 1px dashed #cbd5e1;
              border-radius: 6px;
              margin-top: 10px;
            }
            .score-val {
              font-size: 28px;
              font-weight: 900;
              color: #1B365D;
            }
            .score-class {
              font-size: 16px;
              font-weight: 800;
              padding: 6px 16px;
              border-radius: 20px;
              background-color: ${cls.hexLight};
              color: ${cls.hexDark};
              border: 1px solid ${cls.hexBadge};
            }
            .signatures {
              margin-top: 40px;
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 20px;
              text-align: center;
              font-size: 11.5px;
            }
            .sig-line {
              margin-top: 45px;
              border-top: 1px solid #333;
              padding-top: 5px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="header">
            <h2>REPÚBLICA DE MOÇAMBIQUE</h2>
            <h3>MINISTÉRIO DO INTERIOR</h3>
            <h4>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL</h4>
            <div class="dir">DIRECÇÃO GERAL</div>
            <div class="dir">DIRECÇÃO DE RECURSOS HUMANOS</div>
            <div class="title">FICHA OFICIAL DE AVALIAÇÃO DE DESEMPENHO INDIVIDUAL</div>
          </div>

          <div class="section">
            <div class="section-title">1. IDENTIFICAÇÃO DO FUNCIONÁRIO AVALIADO</div>
            <div class="section-body grid">
              <div class="item"><strong>Nome Completo:</strong> ${ev.employeeName || '-'}</div>
              <div class="item"><strong>NUIT / NIP:</strong> ${ev.employeeNip || '-'}</div>
              <div class="item"><strong>Carreira:</strong> ${careerName}</div>
              <div class="item"><strong>Categoria:</strong> ${categoryName}</div>
              <div class="item"><strong>Função / Cargo:</strong> ${emp.role || 'Nenhum'}</div>
              <div class="item"><strong>Direcção / Unidade Orgânica:</strong> ${dirName}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">2. RESULTADO DA AVALIAÇÃO DO DESEMPENHO</div>
            <div class="section-body">
              <div class="grid">
                <div class="item"><strong>Ano Avaliado:</strong> ${ev.year || '-'}</div>
                <div class="item"><strong>Período:</strong> ${ev.period || 'Anual'}</div>
                <div class="item"><strong>Data da Avaliação:</strong> ${evalDate}</div>
                <div class="item"><strong>Nº do Despacho:</strong> ${ev.dispatchNumber || 'N/A'}</div>
                <div class="item"><strong>Avaliador:</strong> ${ev.evaluatorName || '-'}</div>
                <div class="item"><strong>Cargo do Avaliador:</strong> ${ev.evaluatorRole || '-'}</div>
                <div class="item"><strong>Estado do Processo:</strong> ${ev.status || 'Avaliado'}</div>
              </div>

              <div class="score-box">
                <div style="text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Pontuação Final (0 a 20)</div>
                  <div class="score-val">${ev.score ?? '-'} <span style="font-size: 14px; font-weight: normal; color: #64748b;">valores</span></div>
                </div>
                <div style="text-align: center;">
                  <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Classificação Qualitativa</div>
                  <div class="score-class">${cls.label}</div>
                </div>
              </div>

              ${ev.observations ? `
                <div style="margin-top: 15px; font-size: 12px; background-color: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">
                  <strong>Observações e Recomendações:</strong><br />
                  ${ev.observations}
                </div>
              ` : ''}
            </div>
          </div>

          <div class="signatures">
            <div>
              <strong>O Avaliado</strong>
              <div class="sig-line">${ev.employeeName || 'Funcionário'}<br />Data: ___/___/2026</div>
            </div>
            <div>
              <strong>O Avaliador</strong>
              <div class="sig-line">${ev.evaluatorName || 'Avaliador Responsável'}<br />Data: ___/___/2026</div>
            </div>
            <div>
              <strong>O Homologador (Director)</strong>
              <div class="sig-line">Direcção Geral / DRH<br />Data: ___/___/2026</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div className="sernic-spinner"></div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>A carregar avaliações...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {error && (
        <div style={styles.errorBanner}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* PAINEL PROFISSIONAL DE FILTROS */}
      <div style={styles.filterCard}>
        <div style={styles.filterCardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🔍</span>
            <h4 style={styles.filterCardTitle}>Filtros e Pesquisa de Avaliações</h4>
          </div>
          {hasActiveFilters && (
            <button 
              type="button" 
              onClick={handleClearFilters}
              style={styles.btnClearFilters}
              title="Limpar todos os filtros ativos"
            >
              ✕ Limpar Filtros
            </button>
          )}
        </div>

        <div style={styles.filterGrid}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Pesquisa por NUIT ou Nome</label>
            <input 
              type="text" 
              placeholder="Digite o NUIT ou Nome..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              style={styles.input}
            />
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Ano de Avaliação</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.select}>
              <option value="">Todos os Anos</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Classificação Qualitativa</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={styles.select}>
              <option value="">Todas as Classificações</option>
              <option value="Excelente">Excelente (19 - 20)</option>
              <option value="Muito Bom">Muito Bom (17 - 18.9)</option>
              <option value="Bom">Bom (14 - 16.9)</option>
              <option value="Suficiente">Suficiente (10 - 13.9)</option>
              <option value="Medíocre">Medíocre (&lt; 10)</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Estado do Processo</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={styles.select}>
              <option value="">Todos os Estados</option>
              <option value="Avaliado">Avaliado</option>
              <option value="Homologado">Homologado</option>
              <option value="Em Avaliação">Em Avaliação</option>
              <option value="Não Avaliado">Não Avaliado</option>
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Direcção / Unidade Orgânica</label>
            <select 
              value={filterDirectorate} 
              onChange={(e) => {
                setFilterDirectorate(e.target.value);
                setFilterDepartment('');
                setFilterDivision('');
              }} 
              style={styles.select}
            >
              <option value="">Todas as Direcções</option>
              {(orgData?.directorates || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Departamento</label>
            <select 
              value={filterDepartment} 
              onChange={(e) => {
                setFilterDepartment(e.target.value);
                setFilterDivision('');
              }} 
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todos os Departamentos' : 'Selecione a Direcção primeiro'}</option>
              {availableDepartments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
          </div>

          <div style={{ ...styles.filterGroup, minWidth: '260px' }}>
            <label style={{ ...styles.label, whiteSpace: 'nowrap' }}>Repartição / Repartição Central</label>
            <select 
              value={filterDivision} 
              onChange={(e) => setFilterDivision(e.target.value)} 
              style={styles.select}
              disabled={!filterDirectorate}
            >
              <option value="">{filterDirectorate ? 'Todas as Repartições' : 'Selecione a Direcção primeiro'}</option>
              {availableDivisions.map(div => (
                <option key={div.id} value={div.id}>
                  {div.name}{!div.departmentId ? ' (Repartição Central)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.filterGroup}>
            <label style={styles.label}>Carreira Profissional</label>
            <select value={filterCareer} onChange={(e) => setFilterCareer(e.target.value)} style={styles.select}>
              <option value="">Todas as Carreiras</option>
              {(orgData?.careers || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={styles.filterFooter}>
          <span style={styles.resultsBadge}>
            📊 <strong>{filtered.length}</strong> {filtered.length === 1 ? 'avaliação encontrada' : 'avaliações encontradas'}
          </span>
        </div>
      </div>

      {/* TABELA DE AVALIAÇÕES COM COLUNA DE AÇÕES */}
      <div style={styles.tableContainer}>
        <table className="premium-table">
          <thead>
            <tr>
              <th>NUIT</th>
              <th>Nome do Funcionário</th>
              <th>Ano</th>
              <th>Pontuação</th>
              <th>Classificação</th>
              <th>Data Avaliação</th>
              <th>Avaliador</th>
              <th>Estado</th>
              <th>Documento</th>
              <th style={{ textAlign: 'center', width: '130px' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ev => {
              const cls = getClassification(ev?.score);
              return (
                <tr key={ev?.id || Math.random()} style={styles.tr}>
                  <td><strong>{ev?.employeeNip || '-'}</strong></td>
                  <td>{ev?.employeeName || '-'}</td>
                  <td>{ev?.year || '-'}</td>
                  <td><strong>{ev?.score ?? '-'}</strong></td>
                  <td>
                    <span style={{
                      padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700',
                      backgroundColor: cls.hexLight, color: cls.hexDark, border: `1px solid ${cls.hexBadge}`
                    }}>
                      {cls.label}
                    </span>
                  </td>
                  <td>{ev?.evaluationDate ? ev.evaluationDate.split('-').reverse().join('/') : '-'}</td>
                  <td>{ev?.evaluatorName || '-'}</td>
                  <td>
                    <span style={{
                      padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                      backgroundColor: ev?.status === 'Homologado' ? '#dcfce7' : '#f1f5f9',
                      color: ev?.status === 'Homologado' ? '#15803d' : '#475569',
                      border: `1px solid ${ev?.status === 'Homologado' ? '#86efac' : '#cbd5e1'}`
                    }}>
                      {ev?.status || 'Avaliado'}
                    </span>
                  </td>
                  <td>
                    {ev?.pdfBase64 ? (
                      <button 
                        style={styles.btnPdf} 
                        type="button"
                        title="Visualizar documento anexo"
                        onClick={() => {
                          try {
                            const pdfWindow = window.open("");
                            if (pdfWindow) {
                              pdfWindow.document.write(`<iframe width='100%' height='100%' style='border:none' src='${ev.pdfBase64}'></iframe>`);
                            }
                          } catch {
                            // ignore popup block
                          }
                        }}
                      >
                        Ver PDF
                      </button>
                    ) : (
                      <span style={{color: 'var(--color-text-muted)', fontSize: '11px'}}>Sem Anexo</span>
                    )}
                  </td>
                  <td>
                    <div style={styles.actionButtons}>
                      <button
                        type="button"
                        style={styles.actionBtnView}
                        onClick={() => setViewingEval(ev)}
                        title="Visualizar Ficha da Avaliação"
                      >
                        👁️
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          style={styles.actionBtnEdit}
                          onClick={() => handleOpenEdit(ev)}
                          title="Editar Avaliação"
                        >
                          ✏️
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          style={styles.actionBtnDelete}
                          onClick={() => handleDelete(ev)}
                          title="Eliminar Avaliação"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="10" style={styles.empty}>
                  Nenhuma avaliação encontrada com os critérios selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: VISUALIZAR AVALIAÇÃO */}
      {viewingEval && (() => {
        const emp = (employees || []).find(e => String(e.id) === String(viewingEval.employeeId)) || {};
        const cls = getClassification(viewingEval.score);
        const dirName = (orgData?.directorates || []).find(d => String(d.id) === String(viewingEval.directorateId || emp.directorateId))?.name || '-';
        const careerName = (orgData?.careers || []).find(c => String(c.id) === String(emp.careerId))?.name || '-';
        const categoryName = (orgData?.categories || []).find(c => String(c.id) === String(emp.categoryId))?.name || '-';

        return (
          <DraggableModal
            isOpen={Boolean(viewingEval)}
            onClose={() => setViewingEval(null)}
            title="Ficha Detalhada de Avaliação de Desempenho"
            maxWidth="720px"
            icon="📋"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Cabeçalho com dados do funcionário */}
              <div style={styles.viewProfileBox}>
                <div style={styles.viewAvatar}>
                  {emp.photo ? (
                    <img src={emp.photo} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    (viewingEval.employeeName || 'F').charAt(0)
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', color: 'var(--color-primary)' }}>
                    {viewingEval.employeeName || 'Sem Nome'}
                  </h3>
                  <div style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
                    NUIT / NIP: <strong>{viewingEval.employeeNip || '-'}</strong> • Carreira: <strong>{careerName}</strong> ({categoryName})
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    Direcção: <strong>{dirName}</strong> • Função: <strong>{emp.role || 'Investigador / Agente'}</strong>
                  </div>
                </div>
              </div>

              {/* Box de Pontuação e Classificação */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                padding: '16px',
                backgroundColor: 'var(--color-bg-base)',
                borderRadius: '10px',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                    Pontuação Obtida
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--color-primary)', marginTop: '2px' }}>
                    {viewingEval.score ?? '-'} <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--color-text-muted)' }}>/ 20</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                    Classificação Final
                  </div>
                  <div style={{
                    marginTop: '4px',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '800',
                    backgroundColor: cls.hexLight,
                    color: cls.hexDark,
                    border: `1px solid ${cls.hexBadge}`
                  }}>
                    {cls.label}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 'bold' }}>
                    Estado do Processo
                  </div>
                  <div style={{
                    marginTop: '4px',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: viewingEval.status === 'Homologado' ? '#dcfce7' : '#f1f5f9',
                    color: viewingEval.status === 'Homologado' ? '#15803d' : '#334155'
                  }}>
                    {viewingEval.status || 'Avaliado'}
                  </div>
                </div>
              </div>

              {/* Informações detalhadas da avaliação */}
              <div style={styles.viewGrid}>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Ano de Referência:</span>
                  <strong>{viewingEval.year || '-'}</strong>
                </div>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Período:</span>
                  <strong>{viewingEval.period || 'Anual'}</strong>
                </div>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Data da Avaliação:</span>
                  <strong>{viewingEval.evaluationDate ? viewingEval.evaluationDate.split('-').reverse().join('/') : '-'}</strong>
                </div>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Nº do Despacho:</span>
                  <strong>{viewingEval.dispatchNumber || 'Não atribuído'}</strong>
                </div>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Avaliador:</span>
                  <strong>{viewingEval.evaluatorName || '-'}</strong>
                </div>
                <div style={styles.viewItem}>
                  <span style={styles.viewItemLabel}>Cargo do Avaliador:</span>
                  <strong>{viewingEval.evaluatorRole || '-'}</strong>
                </div>
              </div>

              {/* Observações */}
              {viewingEval.observations && (
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: 'var(--color-bg-base)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)'
                }}>
                  <strong style={{ fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Observações / Parecer:</strong>
                  <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--color-text-base)', whiteSpace: 'pre-wrap' }}>
                    {viewingEval.observations}
                  </p>
                </div>
              )}

              {/* Anexo PDF */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: 'var(--color-bg-base)',
                borderRadius: '8px',
                border: '1px solid var(--color-border)'
              }}>
                <div style={{ fontSize: '13px' }}>
                  <strong>Documento Comprovativo / Declaração:</strong>{' '}
                  {viewingEval.pdfBase64 ? (
                    <span style={{ color: '#059669', fontWeight: 'bold' }}>✓ Documento PDF Anexado</span>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)' }}>Nenhum ficheiro anexado</span>
                  )}
                </div>
                {viewingEval.pdfBase64 && (
                  <button
                    type="button"
                    style={styles.btnPdf}
                    onClick={() => {
                      try {
                        const pdfWindow = window.open("");
                        if (pdfWindow) {
                          pdfWindow.document.write(`<iframe width='100%' height='100%' style='border:none' src='${viewingEval.pdfBase64}'></iframe>`);
                        }
                      } catch {
                        // ignore popup block
                      }
                    }}
                  >
                    Visualizar Anexo PDF
                  </button>
                )}
              </div>

              {/* Barra de ações do rodapé do modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
                <button
                  type="button"
                  style={styles.btnPrintSheet}
                  onClick={() => handlePrintOfficialSheet(viewingEval)}
                >
                  🖨️ Imprimir Ficha Oficial
                </button>
                <button
                  type="button"
                  style={styles.btnCloseModal}
                  onClick={() => setViewingEval(null)}
                >
                  Fechar
                </button>
              </div>
            </div>
          </DraggableModal>
        );
      })()}

      {/* MODAL 2: EDITAR AVALIAÇÃO */}
      {editingEval && editFormData && (
        <DraggableModal
          isOpen={Boolean(editingEval)}
          onClose={() => setEditingEval(null)}
          title={`Editar Avaliação - ${editingEval.employeeName || 'Funcionário'}`}
          maxWidth="700px"
          icon="✏️"
        >
          <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={styles.editGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Ano da Avaliação *</label>
                <input
                  type="number"
                  name="year"
                  value={editFormData.year}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                  min="2000"
                  max="2100"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Período *</label>
                <input
                  type="text"
                  name="period"
                  value={editFormData.period}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Pontuação (0 a 20) *</label>
                <input
                  type="number"
                  name="score"
                  value={editFormData.score}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                  min="0"
                  max="20"
                  step="0.1"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Classificação Calculada</label>
                {(() => {
                  const previewCls = getClassification(editFormData.score);
                  return (
                    <div style={{
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontWeight: '700',
                      fontSize: '13px',
                      backgroundColor: previewCls.hexLight,
                      color: previewCls.hexDark,
                      border: `1px solid ${previewCls.hexBadge}`
                    }}>
                      {previewCls.label}
                    </div>
                  );
                })()}
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Data da Avaliação *</label>
                <input
                  type="date"
                  name="evaluationDate"
                  value={editFormData.evaluationDate}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Estado do Processo *</label>
                <select
                  name="status"
                  value={editFormData.status}
                  onChange={handleEditChange}
                  style={styles.select}
                  required
                >
                  <option value="Avaliado">Avaliado</option>
                  <option value="Homologado">Homologado</option>
                  <option value="Em Avaliação">Em Avaliação</option>
                  <option value="Não Avaliado">Não Avaliado</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Nome do Avaliador *</label>
                <input
                  type="text"
                  name="evaluatorName"
                  value={editFormData.evaluatorName}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Cargo do Avaliador *</label>
                <input
                  type="text"
                  name="evaluatorRole"
                  value={editFormData.evaluatorRole}
                  onChange={handleEditChange}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Nº do Despacho de Homologação</label>
                <input
                  type="text"
                  name="dispatchNumber"
                  value={editFormData.dispatchNumber}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="Ex: Despacho n.º 142/DG/2026"
                />
              </div>

              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Observações e Recomendações</label>
                <textarea
                  name="observations"
                  value={editFormData.observations}
                  onChange={handleEditChange}
                  style={{ ...styles.input, minHeight: '70px' }}
                  placeholder="Insira notas ou parecer sobre o desempenho..."
                />
              </div>

              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>Documento Anexo (PDF até 500KB)</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleEditFileChange}
                  style={styles.fileInput}
                />
                {editFormData.pdfBase64 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <span style={{ color: '#059669', fontSize: '12px', fontWeight: 'bold' }}>✓ Ficheiro PDF Carregado</span>
                    <button
                      type="button"
                      onClick={() => setEditFormData(prev => ({ ...prev, pdfBase64: '' }))}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Remover anexo
                    </button>
                  </div>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginTop: '4px' }}>Nenhum documento PDF associado</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '15px' }}>
              <button
                type="button"
                style={styles.btnCloseModal}
                onClick={() => setEditingEval(null)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={styles.btnSaveEdit}
              >
                Guardar Alterações
              </button>
            </div>
          </form>
        </DraggableModal>
      )}

      {/* CONFIRM MODAL PARA MENSAGENS E ELIMINAÇÃO */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => {
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'OK'}
        cancelText={confirmModal.cancelText || 'Cancelar'}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' },
  loadingContainer: { padding: '50px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px' },
  errorBanner: { padding: '12px 16px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: '13px' },
  
  // Card de Filtros
  filterCard: {
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    padding: '18px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
  },
  filterCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--color-border)'
  },
  filterCardTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-primary)'
  },
  btnClearFilters: {
    padding: '5px 12px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '11.5px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  filterGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '16px'
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
    whiteSpace: 'nowrap'
  },
  input: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px',
    transition: 'border-color 0.2s'
  },
  select: {
    padding: '9px 12px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    outline: 'none',
    fontSize: '13px',
    cursor: 'pointer'
  },
  fileInput: {
    padding: '8px',
    border: '1px dashed var(--color-border)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-bg-base)',
    fontSize: '12px'
  },
  filterFooter: {
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-start'
  },
  resultsBadge: {
    fontSize: '12px',
    color: 'var(--color-text-muted)',
    backgroundColor: 'var(--color-bg-base)',
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)'
  },

  // Tabela
  tableContainer: {
    overflowX: 'auto',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
  },
  tr: {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background-color 0.15s'
  },
  empty: {
    padding: '35px',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: '13.5px'
  },
  btnPdf: {
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: '600',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-accent, #EAAA00)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },

  // Botões de Ação
  actionButtons: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px'
  },
  actionBtnView: {
    padding: '5px 8px',
    fontSize: '13px',
    backgroundColor: 'rgba(27, 54, 93, 0.08)',
    border: '1px solid rgba(27, 54, 93, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  actionBtnEdit: {
    padding: '5px 8px',
    fontSize: '13px',
    backgroundColor: 'rgba(234, 170, 0, 0.12)',
    border: '1px solid rgba(234, 170, 0, 0.35)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },
  actionBtnDelete: {
    padding: '5px 8px',
    fontSize: '13px',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s'
  },

  // Modal de Visualização
  viewProfileBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  viewAvatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: '700',
    color: 'var(--color-text-muted)',
    flexShrink: 0
  },
  viewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '14px',
    padding: '14px 16px',
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '8px',
    border: '1px solid var(--color-border)'
  },
  viewItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    fontSize: '13px'
  },
  viewItemLabel: {
    fontSize: '11px',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  btnPrintSheet: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-accent, #EAAA00)',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12.5px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  btnCloseModal: {
    padding: '8px 16px',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '12.5px',
    fontWeight: '600',
    cursor: 'pointer'
  },

  // Modal de Edição
  editGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px'
  },
  btnSaveEdit: {
    padding: '8px 18px',
    backgroundColor: 'var(--color-primary)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer'
  }
};
