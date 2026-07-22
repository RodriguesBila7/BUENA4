import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function EmployeeImport({ orgData, onBulkAdd, onSuccess }) {
  const { data } = orgData;

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importErrors, setImportErrors] = useState([]);
  const [successReport, setSuccessReport] = useState(null);
  
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(ws, { defval: '' });
        processPreview(rawData);
      } catch (err) {
        setImportErrors(["Falha ao processar o ficheiro. Verifique se é um Excel ou CSV válido."]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processPreview = (rawData) => {
    const errors = [];
    const processed = [];

    rawData.forEach((row, index) => {
      const rowNum = index + 2; // header is 1
      
      // Standardize keys (case insensitive)
      const keys = Object.keys(row);
      const getVal = (possibleKeys) => {
        const key = keys.find(k => possibleKeys.includes(k.toLowerCase().trim()));
        return key ? String(row[key]).trim() : '';
      };

      const nip = getVal(['nip', 'nº mecanográfico', 'nº mecanografico', 'mecanografico']);
      const name = getVal(['nome', 'nome completo']);
      const bi = getVal(['bi', 'nº bi', 'bilhete de identidade']);
      const dob = getVal(['data de nascimento', 'nascimento', 'data nascimento']);
      const rank = getVal(['patente']);
      const gender = getVal(['género', 'genero', 'sexo', 'sex']);
      const role = getVal(['cargo', 'função', 'funcao']);
      
      const dirName = getVal(['direcção', 'direccao', 'direção']);
      const depName = getVal(['departamento', 'distrito', 'direcção distrital', 'direccao distrital']);
      const repName = getVal(['repartição', 'reparticao']);
      const secName = getVal(['secção', 'seccao']);
      const carName = getVal(['carreira']);
      const catName = getVal(['categoria', 'categoria funcional']);

      if (!nip || !name) {
        errors.push(`Linha ${rowNum}: NUIT e Nome são obrigatórios.`);
        return; // skip previewing invalid rows if essential data missing
      }

      // Hierarchy matching
      let directorateId = '';
      let departmentId = '';
      let divisionId = '';
      let sectionId = '';
      let careerId = '';
      let categoryId = '';

      if (dirName) {
        const dMatch = data.directorates.find(d => d.name.toLowerCase() === dirName.toLowerCase());
        if (dMatch) directorateId = dMatch.id;
        else errors.push(`Linha ${rowNum}: Direcção "${dirName}" não existe no sistema.`);
      }

      if (depName && directorateId) {
        const dMatch = data.departments.find(d => d.directorateId === directorateId && d.name.toLowerCase() === depName.toLowerCase());
        if (dMatch) departmentId = dMatch.id;
        else errors.push(`Linha ${rowNum}: Departamento "${depName}" não encontrado dentro dessa Direcção.`);
      }

      if (repName && departmentId) {
        const rMatch = data.divisions.find(d => d.departmentId === departmentId && d.name.toLowerCase() === repName.toLowerCase());
        if (rMatch) divisionId = rMatch.id;
        else errors.push(`Linha ${rowNum}: Repartição "${repName}" não encontrada no Departamento.`);
      }

      if (secName) {
        // Section might be under division or department
        const parentId = divisionId || departmentId;
        const parentKey = divisionId ? 'divisionId' : 'departmentId';
        if (parentId) {
          const sMatch = data.sections.find(s => s[parentKey] === parentId && s.name.toLowerCase() === secName.toLowerCase());
          if (sMatch) sectionId = sMatch.id;
          else errors.push(`Linha ${rowNum}: Secção "${secName}" não encontrada.`);
        }
      }

      if (carName) {
        const cMatch = (data.careers || []).find(c => c.name.toLowerCase() === carName.toLowerCase());
        if (cMatch) careerId = cMatch.id;
        else errors.push(`Linha ${rowNum}: Carreira "${carName}" não encontrada.`);
      }

      if (catName) {
        const matchingCategories = careerId ? data.categories.filter(c => c.careerId === careerId) : data.categories;
        const cMatch = matchingCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
        if (cMatch) {
          categoryId = cMatch.id;
          if (!careerId) careerId = cMatch.careerId;
        } else {
          errors.push(`Linha ${rowNum}: Categoria "${catName}" não encontrada${careerId ? ' na Carreira especificada' : ''}.`);
        }
      }

      processed.push({
        nip, name, bi, dob, rank, gender, role,
        directorateId, departmentId, divisionId, sectionId, careerId, categoryId,
        isActive: true,
        // Raw values for display
        _raw: { dirName, depName, repName, secName, carName, catName }
      });
    });

    setPreview(processed);
    setImportErrors(errors);
  };

  const handleImport = () => {
    if (preview.length === 0) return;
    
    // Strip _raw before sending
    const toImport = preview.map(({ _raw, ...rest }) => rest);
    
    const result = onBulkAdd(toImport);
    if (result.success) {
      setSuccessReport(`Importação concluída! ${result.added} funcionário(s) adicionado(s).`);
      setPreview([]);
      setFile(null);
      setImportErrors([]);
      setTimeout(onSuccess, 3000);
    } else {
      setImportErrors([...importErrors, ...result.errors]);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "NUIT": "12345",
        "Nome": "João da Silva",
        "BI": "1122334455C",
        "Data de Nascimento": "1990-01-01",
        "Patente": "Inspetor",
        "Direcção": "Direcção Provincial de Maputo",
        "Departamento": "Direcção Distrital de Boane",
        "Repartição": "",
        "Secção": "Secção de Investigação",
        "Carreira": "Carreira Técnica",
        "Categoria": "Oficial"
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_funcionarios.xlsx");
  };

  return (
    <div style={styles.container}>
      {successReport ? (
        <div style={styles.successBanner}>
          <h3 style={{ margin: 0, color: '#2f855a' }}>{successReport}</h3>
          <p style={{ marginTop: '8px', color: '#276749' }}>A redirecionar para a lista...</p>
        </div>
      ) : (
        <>
          <div style={styles.uploadCard}>
            <div style={styles.uploadHeader}>
              <div>
                <h3 style={styles.cardTitle}>Importação Massiva (Excel/CSV)</h3>
                <p style={styles.cardDesc}>Carregue uma lista de funcionários. O sistema fará a correspondência da estrutura pelos nomes exatos.</p>
              </div>
              <button onClick={handleDownloadTemplate} style={styles.btnSecondary}>
                📥 Baixar Ficheiro Modelo
              </button>
            </div>

            <div style={styles.dropzone}>
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                onChange={handleFileChange}
                style={styles.fileInput} 
                id="file-upload"
              />
              <label htmlFor="file-upload" style={styles.dropLabel}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>📁</div>
                {file ? <strong>{file.name}</strong> : <span>Clique para selecionar ou arraste o seu Excel/CSV aqui</span>}
              </label>
            </div>
          </div>

          {importErrors.length > 0 && (
            <div style={styles.errorBox}>
              <h4 style={{ margin: '0 0 10px 0', color: '#c53030' }}>Foram encontrados avisos/erros:</h4>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#c53030' }}>
                {importErrors.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}

          {preview.length > 0 && (
            <div style={styles.previewCard}>
              <div style={styles.previewHeader}>
                <h3 style={styles.cardTitle}>Pré-visualização ({preview.length} registos válidos)</h3>
                <button onClick={handleImport} style={styles.btnPrimary} disabled={importErrors.length > 0}>
                  {importErrors.length > 0 ? 'Corrija os erros para importar' : 'Confirmar e Importar'}
                </button>
              </div>

              <div style={styles.tableContainer}>
                <table className="premium-table">
                  <thead>
                    <tr>
                      <th>NUIT</th>
                      <th>Nome</th>
                      <th>Direcção Detectada</th>
                      <th>Dep. Detectado</th>
                      <th>Secção Detectada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} style={styles.tr}>
                        <td>{row.nip}</td>
                        <td>{row.name}</td>
                        <td style={{...styles.td, color: row.directorateId ? 'inherit' : '#e53e3e'}}>{row._raw.dirName || '-'}</td>
                        <td style={{...styles.td, color: row.departmentId ? 'inherit' : '#e53e3e'}}>{row._raw.depName || '-'}</td>
                        <td style={{...styles.td, color: row.sectionId ? 'inherit' : '#e53e3e'}}>{row._raw.secName || '-'}</td>
                      </tr>
                    ))}
                    {preview.length > 10 && (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '12px', color: '#718096', fontStyle: 'italic' }}>
                          ... mais {preview.length - 10} registos não exibidos na pré-visualização.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { animation: 'fadeIn 0.3s ease' },
  uploadCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '24px' },
  uploadHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' },
  cardTitle: { fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)', margin: '0 0 8px 0' },
  cardDesc: { color: 'var(--color-text-muted)', fontSize: '14px', margin: 0 },
  dropzone: { border: '2px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-bg-base)', padding: '40px', textAlign: 'center', transition: 'all 0.2s', position: 'relative' },
  fileInput: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' },
  dropLabel: { display: 'block', pointerEvents: 'none', color: 'var(--color-text-muted)' },
  btnSecondary: { padding: '10px 16px', backgroundColor: 'transparent', color: 'var(--color-text-base)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  btnPrimary: { padding: '10px 20px', backgroundColor: 'var(--color-primary)', color: 'var(--color-accent)', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  errorBox: { backgroundColor: '#fed7d7', padding: '16px 20px', borderRadius: '8px', border: '1px solid #fc8181', marginBottom: '24px' },
  previewCard: { backgroundColor: 'var(--color-bg-card)', padding: '24px', borderRadius: '8px', border: '1px solid var(--color-border)' },
  previewHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  tableContainer: { overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '6px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { textAlign: 'left', padding: '12px 16px', backgroundColor: 'var(--color-bg-base)', borderBottom: '2px solid var(--color-border)', color: 'var(--color-text-muted)', fontWeight: '600' },
  tr: { borderBottom: '1px solid var(--color-border)' },
  td: { padding: '12px 16px', color: 'var(--color-text-base)' },
  successBanner: { backgroundColor: '#c6f6d5', padding: '30px', borderRadius: '8px', border: '1px solid #9ae6b4', textAlign: 'center' }
};

