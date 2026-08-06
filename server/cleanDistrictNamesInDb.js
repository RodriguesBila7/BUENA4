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
  let trimmed = rawName.trim();

  // Limpar repetidos (ex: "Direcção Distrital de Direção Distrital de Funhalouro")
  while (/^Direcçã?o\s+Distrital\s+(de|da|do)?\s+Direcçã?o\s+Distrital/i.test(trimmed)) {
    trimmed = trimmed.replace(/^Direcçã?o\s+Distrital\s+(de|da|do)?\s+/i, '');
  }

  // Se já começa com "Direcção Distrital" ou "Direção Distrital", padronizar a grafia
  if (/^Direcçã?o\s+Distrital/i.test(trimmed)) {
    return trimmed.replace(/^Direção\b/i, 'Direcção');
  }

  // Se for apenas o nome do distrito
  const lower = trimmed.toLowerCase();
  if (['matola', 'beira', 'manhiça', 'namaacha', 'mavia', 'maganja da costa'].includes(lower) || lower.startsWith('ilha ') || lower.startsWith('cidade ')) {
    return `Direcção Distrital da ${trimmed}`;
  }
  return `Direcção Distrital de ${trimmed}`;
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
