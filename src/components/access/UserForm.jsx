import React, { useState, useEffect } from 'react';
import useAuthData from '../../hooks/useAuthData';
import useOrgData from '../../hooks/useOrgData';
import useSecuritySettings from '../../hooks/useSecuritySettings';
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
  const { data: orgData } = useOrgData();
  const { validatePassword } = useSecuritySettings();

  const [formData, setFormData] = useState({
    name: '', username: '', email: '', contact: '',
    password: '', confirmPassword: '',
    roleId: '', delegatedRoleId: '', delegationStartDate: '', delegationEndDate: '', status: 'Ativo', forcePasswordChange: true,
    directorateId: '', departmentId: '', divisionId: '', sectionId: '', photo: ''
  });

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '' });
  const showModal = (title, message) => setModalConfig({ isOpen: true, title, message });
  const closeModal = () => setModalConfig({ ...modalConfig, isOpen: false });

  useEffect(() => {
    if (initialData) {
      setFormData({ ...formData, ...initialData, confirmPassword: initialData.password || '' });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        {/* Identificação */}
        <h4 style={styles.sectionTitle}>Identificação</h4>
        
        <div style={{...styles.formGroup, gridRow: 'span 2'}}>
          <label style={styles.label}>Fotografia</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {formData.photo ? <img src={formData.photo} alt="Preview" style={styles.photoPreview} /> : <div style={{...styles.photoPreview, backgroundColor: '#eee'}}></div>}
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Nome Completo *</label>
          <input required style={styles.input} name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Email Institucional *</label>
          <input required type="email" style={styles.input} name="email" value={formData.email} onChange={handleChange} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Contacto</label>
          <input style={styles.input} name="contact" value={formData.contact} onChange={handleChange} />
        </div>

        {/* Credenciais e Acesso */}
        <h4 style={styles.sectionTitle}>Credenciais e Acesso</h4>
        <div style={styles.formGroup}>
          <label style={styles.label}>Username *</label>
          <input required style={styles.input} name="username" value={formData.username} onChange={handleChange} disabled={!!initialData} />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Perfil de Acesso (Role) *</label>
          <select required style={styles.select} name="roleId" value={formData.roleId} onChange={handleChange}>
            <option value="">Selecione um perfil...</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Estado da Conta</label>
          <select style={styles.select} name="status" value={formData.status} onChange={handleChange}>
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
              <label style={styles.label}>Palavra-passe * <button type="button" onClick={generatePassword} style={{marginLeft: '10px', fontSize: '11px', cursor: 'pointer'}}>Gerar Aleatória</button></label>
              <input required type="text" style={styles.input} name="password" value={formData.password} onChange={handleChange} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Confirmar Palavra-passe *</label>
              <input required type="text" style={styles.input} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
            </div>
          </>
        )}

        {/* Delegação de Poderes */}
        <h4 style={styles.sectionTitle}>Delegação de Poderes (Substituição Temporária)</h4>
        <div style={styles.formGroup}>
          <label style={styles.label}>Perfil Delegado (Substituição)</label>
          <select style={styles.select} name="delegatedRoleId" value={formData.delegatedRoleId} onChange={handleChange}>
            <option value="">Nenhuma Delegação</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}></div> {/* Espaçador */}
        {formData.delegatedRoleId && (
          <>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Início da Delegação</label>
              <input type="date" style={styles.input} name="delegationStartDate" value={formData.delegationStartDate} onChange={(e) => {
                handleChange(e);
                // Auto-calcular 35 dias se end_date estiver vazio
                if (e.target.value && !formData.delegationEndDate) {
                   const start = new Date(e.target.value);
                   start.setDate(start.getDate() + 35);
                   setFormData(prev => ({ ...prev, delegationStartDate: e.target.value, delegationEndDate: start.toISOString().split('T')[0] }));
                }
              }} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Data de Fim da Delegação</label>
              <input type="date" style={styles.input} name="delegationEndDate" value={formData.delegationEndDate} onChange={handleChange} />
            </div>
          </>
        )}

        {/* Estrutura Organizacional */}
        <h4 style={styles.sectionTitle}>Estrutura Organizacional (Opcional - para Restrições de Visibilidade)</h4>
        <div style={styles.formGroup}>
          <label style={styles.label}>Direcção</label>
          <select style={styles.select} name="directorateId" value={formData.directorateId} onChange={handleChange}>
            <option value="">(Nenhuma)</option>
            {orgData?.directorates?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Departamento</label>
          <select style={styles.select} name="departmentId" value={formData.departmentId} onChange={handleChange}>
            <option value="">(Nenhum)</option>
            {orgData?.departments?.filter(d => !formData.directorateId || d.directorateId === formData.directorateId).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
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
