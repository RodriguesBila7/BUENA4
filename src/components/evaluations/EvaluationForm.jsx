import React, { useState, useMemo } from 'react';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';

// Templates predefinidos de ODIs de acordo com as funções típicas no SERNIC / Estado
const GDI_PRESET_TEMPLATES = [
  {
    name: 'Investigação Criminal & Instrução Processual',
    objectives: [
      {
        id: 1,
        description: 'Instrução célere e rigorosa dos autos e processos-crime atribuídos.',
        expectedResult: 'Conclusão e remessa ao Ministério Público de 90% dos processos dentro do prazo legal; garantia de zero nulidades processuais.',
        deadline: `${new Date().getFullYear()}-11-30`,
        weight: 40,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 2,
        description: 'Cumprimento tempestivo de mandados e diligências operativas de campo.',
        expectedResult: 'Execução de 95% das ordens de serviço e mandados judiciais/ministeriais com relatórios circunstanciados em 48 horas.',
        deadline: `${new Date().getFullYear()}-10-31`,
        weight: 35,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 3,
        description: 'Gestão, zelo e integridade de peças probatórias e cadeia de custódia.',
        expectedResult: 'Registo e selagem informática de 100% das apreensões e amostras no cofre/depósito sem qualquer extravio ou anomalia.',
        deadline: `${new Date().getFullYear()}-12-15`,
        weight: 25,
        achievementStatus: 'Plenamente Cumprido'
      }
    ]
  },
  {
    name: 'Atendimento, Tramitação e Notificações',
    objectives: [
      {
        id: 1,
        description: 'Atendimento humanizado, recepção de queixas e denúncias do público.',
        expectedResult: 'Tempo médio de espera no balcão inferior a 20 minutos; 100% das participações registadas no livro e sistema no mesmo dia útil.',
        deadline: `${new Date().getFullYear()}-11-30`,
        weight: 40,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 2,
        description: 'Notificação célere de declarantes, arguidos e testemunhas.',
        expectedResult: 'Entrega comprovada de 90% das notificações emitidas nos prazos fixados pelo instrutor.',
        deadline: `${new Date().getFullYear()}-10-31`,
        weight: 35,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 3,
        description: 'Organização do expediente diário e controlo de correspondência.',
        expectedResult: 'Expedição e encaminhamento de ofícios em menos de 24 horas após despacho da chefia.',
        deadline: `${new Date().getFullYear()}-12-15`,
        weight: 25,
        achievementStatus: 'Plenamente Cumprido'
      }
    ]
  },
  {
    name: 'Apoio Técnico-Administrativo e Gestão Documental',
    objectives: [
      {
        id: 1,
        description: 'Classificação, arquivo e digitalização do acervo documental da unidade.',
        expectedResult: '100% dos processos findos arquivados segundo o plano de classificação; facilidade de recuperação documental em menos de 10 minutos.',
        deadline: `${new Date().getFullYear()}-11-30`,
        weight: 45,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 2,
        description: 'Elaboração e consolidação de relatórios periódicos de actividades da unidade.',
        expectedResult: 'Apresentação de relatórios mensais e trimestrais de efectividade e execução até ao 3º dia útil seguinte ao fecho do período.',
        deadline: `${new Date().getFullYear()}-12-10`,
        weight: 35,
        achievementStatus: 'Plenamente Cumprido'
      },
      {
        id: 3,
        description: 'Conservação dos bens patrimoniais e materiais de escritório alocados.',
        expectedResult: 'Inventário permanente atualizado e reporte imediato de necessidades de manutenção ou consumíveis.',
        deadline: `${new Date().getFullYear()}-12-20`,
        weight: 20,
        achievementStatus: 'Plenamente Cumprido'
      }
    ]
  }
];

