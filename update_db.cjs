const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server', 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening db:', err);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run("UPDATE act_types SET act_name = 'Reserva' WHERE act_name = 'Aposentação'", (err) => {
    if (err) console.error(err);
    else console.log('Updated act_types');
  });
  
  db.run("UPDATE admin_acts SET act_type = 'Reserva' WHERE act_type = 'Aposentação'", (err) => {
    if (err) console.error(err);
    else console.log('Updated admin_acts');
  });

  db.run("UPDATE employees SET status = 'Na Reserva' WHERE status = 'Aposentado'", (err) => {
    if (err) console.error(err);
    else console.log('Updated employees');
  });
});

db.close(() => console.log('Done'));
