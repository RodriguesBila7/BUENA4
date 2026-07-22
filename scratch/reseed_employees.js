import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve('server/sernic.db');
const db = new Database(DB_PATH);

console.log('Connecting to database:', DB_PATH);

db.exec('PRAGMA foreign_keys = OFF;'); // Disable foreign keys briefly to wipe data easily

console.log('Clearing dependent tables...');
db.exec('DELETE FROM admin_acts;');
db.exec('DELETE FROM functional_history;');
db.exec('DELETE FROM disciplinary;');
db.exec('DELETE FROM transfers;');
db.exec('DELETE FROM evaluations;');
db.exec('DELETE FROM effectiveness;');

console.log('Clearing employees...');
db.exec('DELETE FROM employees;');

db.exec('PRAGMA foreign_keys = ON;');

// Generate 30 well-identified employees
const firstNamesM = ['João', 'Carlos', 'Pedro', 'Manuel', 'António', 'José', 'Paulo', 'Rui', 'Luís', 'Fernando', 'Miguel', 'Ricardo', 'Tiago', 'André', 'Nuno'];
const firstNamesF = ['Maria', 'Ana', 'Sofia', 'Marta', 'Joana', 'Catarina', 'Teresa', 'Rita', 'Inês', 'Diana', 'Sara', 'Filipa', 'Beatriz', 'Mariana', 'Carolina'];
const lastNames = ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gomes', 'Marques', 'Almeida', 'Ribeiro', 'Pinto'];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateNUIT() {
  // Generate a random 9 digit number starting with 1, 2 or 3
  const firstDigit = [1, 2, 3][Math.floor(Math.random() * 3)];
  const rest = Math.floor(10000000 + Math.random() * 90000000);
  return `${firstDigit}${rest}`;
}

const employees = [];

// Fetch existing careers and categories
const careers = db.prepare('SELECT id FROM careers').all();
const categoriesMap = {};
if (careers.length > 0) {
  for (const career of careers) {
    const cats = db.prepare('SELECT id FROM categories WHERE career_id = ?').all(career.id);
    categoriesMap[career.id] = cats;
  }
}

for (let i = 1; i <= 30; i++) {
  const gender = Math.random() > 0.5 ? 'Masculino' : 'Feminino';
  const firstName = gender === 'Masculino' ? getRandomItem(firstNamesM) : getRandomItem(firstNamesF);
  const lastName = getRandomItem(lastNames);
  const name = `${firstName} ${lastName}`;
  const nuit = generateNUIT();
  
  // Birth date between 1970 and 1995
  const year = 1970 + Math.floor(Math.random() * 25);
  const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
  const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
  const birth_date = `${year}-${month}-${day}`;

  const admission_year = year + 22 + Math.floor(Math.random() * 10);
  const admission_date = `${admission_year}-01-01`;

  const phone = `84${Math.floor(1000000 + Math.random() * 9000000)}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@sernic.gov.mz`;

  let career_id = null;
  let category_id = null;
  if (careers.length > 0) {
    const selectedCareer = getRandomItem(careers);
    career_id = selectedCareer.id;
    const cats = categoriesMap[career_id];
    if (cats && cats.length > 0) {
      category_id = getRandomItem(cats).id;
    }
  }

  employees.push({
    id: `emp_${Date.now()}_${i}`,
    nip: nuit, // Assuming NIP is used in DB to store NUIT
    name,
    gender,
    birth_date,
    id_number: `110${Math.floor(100000000 + Math.random() * 90000000)}B`,
    nuit,
    address: 'Av. Eduardo Mondlane, Maputo',
    email,
    phone,
    photo: '',
    unit_type: 'normal',
    career_id,
    category_id,
    status: 'Ativo',
    is_active: 1,
    admission_date,
    extra_data: JSON.stringify({ role: 'Investigador', salary: 45000, vinculo: 'Quadro Definitivo' })
  });
}

console.log('Inserting 30 employees...');
const insertEmp = db.prepare(`
  INSERT INTO employees (id, nip, name, gender, birth_date, id_number, nuit, address, email, phone, photo, unit_type, career_id, category_id, status, is_active, admission_date, extra_data)
  VALUES (@id, @nip, @name, @gender, @birth_date, @id_number, @nuit, @address, @email, @phone, @photo, @unit_type, @career_id, @category_id, @status, @is_active, @admission_date, @extra_data)
`);

db.transaction(() => {
  for (const emp of employees) {
    insertEmp.run(emp);
  }
})();

console.log('Database successfully re-seeded with 30 employees.');
db.close();
