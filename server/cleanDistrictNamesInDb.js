/**
 * server/cleanDistrictNamesInDb.js
 * Script para limpar e padronizar os nomes de todos os distritos na BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[CleanDistricts] A ligar à base de dados para sanitizar nomes de distritos...', dbPath);
const db = new Database(dbPath);

export const formatDistrictName = (rawName) => {
  if (!rawName) return '';
  let str = rawName.trim();

  // Remover todas as variações de prefixo (Direcção Distrital de, Direção Distrital de, etc.)
  str = str.replace(/^(Direc?çã?o\s+Distrital\s+(de|da|do)?\s*)+/i, '');
  str = str.replace(/^(Direc?çã?o\s+Distrital\s*)+/i, '');
  str = str.trim();

  if (!str) return '';

  const lower = str.toLowerCase();
  if (['matola', 'beira', 'manhiça', 'namaacha', 'mavia', 'maganja da costa'].includes(lower) || lower.startsWith('ilha ') || lower.startsWith('cidade ')) {
    return `Direcção Distrital da ${str}`;
  }
  return `Direcção Distrital de ${str}`;
};

db.transaction(() => {
  const districts = db.prepare('SELECT id, name FROM district_directorates').all();
  let updatedCount = 0;

  districts.forEach(d => {
    const formatted = formatDistrictName(d.name);
    if (formatted !== d.name) {
      db.prepare('UPDATE district_directorates SET name = ? WHERE id = ?').run(formatted, d.id);
      updatedCount++;
    }
  });

  console.log(`✅ Sanitizados ${updatedCount} nomes de distritos na base de dados!`);
})();

db.close();
