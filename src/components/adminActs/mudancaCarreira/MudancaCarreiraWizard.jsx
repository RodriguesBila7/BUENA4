import React, { useState, useEffect } from 'react';
import useOrgData from '../../../hooks/useOrgData';
import SystemModal from '../../common/SystemModal';

export default function MudancaCarreiraWizard({ employee, onClose, onComplete }) {
  const { data: orgData } = useOrgData();
  const [despacho, setDespacho] = useState('');
  const [dataActo, setDataActo] = useState(new Date().toISOString().split('T')[0]);
  const [fileBase64, setFileBase64] = useState('');
  const [formacaoArea, setFormacaoArea] = useState('');
  
  const [error, setError] = useState('');
  const [targetCategory, setTargetCategory] = useState(null);
  const [targetCareer, setTargetCareer] = useState(null);
  const [level, setLevel] = useState('');
  const [escalao, setEscalao] = useState('');
  // Automatically determine target based on rules
  useEffect(() => {
    if (!orgData || !employee) return;
    
    const catName = (orgData.categories?.find(c => c.id === employee.categoryId)?.name || '').toLowerCase();
    const carName = (orgData.careers?.find(c => c.id === employee.careerId)?.name || '').toLowerCase();

    let newCatStr = '';
    let newCarStr = '';
    let newLevel = '';
    let newEscalao = '';

    if (catName.includes('técnico da técnica criminalística')) {
      newCatStr = 'Perito da Técnica Criminalística de 2ª';
      newCarStr = 'Investigação Criminal';
      newLevel = '14';
      newEscalao = 'C';
    } else if (catName.includes('técnico de papiloscopia')) {
      newCatStr = 'Perito de Papiloscopia de 2ª';
      newCarStr = 'Investigação Criminal';
      newLevel = '14';
      newEscalao = 'C';
    } else if (catName.includes('agente de investigação e instrução criminal')) {
      newCatStr = 'Subinspector de Investigação e Instrução Criminal de 2ª';
      newCarStr = 'Investigação Criminal';
      newLevel = '14';
      newEscalao = 'C';
    } else if (catName.includes('agente de investigação operativa')) {
      newCatStr = 'Subinspector de Investigação Operativa de 2ª';
      newCarStr = 'Investigação Criminal';
      newLevel = '14';
      newEscalao = 'C';
    } else if (carName.includes('quadro t')) {
      newCarStr = 'Quadro Técnico Comum';
      newLevel = '11';
      newEscalao = 'C';
      if (formacaoArea === 'Administração Pública') {
        newCatStr = 'Técnico Superior de Administração Pública N1';
      } else {
        newCatStr = 'Técnico Superior N1';
      }
    }

    const normalizeStr = (str) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/ª/g, 'a')
        .replace(/º/g, 'o')
        .replace(/\s+/g, ' ') // normalize spaces
        .trim();
    };

    if (newCatStr) {
      // Find in orgData using robust normalized matching
      const foundCar = orgData.careers?.find(c => normalizeStr(c.name) === normalizeStr(newCarStr));
      const foundCat = orgData.categories?.find(c => normalizeStr(c.name) === normalizeStr(newCatStr));
      
      setTargetCareer(foundCar || { name: newCarStr, notFound: true });
      setTargetCategory(foundCat || { name: newCatStr, notFound: true });
      setLevel(newLevel);
      setEscalao(newEscalao);
    }
  }, [orgData, employee, formacaoArea]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setFileBase64(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleFinalize = async () => {
    if (!despacho) {
      setError('Por favor, informe o número de despacho.');
      return;
    }

    let finalCareerId = targetCareer.id;
    let finalCategoryId = targetCategory.id;

    if (targetCareer?.notFound || targetCategory?.notFound) {
        try {
            if (targetCareer?.notFound) {
                finalCareerId = `car_${Date.now()}`;
                await fetch('/api/org/careers', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: finalCareerId, name: targetCareer.name })
                });
            }

            if (targetCategory?.notFound) {
                finalCategoryId = `cat_${Date.now()}`;
                await fetch('/api/org/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: finalCategoryId, careerId: finalCareerId, name: targetCategory.name })
                });
            }
        } catch(e) {
            setError('Erro ao criar categoria automaticamente. Contacte o administrador.');
            return;
        }
    }

    onComplete({
      despacho,
      dataActo,
      fileBase64,
      newCareerId: finalCareerId,
      newCategoryId: finalCategoryId,
      newCareerName: targetCareer.name,
      newCategoryName: targetCategory.name,
      level,
      escalao
    });
  };

  const carName = (orgData.careers?.find(c => c.id === employee.careerId)?.name || '').toLowerCase();
  const isQTC = carName.includes('quadro t');

  return (
    <SystemModal
      isOpen={true}
      title="Processar Mudança de Carreira"
      onClose={onClose}
      width="500px"
      footer={
        <>
          <button onClick={onClose} style={styles.btnCancel}>Cancelar</button>
          <button onClick={handleFinalize} style={styles.btnSubmit}>Finalizar Mudança</button>
        </>
      }
    >
      <div style={styles.infoBox}>
        <strong>Funcionário:</strong> {employee.name} <br/>
        <strong>Categoria Atual:</strong> {orgData.categories?.find(c => c.id === employee.categoryId)?.name}
      </div>

      {isQTC && (
        <div style={styles.formGroup}>
          <label style={styles.label}>Área de Formação (Quadro Técnico Comum)</label>
          <select 
            style={styles.input} 
            value={formacaoArea} 
            onChange={e => setFormacaoArea(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="Administração Pública">Administração Pública</option>
            <option value="Outra">Outra (Geral)</option>
          </select>
        </div>
      )}

      {targetCategory && (
        <div style={{...styles.infoBox, backgroundColor: '#ebf4ff', border: '1px solid #c3dafe'}}>
          <strong>Mapeamento Automático:</strong><br/>
          Nova Carreira: <span style={{ color: targetCareer?.notFound ? '#805ad5' : 'inherit', fontWeight: targetCareer?.notFound ? 'bold' : 'normal'}}>{targetCareer?.name} {targetCareer?.notFound && '(Será Auto-Criada)'}</span><br/>
          Nova Categoria: <span style={{ color: targetCategory?.notFound ? '#805ad5' : 'inherit', fontWeight: targetCategory?.notFound ? 'bold' : 'normal'}}>{targetCategory?.name} {targetCategory?.notFound && '(Será Auto-Criada)'}</span><br/>
          Nível: {level} | Escalão: {escalao}
        </div>
      )}

      <div style={styles.formGroup}>
        <label style={styles.label}>Número de Despacho *</label>
        <input 
          type="text" 
          style={styles.input} 
          value={despacho} 
          onChange={e => setDespacho(e.target.value)} 
          placeholder="Ex: 123/SERNIC/2026"
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Data do Acto</label>
        <input 
          type="date" 
          style={styles.input} 
          value={dataActo} 
          onChange={e => setDataActo(e.target.value)} 
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Documento Comprovativo (PDF / Imagem)</label>
        <input 
          type="file" 
          style={styles.input} 
          accept=".pdf,image/*" 
          onChange={handleFileChange}
        />
      </div>

      {error && <div style={styles.error}>{error}</div>}
    </SystemModal>
  );
}

const styles = {
  infoBox: {
    backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', 
    border: '1px solid #e2e8f0', fontSize: '14px', marginBottom: '16px', color: '#4a5568'
  },
  formGroup: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '14px', fontWeight: '600', color: '#4a5568', marginBottom: '8px' },
  input: {
    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e0',
    fontSize: '14px', outline: 'none'
  },
  error: { color: '#e53e3e', fontSize: '14px', marginTop: '10px', fontWeight: '500' },
  btnCancel: {
    padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e0',
    backgroundColor: '#fff', color: '#4a5568', cursor: 'pointer', fontWeight: '500'
  },
  btnSubmit: {
    padding: '10px 16px', borderRadius: '8px', border: 'none',
    backgroundColor: 'var(--color-primary, #3182ce)', color: '#fff', cursor: 'pointer', fontWeight: '600'
  }
};
