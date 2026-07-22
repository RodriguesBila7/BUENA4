import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, 'sernic.db');

const db = new Database(dbPath);

const tables = ['directorates', 'district_directorates', 'departments', 'divisions', 'sections', 'employees', 'users'];

console.log('--- ESTADO DA BASE DE DADOS ---');
tables.forEach(table => {
  try {
    const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
    console.log(`${table}: ${row.count} registos`);
  } catch (e) {
    console.log(`${table}: Erro - ${e.message}`);
  }
});
db.close();
