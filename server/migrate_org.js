import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const oldDb = new Database(path.join(__dirname, 'server', 'sernic.db'), { readonly: true });
const newDb = new Database(path.join(__dirname, 'sernic.db'));

const tables = [
  'directorates', 
  'district_directorates', 
  'departments', 
  'divisions', 
  'sections', 
  'careers', 
  'categories'
];

try {
  newDb.pragma('foreign_keys = OFF');
  newDb.transaction(() => {
    for (const table of tables) {
      const rows = oldDb.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) continue;
      
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      
      // INSERT OR IGNORE to not overwrite data that the auto-seed might have just created (like default district directorates)
      // Actually, if we want to bring their custom ones, INSERT OR IGNORE is safest.
      const insertStmt = newDb.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
      
      let count = 0;
      for (const row of rows) {
        const values = columns.map(col => row[col]);
        const res = insertStmt.run(values);
        if (res.changes > 0) count++;
      }
      console.log(`[Migração] Tabela ${table}: importadas ${count} linhas (de ${rows.length} totais na base antiga).`);
    }
  })();
  console.log("Migração concluída com sucesso!");
} catch (error) {
  console.error("Erro durante a migração:", error.message);
} finally {
  oldDb.close();
  newDb.close();
}
