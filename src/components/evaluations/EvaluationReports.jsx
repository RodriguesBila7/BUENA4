import React, { useState } from 'react';
import useEvaluationData from '../../hooks/useEvaluationData';
import useOrgData from '../../hooks/useOrgData';
import { getClassification } from '../../utils/evaluationRules';
import { filterByProvincialScope } from '../../utils/scopeUtils';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ConfirmModal from '../ConfirmModal';

export default function EvaluationReports({ user }) {
  const { evaluations = [] } = useEvaluationData();
  const { data: orgData } = useOrgData();

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '' });
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterClass, setFilterClass] = useState('');

  const getFilteredData = () => {
    const rawList = Array.isArray(evaluations) ? evaluations : [];
    const scopedList = user ? filterByProvincialScope(rawList, user, orgData) : rawList;

    return scopedList.filter(e => {
      if (!e) return false;
      if (filterYear && String(e.year) !== String(filterYear)) return false;
      if (filterClass && getClassification(e.score)?.label !== filterClass) return false;
      return true;
    }).sort((a, b) => (parseFloat(b?.score || 0) - parseFloat(a?.score || 0)));
  };

  const exportExcel = () => {
    const data = getFilteredData().map(ev => ({
      'Ano': ev?.year || '-',
      'NUIT': ev?.employeeNip || '-',
      'Nome': ev?.employeeName || '-',
      'Pontuação': ev?.score ?? '-',
      'Classificação': getClassification(ev?.score)?.label || 'Não Avaliado',
      'Avaliador': ev?.evaluatorName || '-',
      'Data': ev?.evaluationDate || '-',
      'Estado': ev?.status || '-'
    }));

    if (data.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Nenhum dado encontrado para exportação com os filtros selecionados.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Avaliacoes");
    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    XLSX.writeFile(workbook, `Relatorio_Avaliacao_${dateStr}.xlsx`);
  };

  const exportPDF = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      setConfirmModal({
        isOpen: true,
        title: 'Aviso',
        message: 'Nenhum dado encontrado para exportação com os filtros selecionados.',
        hideCancel: true,
        confirmText: 'OK'
      });
      return;
    }

    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Relatório Geral de Avaliação de Desempenho', 14, 15);
    doc.setFontSize(10);
    doc.text(`Ano de Referência: ${filterYear || 'Todos'} | Filtro Classificação: ${filterClass || 'Todos'}`, 14, 22);
    doc.text(`Total Registos: ${data.length} | Data Exportação: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["Ano", "NUIT", "Nome", "Pontuação", "Classificação", "Avaliador", "Data"];
    const tableRows = data.map(ev => [
      ev?.year || '-',
      ev?.employeeNip || '-',
      ev?.employeeName || '-',
      `${ev?.score ?? '-'}v`,
      getClassification(ev?.score)?.label || 'Não Avaliado',
      ev?.evaluatorName || '-',
      ev?.evaluationDate || '-'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 34,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [27, 54, 93] }
    });

    const dateStr = new Date().toLocaleDateString('pt-PT').replace(/\//g, '-');
    doc.save(`Relatorio_Avaliacao_${dateStr}.pdf`);
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Centro de Relatórios de Desempenho</h3>
      
      <div style={styles.card}>
        <div style={styles.filters}>
          <div style={styles.filterGroup}>
            <label style={styles.label}>Ano de Avaliação</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} style={styles.select}>
              <option value="">Todos os Anos</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
          
          <div style={styles.filterGroup}>
            <label style={styles.label}>Classificação</label>
            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} style={styles.select}>
              <option value="">Todas as Classificações</option>
              <option value="Excelente">Excelente (19-20)</option>
              <option value="Muito Bom">Muito Bom (17-18)</option>
              <option value="Bom">Bom (14-16)</option>
              <option value="Suficiente">Suficiente (10-13)</option>
              <option value="Medíocre">Medíocre (&lt;10)</option>
            </select>
          </div>
        </div>

        <div style={styles.actions}>
          <button onClick={exportPDF} style={styles.btnPdf} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'8px', verticalAlign:'middle'}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            Baixar Relatório em PDF
          </button>
          <button onClick={exportExcel} style={styles.btnExcel} type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight:'8px', verticalAlign:'middle'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
            Exportar Grelha Excel
          </button>
        </div>
      </div>
      
      <div style={styles.infoBox}>
        <strong>Nota:</strong> A exportação respeita as regras de negócio vigentes no sistema e inclui os metadados de auditoria. Para uma impressão individual com a declaração oficial anexada, aceda ao histórico individual na listagem de avaliações.
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        hideCancel={confirmModal.hideCancel}
        confirmText={confirmModal.confirmText || 'OK'}
        isDestructive={confirmModal.isDestructive}
      />
    </div>
  );
}

const styles = {
  container: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px' },
  title: { margin: 0, color: 'var(--color-primary)' },
  card: { backgroundColor: 'var(--color-bg-card)', padding: '25px', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' },
  filters: { display: 'flex', gap: '20px', marginBottom: '30px' },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 },
  label: { fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', textTransform: 'uppercase' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-base)', outline: 'none', fontSize: '14px', width: '100%' },
  actions: { display: 'flex', gap: '15px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' },
  btnPdf: { flex: 1, padding: '12px', backgroundColor: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnExcel: { flex: 1, padding: '12px', backgroundColor: '#38a169', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '14px', transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  infoBox: { backgroundColor: 'rgba(27, 54, 93, 0.05)', borderLeft: '4px solid var(--color-primary)', padding: '15px', borderRadius: '4px', fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: '1.5' }
};
