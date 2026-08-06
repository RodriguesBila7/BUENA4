/**
 * server/cleanMaputoDuplicates.js
 * Script de limpeza profunda para unificar e deduplicar Direcções de Maputo na BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[Clean] A ligar à base de dados para limpeza profunda...', dbPath);
const db = new Database(dbPath);

db.transaction(() => {
  // 1. Procurar IDs das direcções de Maputo
  const maputoCidadeDirs = db.prepare(`SELECT id, name FROM directorates WHERE lower(name) LIKE '%maputo%cidade%' OR lower(name) LIKE '%cidade%maputo%'`).all();
  const maputoProvDirs = db.prepare(`SELECT id, name FROM directorates WHERE lower(name) LIKE '%maputo%prov%' OR (lower(name) LIKE '%maputo%' AND lower(name) NOT LIKE '%cidade%')`).all();

  console.log('Encontradas direcções Cidade:', maputoCidadeDirs);
  console.log('Encontradas direcções Província:', maputoProvDirs);

  // Garantir a existencia da Direcção da Cidade de Maputo principal
  let targetCidadeId = 'dir_maputo_cidade';
  const existingCidade = db.prepare("SELECT id FROM directorates WHERE name = 'Direcção da Cidade de Maputo'").get();
  if (existingCidade) {
    targetCidadeId = existingCidade.id;
  } else if (maputoCidadeDirs.length > 0) {
    targetCidadeId = maputoCidadeDirs[0].id;
    db.prepare("UPDATE directorates SET name = 'Direcção da Cidade de Maputo', province = 'Cidade de Maputo' WHERE id = ?").run(targetCidadeId);
  } else {
    db.prepare("INSERT INTO directorates (id, name, province, is_active) VALUES (?, 'Direcção da Cidade de Maputo', 'Cidade de Maputo', 1)").run(targetCidadeId);
  }

  // Redirecionar todos os distritos e funcionarios apontados para outras variantes da Cidade de Maputo para o targetCidadeId
  maputoCidadeDirs.forEach(d => {
    if (d.id !== targetCidadeId) {
      db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(targetCidadeId, d.id);
      db.prepare("UPDATE employees SET directorate_id = ? WHERE directorate_id = ?").run(targetCidadeId, d.id);
      db.prepare("DELETE FROM directorates WHERE id = ?").run(d.id);
      console.log(`Unificada e removida duplicada Cidade: ${d.name} (${d.id})`);
    }
  });

  // Garantir a existencia da Direcção Provincial de Maputo principal
  let targetProvId = 'dir_maputo_provincia';
  const existingProv = db.prepare("SELECT id FROM directorates WHERE name = 'Direcção Provincial de Maputo'").get();
  if (existingProv) {
    targetProvId = existingProv.id;
  } else if (maputoProvDirs.length > 0) {
    targetProvId = maputoProvDirs[0].id;
    db.prepare("UPDATE directorates SET name = 'Direcção Provincial de Maputo', province = 'Maputo Província' WHERE id = ?").run(targetProvId);
  } else {
    db.prepare("INSERT INTO directorates (id, name, province, is_active) VALUES (?, 'Direcção Provincial de Maputo', 'Maputo Província', 1)").run(targetProvId);
  }

  // Redirecionar todos os distritos e funcionarios apontados para outras variantes de Maputo Provincia para o targetProvId
  maputoProvDirs.forEach(d => {
    if (d.id !== targetProvId && d.id !== targetCidadeId) {
      db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(targetProvId, d.id);
      db.prepare("UPDATE employees SET directorate_id = ? WHERE directorate_id = ?").run(targetProvId, d.id);
      db.prepare("DELETE FROM directorates WHERE id = ?").run(d.id);
      console.log(`Unificada e removida duplicada Província: ${d.name} (${d.id})`);
    }
  });

  // Vincular distritos da Cidade de Maputo ao targetCidadeId
  db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = 'Cidade de Maputo'").run(targetCidadeId);

  // Vincular distritos de Maputo Província ao targetProvId
  db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = 'Maputo Província'").run(targetProvId);
})();

console.log('✅ Limpeza e unificação profunda concluída com sucesso!');
db.close();
