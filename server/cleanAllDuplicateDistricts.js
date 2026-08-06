/**
 * server/cleanAllDuplicateDistricts.js
 * Script de limpeza profunda para agrupar e deduplicar todas as Direcções Distritais na BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[CleanAllDistricts] A ligar à base de dados para deduplicar distritos...', dbPath);
const db = new Database(dbPath);

export const formatDistrictName = (rawName) => {
  if (!rawName) return '';
  let str = rawName.trim();

  // Remover todas as variações de prefixo
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
  const allDistricts = db.prepare('SELECT id, name, province, provincial_directorate_id FROM district_directorates').all();

  // Agrupar por nome formatado e província
  const map = new Map();

  allDistricts.forEach(d => {
    const canonicalName = formatDistrictName(d.name);
    const key = `${canonicalName.toLowerCase()}||${(d.province || '').toLowerCase()}`;

    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push({ ...d, canonicalName });
  });

  let removedCount = 0;

  map.forEach((items, key) => {
    if (items.length > 1) {
      const mainDist = items[0];
      // Garantir nome formatado no mainDist
      db.prepare('UPDATE district_directorates SET name = ? WHERE id = ?').run(mainDist.canonicalName, mainDist.id);

      for (let i = 1; i < items.length; i++) {
        const dup = items[i];
        // Religar secções do distrito duplicado para o distrito principal
        db.prepare('UPDATE sections SET district_directorate_id = ? WHERE district_directorate_id = ?').run(mainDist.id, dup.id);
        // Religar funcionários do distrito duplicado para o distrito principal
        db.prepare('UPDATE employees SET district_directorate_id = ? WHERE district_directorate_id = ?').run(mainDist.id, dup.id);
        // Eliminar o distrito duplicado
        db.prepare('DELETE FROM district_directorates WHERE id = ?').run(dup.id);
        removedCount++;
        console.log(`Deduplicado: Removido "${dup.name}" (${dup.id}) -> Mantido "${mainDist.canonicalName}" (${mainDist.id})`);
      }
    } else if (items.length === 1) {
      const dist = items[0];
      if (dist.name !== dist.canonicalName) {
        db.prepare('UPDATE district_directorates SET name = ? WHERE id = ?').run(dist.canonicalName, dist.id);
      }
    }
  });

  console.log(`✅ Deduplicação concluída! Eliminadas ${removedCount} Direcções Distritais duplicadas na BD.`);
})();

db.close();
