/**
 * server/autoLinkProvinces.js
 * Script para vincular automaticamente as Direções Provinciais criadas manualmente
 * às respetivas províncias e distritos oficiais na base de dados.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('A ligar à base de dados...', dbPath);
const db = new Database(dbPath);

const provincesMap = [
  { term: 'cidade de maputo', prov: 'Cidade de Maputo' },
  { term: 'cidade maputo', prov: 'Cidade de Maputo' },
  { term: 'maputo', prov: 'Maputo Província' },
  { term: 'inhambane', prov: 'Inhambane' },
  { term: 'manica', prov: 'Manica' },
  { term: 'nampula', prov: 'Nampula' },
  { term: 'niassa', prov: 'Niassa' },
  { term: 'sofala', prov: 'Sofala' },
  { term: 'tete', prov: 'Tete' },
  { term: 'zambézia', prov: 'Zambézia' },
  { term: 'zambezia', prov: 'Zambézia' },
  { term: 'gaza', prov: 'Gaza' },
  { term: 'cabo delgado', prov: 'Cabo Delgado' }
];

try {
  const dirs = db.prepare('SELECT id, name, province FROM directorates').all();
  
  db.transaction(() => {
    dirs.forEach(dir => {
      const nameLower = dir.name.toLowerCase();
      // Encontrar correspondência
      const match = provincesMap.find(p => nameLower.includes(p.term));
      if (match) {
        console.log(`Vincular: "${dir.name}" -> Província: "${match.prov}"`);
        // Atualizar Direção
        db.prepare('UPDATE directorates SET province = ? WHERE id = ?').run(match.prov, dir.id);
        
        // Atualizar Distritos desta Província para apontarem para esta Direção
        const res = db.prepare('UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = ?').run(dir.id, match.prov);
        console.log(`   Distritos associados: ${res.changes}`);
      } else {
        console.log(`Manter central: "${dir.name}"`);
      }
    });
  })();
  
  console.log('✅ Vinculação concluída com sucesso!');
} catch (e) {
  console.error('❌ Erro na vinculação:', e.message);
} finally {
  db.close();
}
