/**
 * server/cleanAllDuplicateDirectorates.js
 * Script de limpeza profunda para remover TODAS as duplicações de Direcções Provinciais na BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[CleanAll] A ligar à base de dados para deduplicação geral...', dbPath);
const db = new Database(dbPath);

const PROVINCES = [
  { name: 'Cidade de Maputo', dirName: 'Direcção da Cidade de Maputo' },
  { name: 'Maputo Província', dirName: 'Direcção Provincial de Maputo' },
  { name: 'Gaza', dirName: 'Direcção Provincial de Gaza' },
  { name: 'Inhambane', dirName: 'Direcção Provincial de Inhambane' },
  { name: 'Sofala', dirName: 'Direcção Provincial de Sofala' },
  { name: 'Manica', dirName: 'Direcção Provincial de Manica' },
  { name: 'Tete', dirName: 'Direcção Provincial de Tete' },
  { name: 'Zambézia', dirName: 'Direcção Provincial de Zambézia' },
  { name: 'Nampula', dirName: 'Direcção Provincial de Nampula' },
  { name: 'Niassa', dirName: 'Direcção Provincial de Niassa' },
  { name: 'Cabo Delgado', dirName: 'Direcção Provincial de Cabo Delgado' }
];

db.transaction(() => {
  PROVINCES.forEach(p => {
    // Buscar todas as direcções que correspondem a esta província
    const matching = db.prepare(`
      SELECT id, name, province FROM directorates 
      WHERE province = ? OR lower(name) LIKE ? OR lower(name) LIKE ?
    `).all(p.name, `%${p.name.toLowerCase()}%`, `%direc%${p.name.toLowerCase()}%`);

    if (matching.length === 0) return;

    // Escolher a direcção principal (priorizar a que tem nome oficial "Direcção...")
    let mainDir = matching.find(m => m.name === p.dirName) || matching[0];

    // Atualizar o nome e provincia da direcção principal para o padrão oficial
    db.prepare("UPDATE directorates SET name = ?, province = ? WHERE id = ?").run(p.dirName, p.name, mainDir.id);

    // Para todas as outras duplicadas, transferir filhos e eliminar
    matching.forEach(dup => {
      if (dup.id !== mainDir.id) {
        db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(mainDir.id, dup.id);
        db.prepare("UPDATE departments SET directorate_id = ? WHERE directorate_id = ?").run(mainDir.id, dup.id);
        db.prepare("UPDATE employees SET directorate_id = ? WHERE directorate_id = ?").run(mainDir.id, dup.id);
        db.prepare("UPDATE employees SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(mainDir.id, dup.id);
        db.prepare("DELETE FROM directorates WHERE id = ?").run(dup.id);
        console.log(`Deduplicado: Removido "${dup.name}" (${dup.id}) -> Mantido "${p.dirName}" (${mainDir.id})`);
      }
    });

    // Vincular distritos desta provincia à direcção principal
    db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = ?").run(mainDir.id, p.name);
  });
})();

console.log('✅ Deduplicação completa de todas as Direcções Provinciais concluída com sucesso!');
db.close();
