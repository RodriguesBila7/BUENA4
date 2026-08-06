/**
 * server/cleanOrphanedSections.js
 * Script para eliminar secçoes orfas ou sem distrito associado na BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[CleanOrphans] A ligar à base de dados para eliminar secções órfãs...', dbPath);
const db = new Database(dbPath);

db.transaction(() => {
  // 1. Eliminar secções distritais apontando para distritos que já não existem
  const info1 = db.prepare(`
    DELETE FROM sections 
    WHERE district_directorate_id IS NOT NULL 
      AND district_directorate_id != ''
      AND district_directorate_id NOT IN (SELECT id FROM district_directorates)
  `).run();

  // 2. Eliminar secções distritais com nome nulo ou em branco
  const info2 = db.prepare(`
    DELETE FROM sections 
    WHERE name IS NULL OR trim(name) = ''
  `).run();

  console.log(`✅ Sucesso! Eliminadas ${info1.changes} secções órfãs e ${info2.changes} secções em branco.`);
})();

db.close();
