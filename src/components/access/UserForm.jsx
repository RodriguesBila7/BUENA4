import React, { useState, useEffect } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useEmployeeData from '../../hooks/useEmployeeData';
import useOrgData from '../../hooks/useOrgData';
import useSecuritySettings from '../../hooks/useSecuritySettings';
import { useAuth } from '../../contexts/AuthContext';
import { isCentralUser, formatProvincialRoleName } from '../../utils/scopeUtils';
import ConfirmModal from '../ConfirmModal';

const styles = {
  container: { padding: '20px', backgroundColor: 'var(--color-bg-base)', borderRadius: '8px', border: '1px solid var(--color-border)' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: { fontSize: '13px', fontWeight: 'bold', color: 'var(--color-text-main)' },
  input: { padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  select: { padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)' },
  btnRow: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' },
  btnPrimary: { backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' },
  btnSecondary: { backgroundColor: 'transparent', color: 'var(--color-text-main)', border: '1px solid var(--color-border)', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' },
  photoPreview: { width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--color-border)' },
  sectionTitle: { gridColumn: '1 / -1', fontSize: '15px', borderBottom: '1px solid var(--color-border)', paddingBottom: '5px', marginBottom: '10px', color: 'var(--color-primary)' }
};

export default function UserForm({ initialData, onSave, onCancel }) {
  const { roles } = useAuthData();
  const { employees } = useEmployeeData();
  const { data: orgData } = useOrgData();
  const { user: currentUser } = useAuth();
  const { validatePassword } = useSecuritySettings();

  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [formData, setFormData] = useState({
    name: '', username: '', nuit: '', email: '', contact: '',
    password: '', confirmPassword: '',
    roleId: '', delegatedRoleId: '', delegationStartDate: '', delegationEndDate: '', status: 'Ativo', forcePasswordChange: true,
    directorateId: (!isCentralUser(currentUser) && currentUser?.directorateId) ? currentUser.directorateId : '', departmentId: '', divisionId: '', sectionId: '', photo: ''
  });

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showModal = (title, message) => setModalConfig({ isOpen: true, title, message });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData, confirmPassword: initialData.password || '' });
    } else if (!isCentralUser(currentUser) && currentUser?.directorateId) {
      setFormData(prev => ({ ...prev, directorateId: currentUser.directorateId }));
    }
  }, [initialData, currentUser]);

  const handleSelectEmployee = (empId) => {
    setSelectedEmpId(empId);
    if (!empId) return;
    const emp = (employees || []).find(e => String(e.id) === String(empId));
    if (emp) {
      const nuitVal = emp.nuit || emp.nip || '';
      setFormData(prev => ({
        ...prev,
        name: emp.name || prev.name,
        nuit: nuitVal || prev.nuit,
        username: nuitVal || prev.username,
        email: emp.email || prev.email || (nuitVal ? `${nuitVal}@sernic.gov.mz` : prev.email),
        contact: emp.phone || emp.contacto || prev.contact,
        directorateId: emp.directorateId || prev.directorateId,
        departmentId: emp.departmentId || prev.departmentId,
        photo: emp.photo || prev.photo
      }));
    }
  };

  // Filtrar perfis principais disponíveis
  const availablePrimaryRoles = roles.filter(r => {
    if (!isCentralUser(currentUser)) {
      // Administradores provinciais não podem criar Super Admins Centrais
      const isCentralRole = ['super_admin_1', 'admin_1', 'admin_2'].includes(r.id);
      if (isCentralRole) return false;
    }
    return true;
  });

  // Identificar se o perfil principal selecionado é "Administrador" (4º Nível)
  const selectedPrimaryRole = roles.find(r => r.id === formData.roleId);
  const isPrimaryRoleAdmin = selectedPrimaryRole && (
    formData.roleId === 'usuario_admin' || 
    formData.roleId === 'admin_3' || 
    formData.roleId === 'admin' ||
    (selectedPrimaryRole.name.toLowerCase().includes('administrador') && !selectedPrimaryRole.name.toLowerCase().includes('super') && !selectedPrimaryRole.name.toLowerCase().includes('principal'))
  );

  // Filtrar perfis secundários/delegados disponíveis
  const availableDelegatedRoles = availablePrimaryRoles.filter(r => {
    // 1. Não permitir selecionar o próprio perfil principal como secundário
    if (r.id === formData.roleId) return false;

    // 2. Se o perfil principal for Administrador, NÃO permitir selecionar o perfil 'Usuário' (5º Nível) como secundário
    if (isPrimaryRoleAdmin) {
      const isUsuarioRole = (
        r.id === 'usuario_normal' || 
        r.id === 'usuario' || 
        r.name.toLowerCase().includes('usuário') || 
        r.name.toLowerCase().includes('usuario')
      );
      if (isUsuarioRole) return false;
    }

    return true;
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const nextData = { ...prev, [name]: type === 'checkbox' ? checked : value };
      
      // Se alterar o perfil principal para Administrador e o perfil secundário for Usuário, limpar o perfil secundário
      if (name === 'roleId') {
        const nextRole = roles.find(r => r.id === value);
        const nextIsAdmin = nextRole && (
          value === 'usuario_admin' || value === 'admin_3' || value === 'admin' ||
          (nextRole.name.toLowerCase().includes('administrador') && !nextRole.name.toLowerCase().includes('super') && !nextRole.name.toLowerCase().includes('principal'))
        );
        if (nextIsAdmin && prev.delegatedRoleId) {
          const delegatedRole = roles.find(r => r.id === prev.delegatedRoleId);
          const isDelegatedUsuario = delegatedRole && (
            prev.delegatedRoleId === 'usuario_normal' || 
            prev.delegatedRoleId === 'usuario' || 
            delegatedRole.name.toLowerCase().includes('usuário') || 
            delegatedRole.name.toLowerCase().includes('usuario')
          );
          if (isDelegatedUsuario) {
            nextData.delegatedRoleId = '';
            nextData.delegationStartDate = '';
            nextData.delegationEndDate = '';
          }
        }
      }
      return nextData;
    });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, photo: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      showModal('Campo Obrigatório', 'Por favor, preencha o Nome Completo.');
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      showModal('Campo Obrigatório', 'Por favor, preencha o Email Institucional.');
      return;
    }
    if (!formData.contact || !formData.contact.trim()) {
      showModal('Campo Obrigatório', 'Por favor, preencha o Contacto.');
      return;
    }
    if (!formData.username || !formData.username.trim()) {
      showModal('Campo Obrigatório', 'Por favor, preencha o Username.');
      return;
    }
    if (!formData.roleId) {
      showModal('Campo Obrigatório', 'Por favor, selecione o Perfil de Acesso (Role).');
      return;
    }
    if (!formData.directorateId) {
      showModal('Campo Obrigatório', 'Por favor, selecione a Direcção.');
      return;
    }
    if (!formData.departmentId) {
      showModal('Campo Obrigatório', 'Por favor, selecione o Departamento.');
      return;
    }

    if (!initialData) {
      if (formData.password !== formData.confirmPassword) {
        showModal('Erro', 'As senhas não coincidem!');
        return;
      }
      const pwdCheck = validatePassword(formData.password);
      if (!pwdCheck.isValid) {
        showModal('Erro de Segurança', "A palavra-passe não cumpre as políticas de segurança:\n" + pwdCheck.errors.join("\n"));
        return;
      }
    }
    // Remove confirmPassword before saving
    const { confirmPassword, ...saveData } = formData;

    if (saveData.delegatedRoleId) {
      if (!isCentralUser(currentUser)) {
        saveData.delegationStatus = 'Pendente';
        saveData.delegationRequestedBy = currentUser?.name || 'Administrador Provincial';
      } else {
        saveData.delegationStatus = 'Aprovado';
        saveData.delegationApprovedBy = currentUser?.name || 'Perfil Superior Central';
      }
    } else {
      saveData.delegationStatus = 'Aprovado';
    }

    onSave(saveData);
  };

  const generatePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "";
    for(let i=0; i<12; i++) pass += chars.charAt(Math.floor(Math.random() * chars.length));
    setFormData(prev => ({ ...prev, password: pass, confirmPassword: pass }));
  };

  return (
    <form onSubmit={handleSubmit} style={styles.container}>
      <h3 style={{ marginTop: 0 }}>{initialData ? 'Editar Utilizador' : 'Novo Utilizador'}</h3>
      
      <div style={styles.formGrid}>
        {/* Vínculo de Funcionário */}
        {!initialData && (
          <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--color-bg-card)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '10px' }}>
            <label style={{ ...styles.label, color: 'var(--color-primary)', display: 'block', marginBottom: '8px', fontSize: '13px' }}>
              💡 Seleccionar Funcionário Cadastrado (Preenchimento Automático por NUIT)
            </label>
            <select
              style={{ ...styles.select, width: '100%', fontWeight: 'bold', cursor: 'pointer' }}
              value={selectedEmpId}
              onChange={(e) => handleSelectEmployee(e.target.value)}
            >
              <option value="">-- Seleccionar Funcionário Cadastrado (Opcional) --</option>
              {(employees || []).map(emp => (
                <option key={emp.id} value={emp.id}>
                  [NUIT: {emp.nuit || emp.nip || 'N/A'}] {emp.name} ({emp.cargo || 'Funcionário'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Identificação */}
        <h4 style={styles.sectionTitle}>Identificação por NUIT</h4>
        
        <div style={{...styles.formGroup, gridRow: 'span 2'}}>
          <label style={styles.label}>Fotografia</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {formData.photo ? <img src={formData.photo} alt="Preview" style={styles.photoPreview} /> : <div style={{...styles.photoPreview, backgroundColor: '#eee'}}></div>}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>NUIT (Identificação Única) <span style={{ color: '#e53e3e' }}>*</span></label>
          <input
            required
            style={styles.input}
            name="nuit"
            value={formData.nuit || ''}
            onChange={(e) => {
              handleChange(e);
              // Auto-preencher username com NUIT se for uma nova conta e username estiver igual ao NUIT antigo
              if (!initialData && (!formData.username || formData.username === formData.nuit)) {
                setFormData(prev => ({ ...prev, nuit: e.target.value, username: e.target.value }));
              }
            }}
            placeholder="Digite o NUIT (ex: 102938475)..."
          />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Nome Completo (Localizador) <span style={{ color: '#e53e3e' }}>*</span></label>
          <input required style={styles.input} name="name" value={formData.name} onChange={handleChange} placeholder="Digite o nome completo..." />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email Institucional <span style={{ color: '#e53e3e' }}>*</span></label>
          <input required type="email" style={styles.input} name="email" value={formData.email} onChange={handleChange} placeholder="exemplo@sernic.gov.mz..." />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Contacto <span style={{ color: '#e53e3e' }}>*</span></label>
          <input required style={styles.input} name="contact" value={formData.contact} onChange={handleChange} placeholder="+258 8X XXX XXXX..." />
        </div>

        {/* Credenciais e Acesso */}
        <h4 style={styles.sectionTitle}>Credenciais e Acesso (Login por NUIT)</h4>
        <div style={styles.formGroup}>
          <label style={styles.label}>Username / NUIT de Login <span style={{ color: '#e53e3e' }}>*</span></label>
          <input required style={styles.input} name="username" value={formData.username} onChange={handleChange} disabled={!!initialData} placeholder="NUIT ou Username de acesso..." />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Perfil de Acesso (Role) <span style={{ color: '#e53e3e' }}>*</span></label>
          <select required style={styles.select} name="roleId" value={formData.roleId} onChange={handleChange}>
            <option value="">Selecione um perfil...</option>
            {availablePrimaryRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Estado da Conta <span style={{ color: '#e53e3e' }}>*</span></label>
          <select required style={styles.select} name="status" value={formData.status} onChange={handleChange}>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
            <option value="Bloqueada">Bloqueada</option>
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}><input type="checkbox" name="forcePasswordChange" checked={formData.forcePasswordChange} onChange={handleChange} /> Forçar alteração de password no 1º acesso</label>
        </div>

        {!initialData && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Palavra-passe <span style={{ color: '#e53e3e' }}>*</span> <button type="button" onClick={generatePassword} style={{marginLeft: '10px', fontSize: '11px', cursor: 'pointer'}}>Gerar Aleatória</button></label>
              <input required type="text" style={styles.input} name="password" value={formData.password} onChange={handleChange} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirmar Palavra-passe <span style={{ color: '#e53e3e' }}>*</span></label>
              <input required type="text" style={styles.input} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
            </div>
          </>
        )}

        {/* Delegação de Poderes / Perfil Secundário */}
        <h4 style={styles.sectionTitle}>Delegação de Poderes e Perfil Secundário (Substituição Temporária de Adjuntos)</h4>
        
        {isPrimaryRoleAdmin ? (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px dashed rgba(239, 68, 68, 0.4)',
            borderRadius: '8px',
            padding: '14px',
            fontSize: '12px',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '20px' }}>⛔</span>
            <div>
              <strong>Regra Institucional Imutável SERNIC:</strong> O perfil de <strong>Administrador Provincial</strong> é o titular efetivo da direcção e <u>não pode receber perfil delegado</u>. Apenas contas com perfil principal de <strong>Usuário (5º Nível - Adjunto)</strong> podem ter perfil delegado (substituição temporária) atribuído pelo Administrador e sujeito à conformidade dos perfis superiores.
            </div>
          </div>
        ) : (
          <>
            <p style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--color-text-muted)', margin: '-5px 0 10px 0' }}>
              ℹ️ Permite ao Administrador Provincial atribuir um Perfil Secundário a um Usuário (5º Nível - Adjunto) para assumir temporariamente as competências de Administrador durante licenças ou ausências operacionais, sujeito à conformidade dos Perfis Superiores.
            </p>
            <div style={styles.formGroup}>
              <label style={styles.label}>Perfil Secundário / Delegado (Substituição)</label>
              <select style={styles.select} name="delegatedRoleId" value={formData.delegatedRoleId} onChange={handleChange}>
                <option value="">Nenhum Perfil Secundário</option>
                {availableDelegatedRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}></div> {/* Espaçador */}
            {formData.delegatedRoleId && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Início da Delegação <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input required type="date" style={styles.input} name="delegationStartDate" value={formData.delegationStartDate} onChange={(e) => {
                    handleChange(e);
                    if (e.target.value && !formData.delegationEndDate) {
                       const start = new Date(e.target.value);
                       start.setDate(start.getDate() + 35);
                       setFormData(prev => ({ ...prev, delegationStartDate: e.target.value, delegationEndDate: start.toISOString().split('T')[0] }));
                    }
                  }} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Data de Fim da Delegação <span style={{ color: '#e53e3e' }}>*</span></label>
                  <input required type="date" style={styles.input} name="delegationEndDate" value={formData.delegationEndDate} onChange={handleChange} />
                </div>
              </>
            )}
          </>
        )}

        {/* Estrutura Organizacional */}
        <h4 style={styles.sectionTitle}>Estrutura Organizacional <span style={{ color: '#e53e3e' }}>*</span></h4>
        <div style={styles.formGroup}>
          <label style={styles.label}>Direcção <span style={{ color: '#e53e3e' }}>*</span></label>
          <select required style={styles.select} name="directorateId" value={formData.directorateId} onChange={handleChange}>
            <option value="">Selecione a Direcção...</option>
            {orgData?.directorates?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Departamento <span style={{ color: '#e53e3e' }}>*</span></label>
          <select required style={styles.select} name="departmentId" value={formData.departmentId} onChange={handleChange}>
            <option value="">Selecione o Departamento...</option>
            {orgData?.departments?.filter(d => !formData.directorateId || d.directorateId === formData.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        {formData.roleId && formData.directorateId && (
          <div style={{
            gridColumn: '1 / -1',
            backgroundColor: 'rgba(27, 54, 93, 0.04)',
            border: '1.5px solid var(--color-primary)',
            borderRadius: '8px',
            padding: '16px',
            marginTop: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏛️ Designação Oficial do Perfil a Gerar (Distribuição por Província):
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 'bold',
                padding: '4px 14px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-primary)',
                color: '#fff',
                letterSpacing: '0.5px'
              }}>
                {formatProvincialRoleName((roles.find(r => r.id === formData.roleId)?.name || ''), formData.directorateId, orgData)}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: 'var(--color-text-main)', marginTop: '4px' }}>
              <div>
                <strong>📍 Direcção Atribuída:</strong> {(orgData?.directorates || []).find(d => String(d.id) === String(formData.directorateId))?.name || 'N/A'}
              </div>
              <div>
                <strong>🔐 Escopo de Acesso:</strong> {!isCentralUser({ roleId: formData.roleId, directorateId: formData.directorateId }) ? 'Visibilidade Local Provincial (10 Módulos Autorizados)' : 'Acesso Global Nacional (Central)'}
              </div>
            </div>

            {/* Guia Rápido de Siglas SERNIC */}
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', marginTop: '4px' }}>
              <strong>💡 Distribuição Oficial de Siglas SERNIC:</strong> NPL (Nampula) | GZ (Gaza) | IBN (Inhambane) | CM (Cidade de Maputo) | MP (Maputo Província) | SFL (Sofala) | MN (Manica) | TT (Tete) | ZBZ (Zambézia) | NS (Niassa) | CD (Cabo Delgado)
            </div>
          </div>
        )}
      </div>

      <div style={styles.btnRow}>
        <button type="button" style={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
        <button type="submit" style={styles.btnPrimary}>Guardar Utilizador</button>
      </div>

      <ConfirmModal 
        isOpen={modalConfig.isOpen} 
        title={modalConfig.title}
        message={modalConfig.message}
        hideCancel={true}
        onConfirm={closeModal}
      />
    </form>
  );
}
