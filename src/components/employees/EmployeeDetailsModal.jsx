import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import useResizableModal from '../../hooks/useResizableModal';
import useEvaluationData from '../../hooks/useEvaluationData';
import { getClassification } from '../../utils/evaluationRules';
import FunctionalHistory from './acts/FunctionalHistory';
import AdminActWizard from './acts/AdminActWizard';
import useAuthData from '../../hooks/useAuthData';

export default function EmployeeDetailsModal({ emp, orgData, onClose, onRefresh, showRegisterAct = false }) {
  if (!emp) return null;
  const { data } = orgData;
  const {
    modalRef,
    position,
    onPointerDown,
    isMaximized,
    toggleMaximize,
    handleResizePointerDown,
    handleHeaderDoubleClick,
    getOverlayProps,
    modalStyle
  } = useResizableModal({ defaultWidth: '900px', minWidth: 460, minHeight: 320 });
  const { getLatestEvaluation } = useEvaluationData();
  const { user } = useAuthData();
  const latestEval = getLatestEvaluation(emp.id);
  const evalClass = latestEval ? getClassification(latestEval.score) : { label: 'Não Avaliado', color: '#CBD5E1', hexBadge: '#CBD5E1' };
  
  const [wizardConfig, setWizardConfig] = useState(null);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState(0);

  const isInactiveAct = ['Falecido', 'Expulso', 'Demitido'].includes(emp.status);

  const allowedByPerms = user?.permissions?.all ? null : (
    [
      ...(user?.permissions?.saude_obitos ? ['Junta de Saúde', 'Óbito'] : []),
      ...(user?.permissions?.reserva_reforma ? ['Reserva', 'Reforma'] : []),
    ]
  );

  // Se tem restrições de permissões mas o array allowedByPerms ficar vazio, significa que não tem permissão para Registar Acto nenhum
  const canRegisterAnyAct = user?.permissions?.all || allowedByPerms?.length > 0;

  const getName = (list, id) => list?.find(item => item.id === id)?.name || '-';

  // --- Smart Module: Mudança de Carreira ---
  const evaluateCareerChange = (employee, orgData) => {
    const categoryName = getName(orgData.data.categories, employee.categoryId) || '';
    const careerName = getName(orgData.data.careers, employee.careerId) || '';
    
    const isQuadroTecnicoComum = careerName.toLowerCase().includes('quadro t');
    const allowedCategoryPrefixes = [
      'técnico de papiloscopia', 
      'técnico da técnica criminalística', 
      'agente de investigação e instrução criminal', 
      'agente de investigação operativa'
    ];
    const isAllowedSpecificCategory = allowedCategoryPrefixes.some(prefix => 
      categoryName.toLowerCase().includes(prefix)
    );

    const hasValidCategory = isQuadroTecnicoComum || isAllowedSpecificCategory;

    const higherEdLevels = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação', 'Nível Superior', 'Mestrado Integrado'];
    const hasHigherEd = higherEdLevels.includes(employee.academicLevel) || 
      (employee.academicHistory && employee.academicHistory.some(h => higherEdLevels.includes(h.level)));

    const calculateYearsOfService = (admissionDate) => {
      if (!admissionDate) return 0;
      const admission = new Date(admissionDate);
      if (isNaN(admission)) return 0;
      const diff = Date.now() - admission.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    };
    
    const yearsOfService = calculateYearsOfService(employee.admissionDate);
    const hasValidServiceTime = yearsOfService >= 4;

    const rejectionReasons = [];
    if (!hasValidCategory) rejectionReasons.push('Categoria profissional não abrangida pela regra de mudança de carreira.');
    if (!hasHigherEd) rejectionReasons.push('Funcionário ainda não possui formação superior registada.');
    if (!hasValidServiceTime) rejectionReasons.push(`Tempo de serviço inferior a 4 anos (atual: ${yearsOfService} anos).`);

    return {
      isEligible: hasValidCategory && hasHigherEd && hasValidServiceTime,
      reasons: rejectionReasons
    };
  };

  const careerChangeEval = evaluateCareerChange(emp, orgData);
  // -----------------------------------------

  const overlayProps = getOverlayProps(onClose);

  return ReactDOM.createPortal(
    <>
      <div 
        style={styles.overlay} 
        onMouseDown={overlayProps.onMouseDown}
        onClick={overlayProps.onClick}
      >
        <div 
          ref={modalRef}
          style={{ ...styles.modal, ...modalStyle }}
        >
        <div 
          style={styles.header} 
          onPointerDown={isMaximized ? undefined : onPointerDown} 
          onDoubleClick={handleHeaderDoubleClick}
          className={isMaximized ? '' : 'drag-handle'}
          title="💡 Arraste para mover ou dê duplo clique com o rato para expandir / reduzir"
        >
            <h2 style={styles.title}>Detalhes do Funcionário</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showRegisterAct && canRegisterAnyAct && (
                <button 
                  onClick={() => !isInactiveAct && setWizardConfig({ isOpen: true, allowedActTypes: allowedByPerms })}
                  disabled={isInactiveAct}
                  style={{ 
                    backgroundColor: isInactiveAct ? 'var(--color-bg-subtle)' : 'var(--color-primary)', 
                    color: isInactiveAct ? 'var(--color-text-muted)' : 'white', 
                    border: 'none', padding: '6px 12px', borderRadius: '4px', 
                    cursor: isInactiveAct ? 'not-allowed' : 'pointer', 
                    fontSize: '13px', fontWeight: 'bold' 
                  }}
                  title={isInactiveAct ? `Não é possível registar actos num funcionário ${emp.status}` : ''}
                >
                  + Registar Acto
                </button>
              )}
              <button
                type="button"
                onClick={toggleMaximize}
                style={styles.expandBtn}
                title={isMaximized ? "Reduzir Tamanho (Restaurar)" : "Modo Expandir (Tela Cheia)"}
              >
                {isMaximized ? '🗗 Reduzir' : '⛶ Expandir'}
              </button>
              <button onClick={onClose} style={styles.closeBtn} title="Fechar">✕</button>
            </div>
        </div>

        <div style={styles.content}>
          {/* Header do Perfil */}
          <div style={styles.profileHeader}>
            {emp.photo ? (
              <img src={emp.photo} alt="Foto" style={styles.photo} />
            ) : (
              <div style={styles.photoPlaceholder}>👤</div>
            )}
            <div style={styles.profileTitle}>
              <h3 style={styles.name}>{emp.name}</h3>
              <p style={styles.nip}>NUIT: {emp.nip}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={emp.isActive ? styles.badgeActive : styles.badgeInactive}>
                  {emp.isActive ? 'Ativo' : 'Inativo'}
                </span>
                {emp.healthStatus === 'Baixa Médica' && (
                  <span style={styles.badgeSaude} title="Em Baixa / Junta Médica">🌡️ Doente</span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.grid}>
            {/* Informações Pessoais */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Informações Pessoais</h4>
              <div style={styles.infoRow}><span style={styles.label}>Género:</span> <span style={styles.value}>{emp.gender || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Data Nascimento:</span> <span style={styles.value}>{emp.birthDate || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Nº Documento (B.I/Passaporte):</span> <span style={styles.value}>{emp.idNumber || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>NUIT:</span> <span style={styles.value}>{emp.nuit || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Estado Civil:</span> <span style={styles.value}>{emp.maritalStatus || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Nº Filhos:</span> <span style={styles.value}>{emp.childrenCount || '-'}</span></div>
            </div>

            {/* Contactos */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Contactos</h4>
              <div style={styles.infoRow}><span style={styles.label}>Email:</span> <span style={styles.value}>{emp.email || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Telefone Principal:</span> <span style={styles.value}>{emp.phone || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Telefone Alternativo:</span> <span style={styles.value}>{emp.altPhone || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Endereço:</span> <span style={styles.value}>{emp.address || '-'}</span></div>
            </div>

            {/* Colocação Organizacional */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Colocação</h4>
              <div style={styles.infoRow}><span style={styles.label}>Direcção:</span> <span style={styles.value}>{getName(data.directorates, emp.directorateId)}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Departamento/Distrito:</span> <span style={styles.value}>{getName(data.departments, emp.departmentId)}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Repartição/Esquadra:</span> <span style={styles.value}>{getName(data.divisions, emp.divisionId)}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Secção/Posto:</span> <span style={styles.value}>{getName(data.sections, emp.sectionId)}</span></div>
            </div>

            {/* Perfil Profissional */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Dados Profissionais</h4>
              <div style={styles.infoRow}><span style={styles.label}>Carreira:</span> <span style={styles.value}>{getName(data.careers || [], emp.careerId)}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Categoria:</span> <span style={styles.value}>{getName(data.categories, emp.categoryId)}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Cargo de Chefia:</span> <span style={styles.value}>{emp.role || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Nível Académico:</span> <span style={styles.value}>{emp.academicLevel || '-'}</span></div>
              {emp.academicHistory && emp.academicHistory.length > 0 && (
                <div style={{...styles.infoRow, display: 'block', marginTop: '10px'}}>
                  <span style={{...styles.label, display: 'block', marginBottom: '8px'}}>Histórico Académico:</span>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {emp.academicHistory.map((item, index) => (
                      <div key={index} style={{display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap'}}>
                        <span style={{fontWeight: 'bold', fontSize: '13px'}}>{item.level} {item.formationArea ? `(${item.formationArea})` : ''}:</span>
                        {item.certB64 && (
                          <button onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              if (item.certB64.startsWith('data:application/pdf')) {
                                newWindow.document.write(`<iframe src="${item.certB64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              } else {
                                newWindow.document.write(`<img src="${item.certB64}" style="max-width: 100%;" />`);
                              }
                            }
                          }} style={{padding: '2px 6px', border: '1px solid var(--color-primary)', borderRadius: '4px', background: 'transparent', color: 'var(--color-primary)', fontSize: '11px', cursor: 'pointer'}}>
                            Visualizar Certificado
                          </button>
                        )}
                        {item.diplomaB64 && (
                          <button onClick={() => {
                            const newWindow = window.open();
                            if (newWindow) {
                              if (item.diplomaB64.startsWith('data:application/pdf')) {
                                newWindow.document.write(`<iframe src="${item.diplomaB64}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                              } else {
                                newWindow.document.write(`<img src="${item.diplomaB64}" style="max-width: 100%;" />`);
                              }
                            }
                          }} style={{padding: '2px 6px', border: '1px solid var(--color-primary)', borderRadius: '4px', background: 'transparent', color: 'var(--color-primary)', fontSize: '11px', cursor: 'pointer'}}>
                            Visualizar Diploma
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={styles.infoRow}><span style={styles.label}>Data Ingresso:</span> <span style={styles.value}>{emp.admissionDate || '-'}</span></div>
              <div style={styles.infoRow}><span style={styles.label}>Situação:</span> <span style={styles.value}>{emp.employmentStatus || '-'}</span></div>
            </div>

            {/* Gestão de Desempenho Individual */}
            <div style={styles.card}>
              <h4 style={styles.cardTitle}>Gestão de Desempenho Individual</h4>
              {latestEval ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: evalClass.hexBadge }}></div>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: evalClass.color }}>
                      {evalClass.label} ({latestEval.score}v)
                    </span>
                  </div>
                  <div style={styles.infoRow}><span style={styles.label}>Ano de Referência:</span> <span style={styles.value}>{latestEval.year}</span></div>
                  <div style={styles.infoRow}><span style={styles.label}>Estado:</span> <span style={styles.value}>{latestEval.status}</span></div>
                  <div style={styles.infoRow}><span style={styles.label}>Avaliador:</span> <span style={styles.value}>{latestEval.evaluatorName}</span></div>
                  <div style={styles.infoRow}><span style={styles.label}>Data Avaliação:</span> <span style={styles.value}>{latestEval.evaluationDate}</span></div>
                </>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontStyle: 'italic' }}>
                  Sem avaliações registadas.
                </div>
              )}
            </div>

            {/* Avaliação para Mudança de Carreira */}
            <div style={{...styles.card, gridColumn: '1 / -1'}}>
              <h4 style={styles.cardTitle}>Mudança de Carreira (Avaliação Automática)</h4>
              {careerChangeEval.isEligible ? (
                <div style={{ backgroundColor: '#ecfdf5', padding: '15px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                  <div style={{ color: '#065f46', fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>
                    ✅ Funcionário Elegível para Mudança de Carreira.
                  </div>
                  <p style={{ color: '#047857', fontSize: '14px', marginBottom: '15px' }}>
                    Todos os requisitos legais e institucionais foram verificados. O processo encontra-se disponível para submissão e aprovação pelo Departamento de Recursos Humanos.
                  </p>
                  <button 
                    onClick={() => {
                      setWizardConfig({ isOpen: true, allowedActTypes: ['Mudança de Carreira'] });
                    }}
                    style={{ backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                  >
                    🚀 Iniciar Processo de Mudança de Carreira
                  </button>
                </div>
              ) : (
                <div style={{ backgroundColor: '#fef2f2', padding: '15px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                  <div style={{ color: '#991b1b', fontWeight: 'bold', marginBottom: '8px', fontSize: '15px' }}>
                    ❌ Funcionário Não Elegível para Mudança de Carreira.
                  </div>
                  <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '10px' }}>
                    Verifique os requisitos pendentes (categoria profissional, formação superior ou tempo mínimo de 4 anos de serviço).
                  </p>
                  <ul style={{ color: '#7f1d1d', fontSize: '13px', margin: 0, paddingLeft: '20px' }}>
                    {careerChangeEval.reasons.map((r, i) => <li key={i} style={{ marginBottom: '4px' }}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>

            {/* Histórico Funcional (Novo Módulo) */}
            <div style={{...styles.card, gridColumn: '1 / -1'}}>
              <h4 style={styles.cardTitle}>Histórico Funcional (Actos Administrativos)</h4>
              <FunctionalHistory key={refreshHistoryTrigger} employeeId={emp.id} orgData={orgData} />
            </div>

          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.btnSecondary}>Fechar</button>
        </div>

        {/* Handle de redimensionamento por mouse no canto inferior direito */}
        {!isMaximized && (
          <div 
            onPointerDown={handleResizePointerDown}
            style={styles.resizeHandle}
            title="Arraste com o rato para expandir ou reduzir livremente"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="14" y1="3" x2="3" y2="14" />
              <line x1="14" y1="8" x2="8" y2="14" />
              <line x1="14" y1="13" x2="13" y2="14" />
            </svg>
          </div>
        )}
      </div>
      </div>
      
      {wizardConfig?.isOpen && (
        <AdminActWizard 
          emp={emp} 
          orgData={orgData} 
          allowedActTypes={wizardConfig.allowedActTypes}
          onClose={() => setWizardConfig(null)} 
          onActRegistered={() => {
            setRefreshHistoryTrigger(prev => prev + 1);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </>,
    document.body
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '20px',
    boxSizing: 'border-box'
  },
  modal: {
    backgroundColor: 'var(--color-bg-base)',
    borderRadius: '14px',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    boxSizing: 'border-box'
  },
  header: {
    padding: '16px 22px',
    borderBottom: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'var(--color-bg-card)',
    cursor: 'move',
    userSelect: 'none',
    flexShrink: 0
  },
  expandBtn: {
    background: 'rgba(37, 99, 235, 0.08)',
    border: '1px solid rgba(37, 99, 235, 0.25)',
    color: '#2563eb',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    transition: 'all 0.15s ease'
  },
  resizeHandle: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: '18px',
    height: '18px',
    cursor: 'se-resize',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    userSelect: 'none',
    zIndex: 10
  },
  title: {
    fontSize: '18px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    margin: 0
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1
  },
  profileHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '24px',
    marginBottom: '32px',
    padding: '20px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--color-border)',
    flexShrink: 0
  },
  photo: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '4px solid var(--color-bg-base)',
    boxShadow: 'var(--shadow-md)'
  },
  photoPlaceholder: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    border: '4px solid var(--color-bg-base)',
    boxShadow: 'var(--shadow-md)'
  },
  profileTitle: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '4px'
  },
  name: { margin: '0 0 4px 0', fontSize: '24px', color: 'var(--color-text-main)' },
  nip: { margin: '0 0 12px 0', fontSize: '15px', color: 'var(--color-text-muted)' },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#059669', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  badgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
  badgeSaude: { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' },
  card: {
    padding: '20px',
    backgroundColor: 'var(--color-bg-card)',
    borderRadius: '10px',
    border: '1px solid var(--color-border)'
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: '700',
    color: 'var(--color-primary)',
    marginBottom: '16px',
    borderBottom: '2px solid var(--color-border)',
    paddingBottom: '8px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid var(--color-border)',
    fontSize: '14px'
  },
  label: {
    color: 'var(--color-text-muted)',
    fontWeight: '600'
  },
  value: {
    color: 'var(--color-text-base)',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '60%'
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--color-border)',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: 'var(--color-bg-card)'
  },
  btnSecondary: {
    padding: '10px 24px',
    backgroundColor: 'var(--color-bg-base)',
    color: 'var(--color-text-base)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};
