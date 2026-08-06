import * as XLSX from 'xlsx';
import { showToast } from '../components/common/Toast';

/**
 * Exports an array of objects to an Excel file.
 * @param {Array} data - The array of objects to export (each object is a row).
 * @param {string} fileName - The desired name of the excel file (e.g. 'transferencias').
 */
export const exportToExcel = (data, fileName = 'relatorio') => {
  if (!data || data.length === 0) {
    showToast('Não existem dados para exportar.', 'warning');
    return;
  }

  // Create a worksheet from the data
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns (basic implementation)
  const colWidths = [];
  data.forEach(row => {
    Object.keys(row).forEach((key, i) => {
      const val = row[key] ? row[key].toString() : '';
      const len = Math.max(val.length, key.length);
      colWidths[i] = Math.max(colWidths[i] || 10, len);
    });
  });
  worksheet['!cols'] = colWidths.map(w => ({ wch: w + 2 }));

  // Create a workbook and append the worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Registos');

  // Generate Excel file and trigger download
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
