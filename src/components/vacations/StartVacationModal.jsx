import React, { useState } from 'react';
import useDraggable from '../../hooks/useDraggable';
import { useAuth } from '../../contexts/AuthContext';

export default function StartVacationModal({ request, onClose, onStart }) {
  const { position, onPointerDown } = useDraggable();
  const { user } = useAuth();
  
  const [file, setFile] = useState(null);
  const [fileBase64, setFileBase64] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('O ficheiro excede o limite de 5MB.');
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      setFileBase64(event.target.result);
      setError('');
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    if (!fileBase64) {
      setError('A Guia de Início de Férias é obrigatória.');
      return;
    }
    if (!password) {
      setError('A senha é obrigatória para confirmar esta ação.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Verify password
      const res = await fetch(`/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, password })
      });

      const data = await res.json();
      if (!data.success) {
        setError('Senha incorreta. Não foi possível autorizar o início das férias.');
        setIsVerifying(false);
        return;
      }

      // Password verified, trigger onStart passing the file
      onStart(request.id, fileBase64);
    } catch (err) {
      setError('Erro de conexão ao verificar a senha.');
      setIsVerifying(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{...styles.modal, transform: `translate(${position.x}px, ${position.y}px)`}}>
        <div style={styles.header} onPointerDown={onPointerDown} className="drag-handle">
          <h2 style={styles.title}>Iniciar Férias: {request.employeeName}</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <form onSubmit={handleConfirm} style={styles.body}>
          <div style={styles.infoBox}>
            <strong>Período:</strong> {request.startDate} a {request.endDate} <br />
            <strong>Dias:</strong> {request.daysCount}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.formGroup}>
            <label style={styles.label}>1. Anexar Guia de Início de Férias (PDF ou Imagem) *</label>
            <input 
              type="file" 
              accept=".pdf, image/*" 
              onChange={handleFileChange}
              style={styles.fileInput}
              required
            />
            {file && <span style={styles.fileName}>Ficheiro selecionado: {file.name}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>2. Senha de Autorização *</label>
            <p style={{fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 8px 0'}}>
              Para segurança, confirme a sua senha para assinar digitalmente o início deste gozo de férias.
            </p>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite a sua senha..."
              style={styles.input}
              required
            />
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" style={styles.btnConfirm} disabled={isVerifying}>
              {isVerifying ? 'A verificar...' : 'Validar e Iniciar Férias'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { backgroundColor: 'var(--color-bg-base)', width: '500px', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: { padding: '16px 20px', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'grab' },
  title: { margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--color-text-main)' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-muted)', cursor: 'pointer' },
  body: { padding: '24px' },
  infoBox: { padding: '12px', backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border)', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', color: 'var(--color-text-main)', lineHeight: '1.5' },
  formGroup: { marginBottom: '20px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: 'var(--color-text-main)', marginBottom: '8px' },
  fileInput: { width: '100%', padding: '10px', border: '1px dashed var(--color-primary)', borderRadius: '8px', cursor: 'pointer', backgroundColor: 'rgba(49,130,206,0.02)' },
  fileName: { display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: '500' },
  input: { width: '100%', padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-main)', outline: 'none', fontSize: '14px' },
  error: { padding: '10px', backgroundColor: '#FEE2E2', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', border: '1px solid #FCA5A5' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' },
  btnCancel: { padding: '10px 16px', backgroundColor: 'transparent', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-text-main)', cursor: 'pointer', fontWeight: '500' },
  btnConfirm: { padding: '10px 16px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }
};
