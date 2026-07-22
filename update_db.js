import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'server', 'sernic.db');

const db = new Database(dbPath);

try {
  db.prepare("UPDATE functional_history SET act_type = 'Reserva' WHERE act_type = 'Aposentação'").run();
  console.log('Updated functional_history');

  db.prepare("UPDATE employees SET status = 'Na Reserva' WHERE status = 'Aposentado'").run();
  console.log('Updated employees');

  // Update admin_acts data JSON
  const acts = db.prepare("SELECT id, data FROM admin_acts").all();
  const updateAct = db.prepare("UPDATE admin_acts SET data = ? WHERE id = ?");
  let actUpdatedCount = 0;
  
  for (const act of acts) {
    try {
      const data = JSON.parse(act.data);
      if (data.actType === 'Aposentação') {
        data.actType = 'Reserva';
        updateAct.run(JSON.stringify(data), act.id);
        actUpdatedCount++;
      }
    } catch (e) {
      // ignore JSON parse errors
    }
  }
  console.log(`Updated ${actUpdatedCount} admin_acts records.`);

  console.log('Done!');
} catch (error) {
  console.error('Error updating DB:', error);
} finally {
  db.close();
}
