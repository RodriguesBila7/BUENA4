/**
 * server/seedAllDistrictSections.js
 * Script para popular automaticamente as 8 secções oficiais do organograma para TODOS os distritos da BD SQLite.
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

console.log('[SeedSections] A ligar à base de dados para garantir 8 secções por distrito...', dbPath);
const db = new Database(dbPath);

const STANDARD_DISTRICT_SECTIONS = [
  "Piquete Operativo",
  "Secretaria",
  "Secção Técnica Criminalística",
  "Secção de Apoio e Documentação",
  "Secção de Armamento e Segurança",
  "Secção de Identificação e Registo Policial",
  "Secção de Investigação Operativa",
  "Secção de Investigação e Instrução Criminal"
];

db.transaction(() => {
  const districts = db.prepare('SELECT id, name FROM district_directorates').all();
  let createdCount = 0;

  const insertSec = db.prepare(`
    INSERT INTO sections (id, district_directorate_id, name, is_active, sort_order)
    VALUES (?, ?, ?, 1, ?)
  `);

  districts.forEach(dist => {
    // Buscar secções existentes deste distrito
    const existing = db.prepare('SELECT name FROM sections WHERE district_directorate_id = ?').all(dist.id);
    const existingNames = new Set(existing.map(s => s.name.toLowerCase()));

    STANDARD_DISTRICT_SECTIONS.forEach((secName, idx) => {
      if (!existingNames.has(secName.toLowerCase())) {
        const secId = `sec_dist_${dist.id.replace(/[^a-z0-9]/gi, '_')}_${idx + 1}_${Math.random().toString(36).substr(2, 4)}`;
        insertSec.run(secId, dist.id, secName, idx + 1);
        createdCount++;
      }
    });
  });

  console.log(`✅ Sucesso! Inseridas ${createdCount} secções nos distritos que não as possuíam.`);
})();

db.close();
