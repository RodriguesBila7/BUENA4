import React, { useState } from 'react';
import SystemModal from '../../common/SystemModal';
import CustomSelect from '../../CustomSelect';
import useAdminActsData from '../../../hooks/useAdminActsData';
import useActTypesData from '../../../hooks/useActTypesData';
import useEmployeeData from '../../../hooks/useEmployeeData';
import useDisciplinaryData from '../../../hooks/useDisciplinaryData';
import useTransferData from '../../../hooks/useTransferData';
import useVacationData from '../../../hooks/useVacationData';
import ConfirmModal from '../../ConfirmModal';

export default function AdminActWizard({ emp, orgData, onClose, onActRegistered, allowedActTypes }) {
  const { registerAct } = useAdminActsData();
  const { actTypes } = useActTypesData();
  const { updateEmployee } = useEmployeeData();
  
  const { addProcess, getProcessesByEmployee } = useDisciplinaryData();
  const { requestTransfer, transfers } = useTransferData();
  const { addRequest: addVacation, requests: vacations } = useVacationData();

  const [formData, setFormData] = useState({
    actType: allowedActTypes?.length === 1 ? allowedActTypes[0] : '',
    actDate: new Date().toISOString().substring(0, 10),
    despacho: '',
    br: '',
    details: {}
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, hideCancel: true });

  const dynamicGroups = React.useMemo(() => {
    const groups = {};
    (actTypes || []).forEach(act => {
      if (['Férias e Licenças', 'Transferências e Mobilidade', 'Processos Disciplinares'].includes(act.group_name)) {
        return; // Ignorar grupos que possuem módulos de gestão próprios
      }
      if (act.act_name === 'Promoção por Mudança de Carreira') {
        return; // Remover funcionalidade duplicada não suportada
      }
      if (act.is_active && (!allowedActTypes || allowedActTypes.includes(act.act_name))) {
        if (!groups[act.group_name]) groups[act.group_name] = [];
        groups[act.group_name].push(act.act_name);
      }
    });
    return Object.keys(groups).map(g => ({ label: g, types: groups[g] }));
  }, [actTypes, allowedActTypes]);

  const handleDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      details: { ...prev.details, [field]: value }
    }));
  };

  React.useEffect(() => {
    if (formData.actType === 'Progressão') {
      const currentStep = emp.step || 'C';
      let nextStep = 'B';
      if (currentStep === 'C') nextStep = 'B';
      if (currentStep === 'B') nextStep = 'A';
      if (currentStep === 'A') nextStep = 'A';
      handleDetailsChange('newEscalao', nextStep);
    }
  }, [formData.actType, emp.step]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      setError('O ficheiro deve ter no máximo 10MB.');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      handleDetailsChange('documentB64', reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    // Removed the mandatory document check so it can be registered as Pending
    setLoading(true);

    if (formData.actType === 'Reserva') {
      const careerName = orgData?.data?.careers?.find(c => c.id === emp.careerId)?.name || '';
      if (careerName.toLowerCase().includes('quadro t')) {
        setError('Erro: Funcionários do Quadro Técnico Comum não vão à Reserva por não serem paramilitares. Estes passam diretamente à Reforma.');
        setLoading(false);
        return;
      }
    }

    if (['Férias', 'Licença'].includes(formData.actType)) {
      const activeVacations = (vacations || []).filter(v => v.employeeId === emp.id && ['Submetida', 'Em análise', 'Aprovada', 'Em gozo'].includes(v.status) && v.type === formData.actType);
      if (activeVacations.length > 0) {
        setError(`Erro: Este funcionário já possui um processo de ${formData.actType} em aberto.`);
        setLoading(false);
        return;
      }
    }

    if (['Transferência', 'Destacamento', 'Reafectação', 'Comissão de Serviço'].includes(formData.actType)) {
      const activeTransfers = (transfers || []).filter(t => t.employeeId === emp.id && ['Submetida', 'Em análise', 'Aprovada'].includes(t.status) && t.type === formData.actType);
      if (activeTransfers.length > 0) {
        setError(`Erro: Este funcionário já possui um processo de ${formData.actType} em aberto.`);
        setLoading(false);
        return;
      }
    }

    if (['Advertência', 'Repreensão', 'Multa', 'Suspensão', 'Demissão', 'Expulsão'].includes(formData.actType)) {
      const activeDisc = getProcessesByEmployee(emp.id).filter(p => ['Aberto', 'Em Instrução'].includes(p.status));
      if (activeDisc.length > 0) {
        setError(`Erro: Este funcionário já possui um Processo Disciplinar em aberto.`);
        setLoading(false);
        return;
      }
    }

    const isPendingAct = formData.actType === 'Promoção' || formData.actType === 'Progressão' || formData.actType === 'Mudança de Carreira';

    const isMudanca = formData.actType === 'Mudança de Carreira';
    const validLevels = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação', 'Nível Superior'];
    const hasValidLevel = validLevels.includes(emp.academicLevel);

    const categoryName = orgData?.data?.categories?.find(c => c.id === emp.categoryId)?.name || '';
    const careerName = orgData?.data?.careers?.find(c => c.id === emp.careerId)?.name || '';
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
    const isEligibleForMudanca = isQuadroTecnicoComum || isAllowedSpecificCategory;

    if (isMudanca && !isEligibleForMudanca) {
      setError(`Erro: O funcionário não é elegível para Mudança de Carreira. A sua categoria atual (${categoryName}) já é superior ou não faz parte das categorias de base permitidas.`);
      setLoading(false);
      return;
    }

    if (isMudanca && !hasValidLevel) {
      if (!formData.details.documentB64) {
        setError('Para tornar o funcionário elegível para Mudança de Carreira, é obrigatório anexar o Certificado / Diploma.');
        setLoading(false);
        return;
      }
      if (!formData.despacho) {
        setError('Por favor, informe o Nº do Despacho do averbamento.');
        setLoading(false);
        return;
      }

      await updateEmployee(emp.id, { academicLevel: 'Nível Superior' });
      localStorage.setItem('sernic_active_tab', 'admin_acts_dynamic_Mudança_de_Carreira');
      window.location.reload();
      return;
    }

    if (isMudanca && !formData.details.documentB64) {
      setError('A Mudança de Carreira exige obrigatoriamente o anexo do Certificado / Diploma.');
      setLoading(false);
      return;
    }

    const payload = {
      employeeId: emp.id,
      actType: formData.actType,
      actDate: formData.actDate,
      despacho: formData.despacho,
      br: formData.br,
      details: formData.details,
      userResponsible: 'Admin (Simulado)' // Ideally from AuthContext
    };

    const res = await registerAct(payload);
    setLoading(false);

      if (res.success) {
        // Automação: se for Junta de Saúde -> Permanente, cria logo a Reserva/Reforma Compulsiva
        if (formData.actType === 'Junta de Saúde' && formData.details.tipoCondicao === 'Permanente') {
          const careerName = orgData?.data?.careers?.find(c => c.id === emp.careerId)?.name || '';
          const isTecnico = careerName.toLowerCase().includes('quadro t');
          const compulsiveActType = isTecnico ? 'Reforma' : 'Reserva';
          
          await registerAct({
            employeeId: emp.id,
            actType: compulsiveActType,
            actDate: formData.actDate,
            despacho: formData.despacho || 'Automático (Junta Médica)',
            br: formData.br || 'Pendente',
            details: {
              subType: 'Compulsiva (Doença/Inaptidão)',
              ataMedica: formData.details.ata || 'Desconhecido'
            },
            userResponsible: 'Sistema (Automático)'
          });
        }

        // Sincronização com Módulos Externos (Barra Lateral)
        const type = formData.actType;
        
        if (['Férias', 'Licença'].includes(type)) {
          await addVacation({
            employeeId: emp.id, employeeNip: emp.nip, employeeName: emp.name,
            year: new Date(formData.actDate).getFullYear().toString(),
            type: type, startDate: formData.actDate, endDate: formData.actDate, daysCount: type === 'Férias' ? 30 : 0,
            notes: `Despacho: ${formData.despacho || 'N/A'}. Criado via Registo de Acto.`,
            createdBy: 'Sistema'
          });
        }

        if (['Transferência', 'Destacamento', 'Reafectação', 'Comissão de Serviço'].includes(type)) {
          await requestTransfer({
            employeeId: emp.id, employeeNip: emp.nip, employeeName: emp.name,
            type: type,
            fromDirectorateId: emp.directorateId, fromDepartmentId: emp.departmentId,
            toDirectorateId: formData.details.newDirectorateId || '',
            reason: `Despacho: ${formData.despacho || 'N/A'}. Criado via Registo de Acto.`
          });
        }

        if (['Advertência', 'Repreensão', 'Multa', 'Suspensão', 'Demissão', 'Expulsão'].includes(type)) {
          await addProcess({
            employeeId: emp.id, employeeNip: emp.nip, employeeName: emp.name,
            type: type, status: 'Concluído',
            date: formData.actDate,
            description: `Sanção aplicada via Despacho: ${formData.despacho || 'N/A'}.`
          });
        }

        if (isPendingAct) {
        setConfirmModal({
          isOpen: true,
          title: 'Sucesso',
          message: 'O acto foi registado como Pendente e aguarda aprovação de um Super Administrador.',
          hideCancel: true,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            if (onActRegistered) onActRegistered();
            onClose();
          }
        });
      } else {
        if (onActRegistered) onActRegistered();
        onClose();
      }
    } else {
      setError(res.error || 'Erro ao registar acto.');
    }
  };

  const renderDetailsFields = () => {
    const { actType } = formData;
    if (!actType) return null;

    if (actType === 'Promoção') {
      return (
        <div style={styles.formGroup}>
          <label style={styles.label}>Nova Categoria (na mesma carreira)</label>
          <select 
            style={styles.input} 
            value={formData.details.newCategoryId || ''} 
            onChange={e => handleDetailsChange('newCategoryId', e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {orgData.data.categories
              .filter(c => c.career_id === emp.careerId)
              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
        </div>
      );
    }

    if (actType === 'Mudança de Carreira') {
      const validLevels = ['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação', 'Nível Superior'];
      const hasValidLevel = validLevels.includes(emp.academicLevel);
      
      const categoryName = orgData?.data?.categories?.find(c => c.id === emp.categoryId)?.name || '';
      const careerName = orgData?.data?.careers?.find(c => c.id === emp.careerId)?.name || '';
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
      const isEligibleForMudanca = isQuadroTecnicoComum || isAllowedSpecificCategory;

      if (!isEligibleForMudanca) {
        return (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', border: '1px solid #fecaca' }}>
            <strong>Bloqueado:</strong> O funcionário não é elegível para Mudança de Carreira. A sua categoria atual (<strong>{categoryName}</strong>) já corresponde a um nível superior ou não faz parte das categorias de base permitidas.
          </div>
        );
      }

      return (
        <>
          {!hasValidLevel ? (
            <div style={{ backgroundColor: '#fffbeb', color: '#b45309', padding: '12px', borderRadius: '6px', marginBottom: '15px', fontSize: '13px', border: '1px solid #fde68a' }}>
              <strong>Aviso:</strong> O funcionário não possui o Nível Superior averbado. Preencha o <strong>Nº do Despacho</strong> e anexe o <strong>Certificado</strong> abaixo para torná-lo elegível para a Mudança de Carreira. Depois, será redirecionado para a aba "Funcionários Elegíveis".
            </div>
          ) : (
            <>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nova Carreira</label>
                <select 
                  style={styles.input} 
                  value={formData.details.newCareerId || ''} 
                  onChange={e => {
                    handleDetailsChange('newCareerId', e.target.value);
                    handleDetailsChange('newCategoryId', ''); // Reset category
                  }}
                  required
                >
                  <option value="">Selecione...</option>
                  {orgData.data.careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nova Categoria</label>
                <select 
                  style={styles.input} 
                  value={formData.details.newCategoryId || ''} 
                  onChange={e => handleDetailsChange('newCategoryId', e.target.value)}
                  required
                  disabled={!formData.details.newCareerId}
                >
                  <option value="">Selecione...</option>
                  {orgData.data.categories
                    .filter(c => c.career_id === formData.details.newCareerId)
                    .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                  }
                </select>
              </div>
            </>
          )}
        </>
      );
    }

    if (actType === 'Progressão') {
      return (
        <>
          <div style={styles.formGroup}>
            <label style={styles.label}>Novo Escalão</label>
            <input 
              style={{...styles.input, backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed'}} 
              type="text" 
              value={formData.details.newEscalao || ''}
              readOnly
            />
          </div>
        </>
      );
    }

    if (['Nomeação', 'Cessação de Funções', 'Alteração de Cargo'].includes(actType)) {
      return (
        <div style={styles.formGroup}>
          <label style={styles.label}>Novo Cargo</label>
          <input 
            style={styles.input} type="text" placeholder="Ex: Chefe de Repartição"
            value={formData.details.newCargo || ''}
            onChange={e => handleDetailsChange('newCargo', e.target.value)}
            required
          />
        </div>
      );
    }

    if (['Transferência', 'Destacamento', 'Reafectação'].includes(actType)) {
      return (
        <div style={styles.formGroup}>
          <label style={styles.label}>Nova Direcção</label>
          <select 
            style={styles.input} 
            value={formData.details.newDirectorateId || ''} 
            onChange={e => handleDetailsChange('newDirectorateId', e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {orgData.data.directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      );
    }

    if (['Óbito'].includes(actType)) {
      return (
        <div style={styles.formGroup}>
          <label style={styles.label}>Nº da Certidão de Óbito</label>
          <input 
            style={styles.input} type="text" 
            value={formData.details.certidao || ''}
            onChange={e => handleDetailsChange('certidao', e.target.value)}
          />
        </div>
      );
    }

    if (['Reserva', 'Reforma'].includes(actType)) {
      return (
        <>
          <div style={styles.formGroup}>
            <label style={styles.label}>Critério de Passagem</label>
            <select 
              style={styles.input} 
              value={formData.details.subType || ''} 
              onChange={e => handleDetailsChange('subType', e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              <option value="Por Limite de Idade">Por Limite de Idade</option>
              <option value="Por Tempo de Serviço (35 Anos)">Por Tempo de Serviço (35 Anos)</option>
              <option value="Compulsiva (Doença/Inaptidão)">Compulsiva (Doença/Inaptidão)</option>
            </select>
          </div>
          {formData.details.subType === 'Compulsiva (Doença/Inaptidão)' && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Nº da Ata da Junta Médica</label>
              <input 
                style={styles.input} type="text" 
                value={formData.details.ataMedica || ''}
                onChange={e => handleDetailsChange('ataMedica', e.target.value)}
                required
              />
            </div>
          )}
        </>
      );
    }

    if (['Junta de Saúde'].includes(actType)) {
      return (
        <>
          <div style={styles.formGroup}>
            <label style={styles.label}>Tipo de Doença/Incapacidade</label>
            <select 
              style={styles.input}
              value={formData.details.tipoCondicao || 'Temporária'}
              onChange={e => handleDetailsChange('tipoCondicao', e.target.value)}
            >
              <option value="Temporária">Baixa Temporária</option>
              <option value="Permanente">Incapacidade Permanente (Junta Médica)</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Data de Início da Baixa</label>
            <input 
              style={styles.input} type="date" 
              value={formData.details.dataInicio || ''}
              onChange={e => handleDetailsChange('dataInicio', e.target.value)}
              required
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Parecer / Motivo</label>
            <textarea 
              style={styles.textarea}
              value={formData.details.motivo || ''}
              onChange={e => handleDetailsChange('motivo', e.target.value)}
              placeholder="Descreva a razão..."
              required
            />
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <SystemModal
      isOpen={true}
      title={formData.actType ? `Registar ${formData.actType}` : 'Registar Acto Administrativo'}
      onClose={onClose}
      width="600px"
      footer={
        <>
          <button type="button" onClick={onClose} style={styles.cancelBtn}>Cancelar</button>
          <button 
            type="button" 
            onClick={handleSubmit}
            style={styles.submitBtn} 
            disabled={
              loading || 
              !formData.actType || 
              (formData.actType === 'Mudança de Carreira' && 
                !(
                  (orgData?.data?.careers?.find(c => c.id === emp.careerId)?.name || '').toLowerCase().includes('quadro t') || 
                  ['técnico de papiloscopia', 'técnico da técnica criminalística', 'agente de investigação e instrução criminal', 'agente de investigação operativa'].some(prefix => (orgData?.data?.categories?.find(c => c.id === emp.categoryId)?.name || '').toLowerCase().includes(prefix))
                )
              )
            }
          >
            {loading 
              ? 'A Registar...' 
              : (formData.actType === 'Mudança de Carreira' && !['Licenciatura', 'Mestrado', 'Doutoramento', 'Pós-Graduação', 'Nível Superior'].includes(emp.academicLevel))
                ? 'Tornar Elegível e Prosseguir'
                : (formData.actType === 'Promoção' || formData.actType === 'Progressão' ? 'Registar (Ficará Pendente)' : 'Registar Acto e Atualizar Histórico')}
          </button>
        </>
      }
    >
      <div style={styles.empSummary}>
        <strong>Funcionário:</strong> {emp.name} ({emp.nip})<br/>
        <strong>Situação Atual:</strong> {emp.status || 'Ativo'}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <div style={styles.formGroup}>
        <label style={styles.label}>Tipo de Acto *</label>
        <CustomSelect
          value={formData.actType}
          onChange={(value) => { setFormData({ ...formData, actType: value, details: {} }); }}
          groups={dynamicGroups.map(g => ({ group: g.label, acts: g.types }))}
          placeholder="-- Selecione o Acto --"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Data do Acto *</label>
          <input 
            style={styles.input} type="date" required
            value={formData.actDate}
            onChange={e => setFormData({ ...formData, actDate: e.target.value })}
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nº do Despacho</label>
          <input 
            style={styles.input} type="text" 
            value={formData.despacho}
            onChange={e => setFormData({ ...formData, despacho: e.target.value })}
          />
        </div>
      </div>

      {renderDetailsFields()}

      <div style={styles.formGroup}>
        <label style={styles.label}>
          Documento Comprovativo (PDF ou Imagem)
          <span style={{color: '#6b7280', fontWeight: 'normal', fontSize: '11px', marginLeft: '5px'}}>
            (Pode anexar agora ou depois no Histórico antes de Confirmar)
          </span>
        </label>
        <input 
          style={styles.input} type="file" accept=".pdf,image/*"
          onChange={handleFileUpload}
        />
        {formData.details.documentB64 && (
          <div style={{ fontSize: '12px', color: 'var(--color-success)', marginTop: '4px' }}>
            ✓ Documento anexado com sucesso.
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        hideCancel={confirmModal.hideCancel}
        confirmText="OK"
      />
    </SystemModal>
  );
}

const styles = {
  empSummary: {
    padding: '12px', backgroundColor: 'rgba(27, 54, 93, 0.05)',
    borderRadius: '8px', marginBottom: '20px', fontSize: '14px', borderLeft: '4px solid var(--color-primary)'
  },
  formGroup: { marginBottom: '15px' },
  label: { display: 'block', marginBottom: '5px', fontSize: '13px', fontWeight: 'bold', color: '#4a5568' },
  input: { width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '10px', border: '1px solid #cbd5e0', borderRadius: '4px', fontSize: '14px', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical' },
  errorBanner: {
    padding: '10px', backgroundColor: 'var(--color-danger)', color: 'white',
    borderRadius: '6px', marginBottom: '16px', fontSize: '14px'
  },
  cancelBtn: {
    padding: '10px 16px', borderRadius: '6px', border: '1px solid var(--color-border)',
    background: 'transparent', color: 'var(--color-text-base)', cursor: 'pointer', fontWeight: '500'
  },
  submitBtn: {
    padding: '10px 16px', borderRadius: '6px', border: 'none',
    backgroundColor: 'var(--color-primary)', color: 'white', cursor: 'pointer', fontWeight: '500'
  }
};