export default function EvaluationForm({ user, onSave }) {
  const { employees = [] } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { addEvaluation } = useEvaluationData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [formData, setFormData] = useState({
    year: new Date().getFullYear().toString(),
    period: 'Anual (Ciclo do Estado)',
    evaluatorName: user?.name || user?.username || 'Superior Hierárquico',
    evaluatorRole: user?.roleName || user?.roleDetails?.name || user?.role || 'Chefe de Secção / Repartição',
    evaluationDate: new Date().toISOString().split('T')[0],
    dispatchNumber: '',
    score: '',
    observations: '',
    developmentPlan: '',
    pdfBase64: ''
  });

  // Elementos Integrantes da GDI: Objectivos de Desempenho Individual (ODI), Resultados Esperados e Prazos de Efectivação
  const [objectives, setObjectives] = useState([
    {
      id: 1,
      description: 'Instrução e tramitação tempestiva dos processos sob sua responsabilidade funcional.',
      expectedResult: 'Cumprimento de 90% dos prazos processuais com rigor técnico e conformidade jurídica.',
      deadline: `${new Date().getFullYear()}-11-30`,
      weight: 40,
      achievementStatus: 'Plenamente Cumprido'
    },
    {
      id: 2,
      description: 'Zelo pela disciplina, assiduidade e qualidade no atendimento ao serviço público.',
      expectedResult: 'Assiduidade pontual exemplar e zero reclamações fundamentadas de utentes ou colegas.',
      deadline: `${new Date().getFullYear()}-12-15`,
      weight: 30,
      achievementStatus: 'Plenamente Cumprido'
    },
    {
      id: 3,
      description: 'Participação activa nas rotinas de formação contínua e aperfeiçoamento profissional.',
      expectedResult: 'Conclusão de no mínimo 1 módulo de actualização técnica e aplicação prática na secção.',
      deadline: `${new Date().getFullYear()}-10-31`,
      weight: 30,
      achievementStatus: 'Plenamente Cumprido'
    }
  ]);
  
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '' });

  const [filters, setFilters] = useState({
    directorateId: '',
    departmentId: '',
    divisionId: '',
    sectionId: '',
    careerId: '',
    categoryId: ''
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => {
      const updates = { [name]: value };
      if (name === 'directorateId') {
        updates.departmentId = '';
        updates.divisionId = '';
        updates.sectionId = '';
      } else if (name === 'departmentId') {
        updates.divisionId = '';
        updates.sectionId = '';
      } else if (name === 'divisionId') {
        updates.sectionId = '';
      } else if (name === 'careerId') {
        updates.categoryId = '';
      }
      return { ...prev, ...updates };
    });
  };

  const filteredEmployees = useMemo(() => {
    const rawList = Array.isArray(employees) ? employees : [];
    const scopedList = user ? filterByProvincialScope(rawList, user, orgData) : rawList;
    let result = scopedList.filter(e => e && e.isActive !== false);

    if (filters.directorateId) result = result.filter(e => String(e.directorateId) === String(filters.directorateId));
    if (filters.departmentId) result = result.filter(e => String(e.departmentId) === String(filters.departmentId));
    if (filters.divisionId) result = result.filter(e => String(e.divisionId) === String(filters.divisionId));
    if (filters.sectionId) result = result.filter(e => String(e.sectionId) === String(filters.sectionId));
    if (filters.careerId) result = result.filter(e => String(e.careerId) === String(filters.careerId));
    if (filters.categoryId) result = result.filter(e => String(e.categoryId) === String(filters.categoryId));

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        (e.name && e.name.toLowerCase().includes(lower)) || 
        (e.nip && e.nip.toLowerCase().includes(lower))
      );
    }
    
    return result.slice(0, 15);
  }, [searchTerm, filters, employees, user, orgData]);

  const selectedEmp = useMemo(() => (employees || []).find(e => e && e.id === selectedEmpId), [employees, selectedEmpId]);
  
  const classification = useMemo(() => getClassification(formData.score), [formData.score]);

  const getName = (list, id) => (list || []).find(item => item && item.id === id)?.name || '-';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Funções de Gestão dos Objectivos de Desempenho Individual (ODIs)
  const handleAddObjective = () => {
    const newId = objectives.length > 0 ? Math.max(...objectives.map(o => o.id || 0)) + 1 : 1;
    setObjectives(prev => [
      ...prev,
      {
        id: newId,
        description: '',
        expectedResult: '',
        deadline: `${formData.year || new Date().getFullYear()}-11-30`,
        weight: 20,
        achievementStatus: 'Plenamente Cumprido'
      }
    ]);
  };

  const handleRemoveObjective = (idToRemove) => {
    if (objectives.length <= 1) {
      setAlertModal({ isOpen: true, message: 'O plano individual de desempenho deve conter no mínimo 1 Objectivo de Desempenho Individual (ODI).' });
      return;
    }
    setObjectives(prev => prev.filter(o => o.id !== idToRemove));
  };

  const handleObjectiveChange = (id, field, value) => {
    setObjectives(prev => prev.map(o => {
      if (o.id === id) {
        return { ...o, [field]: field === 'weight' ? (parseFloat(value) || 0) : value };
      }
      return o;
    }));
  };

  const handleApplyPreset = (presetName) => {
    const preset = GDI_PRESET_TEMPLATES.find(p => p.name === presetName);
    if (!preset) return;
    setObjectives(preset.objectives.map(o => ({
      ...o,
      deadline: o.deadline.replace(/^\d{4}/, formData.year || new Date().getFullYear())
    })));
  };

  const totalWeight = useMemo(() => {
    return objectives.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0);
  }, [objectives]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setAlertModal({ isOpen: true, message: 'O documento anexado deve ser um ficheiro PDF.' });
      return;
    }

    if (file.size > 1024 * 600) { // Limite de 600KB
      setAlertModal({ isOpen: true, message: 'O ficheiro PDF excede o limite de 600KB. Por favor, comprima o documento antes de anexar.' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, pdfBase64: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedEmp) {
      setAlertModal({ isOpen: true, message: 'Por favor, selecione o funcionário avaliado na lista.' });
      return;
    }

    // Validar se os ODIs têm descrição e resultados esperados preenchidos
    for (let i = 0; i < objectives.length; i++) {
      const obj = objectives[i];
      if (!obj.description || !obj.description.trim()) {
        setAlertModal({ isOpen: true, message: `Por favor, preencha a descrição do Objectivo de Desempenho Individual #${i + 1}.` });
        return;
      }
      if (!obj.expectedResult || !obj.expectedResult.trim()) {
        setAlertModal({ isOpen: true, message: `Por favor, preencha os Resultados Esperados do Objectivo #${i + 1}.` });
        return;
      }
      if (!obj.deadline) {
        setAlertModal({ isOpen: true, message: `Por favor, indique o Prazo de Efectivação do Objectivo #${i + 1}.` });
        return;
      }
    }
    
    if (formData.score === '' || isNaN(parseFloat(formData.score)) || parseFloat(formData.score) < 0 || parseFloat(formData.score) > 20) {
      setAlertModal({ isOpen: true, message: 'A pontuação final anual deve ser um número válido entre 0 e 20 valores (Decreto n.º 22/2018).' });
      return;
    }

    try {
      await addEvaluation({
        employeeId: selectedEmpId,
        employeeNip: selectedEmp.nip || 'Sem NUIT',
        employeeName: selectedEmp.name || 'Sem Nome',
        directorateId: selectedEmp.directorateId,
        provincialDirectorateId: selectedEmp.provincialDirectorateId,
        districtDirectorateId: selectedEmp.districtDirectorateId || selectedEmp.districtId,
        province: selectedEmp.province,
        ...formData,
        period: formData.period || 'Anual (Ciclo do Estado)',
        objectives, // Guarda os elementos integrantes (ODIs, Resultados Esperados, Prazos)
        totalWeight,
        classificationLabel: classification.label,
        moduleType: 'Gestão de Desempenho Individual (GDI)'
      });
      if (onSave) onSave();
    } catch (err) {
      setAlertModal({ isOpen: true, message: err.message });
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.formContainer}>
        
        {/* Banner de Contextualização da Gestão de Desempenho Individual */}
        <div style={styles.introCard}>
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={styles.introIcon}>🏛️</div>
            <div>
              <h4 style={styles.introTitle}>Ciclo Anual de Gestão de Desempenho Individual (GDI)</h4>
              <p style={styles.introText}>
                No âmbito da Função Pública e do Estatuto Geral dos Funcionários e Agentes do Estado (EGFAE / Decreto n.º 22/2018), a gestão do desempenho é anual e estruturada em três pilares fundamentais:
                <strong> 1. Objectivos de Desempenho Individual (ODI)</strong>; 
                <strong> 2. Resultados Esperados (Metas e Entregáveis)</strong>; 
                <strong> 3. Prazos da sua Efectivação</strong> para a avaliação final e homologação oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Seção 1: Seleção do Funcionário */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>1. Identificação do Funcionário Avaliado</h3>
          
          <div style={styles.searchBox}>
            <div style={styles.filtersGrid}>
              <select name="directorateId" value={filters.directorateId} onChange={handleFilterChange} style={styles.filterSelect}>
                <option value="">Todas as Direcções</option>
                {(orgData?.directorates || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              
              <select name="departmentId" value={filters.departmentId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.directorateId}>
                <option value="">Todos os Departamentos / Distritos</option>
                {(orgData?.departments || []).filter(d => d.directorateId === filters.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select name="divisionId" value={filters.divisionId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.departmentId}>
                <option value="">Todas as Repartições</option>
                {(orgData?.divisions || []).filter(d => d.departmentId === filters.departmentId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>

              <select name="sectionId" value={filters.sectionId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.departmentId && !filters.divisionId}>
                <option value="">Todas as Secções</option>
                {(orgData?.sections || []).filter(s => filters.divisionId ? s.divisionId === filters.divisionId : s.departmentId === filters.departmentId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>

              <select name="careerId" value={filters.careerId} onChange={handleFilterChange} style={styles.filterSelect}>
                <option value="">Todas as Carreiras</option>
                {(orgData?.careers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              <select name="categoryId" value={filters.categoryId} onChange={handleFilterChange} style={styles.filterSelect} disabled={!filters.careerId}>
                <option value="">Todas as Categorias</option>
                {(orgData?.categories || []).filter(c => c.careerId === filters.careerId).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <input 
              type="text" 
              placeholder="Pesquisar por NUIT ou Nome do Funcionário..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{...styles.input, marginTop: '10px'}}
            />
            <div style={styles.empList}>
              {filteredEmployees.map(emp => (
                <div 
                  key={emp.id} 
                  style={{...styles.empItem, ...(selectedEmpId === emp.id ? styles.empItemSelected : {})}}
                  onClick={() => setSelectedEmpId(emp.id)}
                >
                  <strong>{emp.nip}</strong> — {emp.name} <span style={{fontSize: '11px', opacity: 0.8}}>({emp.role || 'Sem cargo'})</span>
                </div>
              ))}
              {filteredEmployees.length === 0 && (
                <div style={{ padding: '15px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>
                  Nenhum funcionário encontrado no seu âmbito de actuação ou critérios selecionados.
                </div>
              )}
            </div>
          </div>

          {selectedEmp && (() => {
            const timeOfService = (() => {
              if (!selectedEmp.admissionDate) return '-';
              const start = new Date(selectedEmp.admissionDate);
              const end = new Date();
              const diffTime = Math.abs(end - start);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              const years = Math.floor(diffDays / 365);
              const months = Math.floor((diffDays % 365) / 30);
              return years > 0 ? `${years} ano(s) e ${months} mês(es)` : `${months} mês(es)`;
            })();

            return (
              <div style={styles.previewBox}>
                <div style={styles.avatar}>
                  {selectedEmp.photo ? (
                    <img src={selectedEmp.photo} alt="Avatar" style={{width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%'}} />
                  ) : (
                    (selectedEmp.name || 'F').charAt(0)
                  )}
                </div>
                <div style={styles.previewGrid}>
                  <div style={styles.previewItem}>
                    <strong>Nome Completo:</strong> {selectedEmp.name}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Nº Mecanográfico (NUIT):</strong> {selectedEmp.nip}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Carreira:</strong> {getName(orgData?.careers || [], selectedEmp.careerId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Categoria:</strong> {getName(orgData?.categories || [], selectedEmp.categoryId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Função / Cargo:</strong> {selectedEmp.role || 'Sem cargo específico'}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Direcção / Unidade:</strong> {getName(orgData?.directorates || [], selectedEmp.directorateId)}
                  </div>
                  <div style={styles.previewItem}>
                    <strong>Tempo de Serviço no Estado:</strong> {timeOfService}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Seção 2: Parametrização do Ciclo Anual & Intervenientes */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>2. Ciclo Anual de Desempenho & Avaliador Hierárquico</h3>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Ano Civil de Exercício *</label>
              <input 
                type="number" 
                name="year" 
                value={formData.year} 
                onChange={handleChange} 
                style={styles.input} 
                required 
                min="2000" 
                max="2100" 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Regime do Ciclo *</label>
              <input 
                type="text" 
                name="period" 
                value={formData.period} 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Superior Hierárquico / Avaliador *</label>
              <input 
                type="text" 
                name="evaluatorName" 
                value={formData.evaluatorName} 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Cargo / Função do Avaliador *</label>
              <input 
                type="text" 
                name="evaluatorRole" 
                value={formData.evaluatorRole} 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data da Formalização da Ficha *</label>
              <input 
                type="date" 
                name="evaluationDate" 
                value={formData.evaluationDate} 
                onChange={handleChange} 
                style={styles.input} 
                required 
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº do Despacho de Homologação</label>
              <input 
                type="text" 
                name="dispatchNumber" 
                placeholder="Ex: Despacho nº 42/GDG/2026" 
                value={formData.dispatchNumber} 
                onChange={handleChange} 
                style={styles.input} 
              />
            </div>
          </div>
        </div>

        {/* Seção 3: Elementos Integrantes da GDI - Objectivos de Desempenho Individual (ODI), Resultados Esperados e Prazos */}
        <div style={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
            <div>
              <h3 style={{ ...styles.sectionTitle, margin: 0, borderBottom: 'none' }}>
                3. Objectivos de Desempenho Individual (ODI), Resultados Esperados & Prazos
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Definição e monitorização das metas individuais pactuadas entre a chefia e o colaborador para o ano económico.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                type="button" 
                onClick={handleAddObjective} 
                style={styles.btnAddObj}
              >
                + Adicionar Objectivo (ODI)
              </button>
            </div>
          </div>

          {/* Modelos rápidos de RH para preenchimento ágil */}
          <div style={styles.presetBar}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' }}>
              Modelos Institucionais Rápidos:
            </span>
            {GDI_PRESET_TEMPLATES.map((p, idx) => (
              <button 
                key={idx} 
                type="button" 
                onClick={() => handleApplyPreset(p.name)} 
                style={styles.presetButton}
              >
                📋 {p.name}
              </button>
            ))}
          </div>

          {/* Lista de ODIs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '15px' }}>
            {objectives.map((obj, index) => (
              <div key={obj.id || index} style={styles.objCard}>
                <div style={styles.objHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={styles.objBadge}>ODI #{index + 1}</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-base)' }}>
                      Objectivo de Desempenho Individual
                    </span>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveObjective(obj.id)} 
                    style={styles.btnRemoveObj} 
                    title="Remover este Objectivo"
                  >
                    ✕ Remover
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Descrição do Objectivo de Desempenho Individual (ODI) *</label>
                    <textarea 
                      value={obj.description} 
                      onChange={(e) => handleObjectiveChange(obj.id, 'description', e.target.value)} 
                      placeholder="Ex: Assegurar a instrução célere e rigorosa dos inquéritos criminais distribuídos..."
                      style={{ ...styles.input, minHeight: '65px' }}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Resultados Esperados (Metas Mensuráveis, Padrão de Qualidade e Entregáveis) *</label>
                    <textarea 
                      value={obj.expectedResult} 
                      onChange={(e) => handleObjectiveChange(obj.id, 'expectedResult', e.target.value)} 
                      placeholder="Ex: Conclusão de 90% dos autos dentro do prazo legal de 90 dias com zero nulidades declaradas..."
                      style={{ ...styles.input, minHeight: '65px' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Prazo de Efectivação *</label>
                      <input 
                        type="date" 
                        value={obj.deadline} 
                        onChange={(e) => handleObjectiveChange(obj.id, 'deadline', e.target.value)} 
                        style={styles.input} 
                        required 
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Ponderação (%)</label>
                      <input 
                        type="number" 
                        value={obj.weight} 
                        onChange={(e) => handleObjectiveChange(obj.id, 'weight', e.target.value)} 
                        style={styles.input} 
                        min="1" 
                        max="100" 
                        required 
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Grau de Cumprimento</label>
                      <select 
                        value={obj.achievementStatus || 'Plenamente Cumprido'} 
                        onChange={(e) => handleObjectiveChange(obj.id, 'achievementStatus', e.target.value)} 
                        style={styles.filterSelect}
                      >
                        <option value="Superado">Superado (100%+)</option>
                        <option value="Plenamente Cumprido">Plenamente Cumprido (100%)</option>
                        <option value="Parcialmente Cumprido">Parcialmente Cumprido (50% a 99%)</option>
                        <option value="Não Cumprido">Não Cumprido (&lt; 50%)</option>
                        <option value="Em Curso / Pactuado">Em Curso / Pactuado</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumo de Metas e Ponderação */}
          <div style={styles.objFooterSummary}>
            <div style={{ fontSize: '13px', color: 'var(--color-text-base)' }}>
              Total de Objectivos Pactuados: <strong>{objectives.length}</strong>
            </div>
            <div style={{ fontSize: '13px', color: totalWeight === 100 ? 'var(--color-success)' : 'var(--color-warning)' }}>
              Soma das Ponderações: <strong>{totalWeight}%</strong> {totalWeight !== 100 && <span style={{fontSize: '11px'}}>(Recomendado totalizar 100%)</span>}
            </div>
          </div>
        </div>

        {/* Seção 4: Avaliação Final Anual, Classificação e Despacho */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>4. Avaliação Final Anual (Escala 0 a 20 & Homologação)</h3>
          <div style={styles.grid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pontuação Global Anual (0 a 20 valores) *</label>
              <input 
                type="number" 
                name="score" 
                value={formData.score} 
                onChange={handleChange} 
                style={{ ...styles.input, fontSize: '16px', fontWeight: 'bold' }} 
                required 
                min="0" 
                max="20" 
                step="0.1" 
                placeholder="Ex: 17.5"
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Menção Qualitativa (Decreto n.º 22/2018)</label>
              <div style={{
                padding: '12px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '15px',
                backgroundColor: classification.hexLight, color: classification.hexDark, border: `1px solid ${classification.hexBadge}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {classification.label}
              </div>
            </div>

            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Apreciação Global da Chefia / Observações do Desempenho</label>
              <textarea 
                name="observations" 
                value={formData.observations} 
                onChange={handleChange} 
                placeholder="Registo detalhado da apreciação do superior hierárquico sobre a conduta e resultados obtidos..."
                style={{ ...styles.input, minHeight: '65px' }}
              />
            </div>

            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Plano de Desenvolvimento e Ações de Formação / Aperfeiçoamento Recomendadas</label>
              <textarea 
                name="developmentPlan" 
                value={formData.developmentPlan || ''} 
                onChange={handleChange} 
                placeholder="Indicação de cursos, treinamentos práticos ou medidas de reforço de competências para o ciclo subsequente..."
                style={{ ...styles.input, minHeight: '60px' }}
              />
            </div>

            <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
              <label style={styles.label}>Declaração / Ficha GDI Homologada e Assinada (Ficheiro PDF max 600KB)</label>
              <input type="file" accept=".pdf" onChange={handleFileChange} style={styles.fileInput} />
              {formData.pdfBase64 && <span style={styles.fileSuccess}>✓ Documento digitalizado anexado com sucesso</span>}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button type="submit" style={styles.btnSave}>
            Gravar Ficha de Gestão de Desempenho Individual (GDI)
          </button>
        </div>
      </form>

      <ConfirmModal 
        isOpen={alertModal.isOpen} 
        title="Aviso de Validação"
        message={alertModal.message}
        onConfirm={() => setAlertModal({ isOpen: false, message: '' })}
        hideCancel={true}
        confirmText="Entendido"
      />
    </div>
  );
}

const styles = {
  container: { padding: '20px' },
  formContainer: { maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '25px' },
  introCard: { backgroundColor: 'var(--color-bg-card)', padding: '18px 22px', borderRadius: '12px', border: '1px solid var(--color-border)', borderLeft: '5px solid var(--color-primary)' },
  introIcon: { fontSize: '28px' },
  introTitle: { margin: '0 0 6px 0', fontSize: '15px', color: 'var(--color-primary)', fontWeight: '700' },
  introText: { margin: 0, fontSize: '13px', lineHeight: '1.5', color: 'var(--color-text-muted)' },
  section: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  sectionTitle: { margin: '0 0 16px 0', fontSize: '16px', color: 'var(--color-primary)', borderBottom: '2px solid var(--color-border)', paddingBottom: '8px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', fontSize: '13px', transition: 'border-color 0.2s', fontFamily: 'inherit' },
  fileInput: { padding: '10px', border: '1px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  fileSuccess: { color: 'var(--color-success)', fontSize: '12px', marginTop: '6px', fontWeight: '600' },
  searchBox: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' },
  filtersGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px' },
  filterSelect: { padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', fontSize: '13px', outline: 'none' },
  empList: { maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)' },
  empItem: { padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--color-border)', fontSize: '13px', transition: 'background-color 0.2s' },
  empItemSelected: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' },
  previewBox: { display: 'flex', alignItems: 'center', gap: '20px', padding: '18px', backgroundColor: 'var(--color-bg-base)', borderRadius: '10px', border: '1px solid var(--color-border)', flexWrap: 'wrap' },
  avatar: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '700', color: 'var(--color-text-muted)', flexShrink: 0 },
  previewGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', flex: 1 },
  previewItem: { fontSize: '13px', color: 'var(--color-text-base)' },
  presetBar: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', padding: '10px 14px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  presetButton: { padding: '5px 10px', fontSize: '11px', fontWeight: '600', backgroundColor: 'var(--color-bg-card)', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' },
  btnAddObj: { padding: '7px 14px', fontSize: '12px', fontWeight: '600', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', cursor: 'pointer' },
  objCard: { backgroundColor: 'var(--color-bg-base)', padding: '18px', borderRadius: '10px', border: '1px solid var(--color-border)' },
  objHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--color-border)', paddingBottom: '8px' },
  objBadge: { padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: '700', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)' },
  btnRemoveObj: { padding: '4px 8px', fontSize: '11px', backgroundColor: 'transparent', color: 'var(--color-danger, #ef4444)', border: '1px solid var(--color-danger, #ef4444)', borderRadius: '4px', cursor: 'pointer' },
  objFooterSummary: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)', marginTop: '10px' },
  footer: { display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' },
  btnSave: { padding: '14px 28px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '15px', transition: 'opacity 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }
};

