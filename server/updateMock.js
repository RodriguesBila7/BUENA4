import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'sernic.db');

const db = new Database(DB_PATH);

// Find first employee to modify
const employees = db.prepare('SELECT id, name FROM employees LIMIT 2').all();

if (employees.length >= 2) {
  const emp1 = employees[0];
  const emp2 = employees[1];

  // Make emp1 "João Silva", Agente de Investigação e Instrução Criminal de 1ª (we need to find/create the category)
  // Find or create career and category
  let career1 = db.prepare("SELECT id FROM careers WHERE name = 'Investigação Criminal'").get();
  if (!career1) {
    const id = 'car_' + Date.now();
    db.prepare("INSERT INTO careers (id, name) VALUES (?, ?)").run(id, 'Investigação Criminal');
    career1 = { id };
  }

  let cat1 = db.prepare("SELECT id FROM categories WHERE name = 'Agente de Investigação e Instrução Criminal de 1ª'").get();
  if (!cat1) {
    const id = 'cat_' + Date.now();
    db.prepare("INSERT INTO categories (id, career_id, name) VALUES (?, ?, ?)").run(id, career1.id, 'Agente de Investigação e Instrução Criminal de 1ª');
    cat1 = { id };
  }

  // Make emp2 "Maria Santos", Quadro Técnico Comum -> Assistente Técnico
  let career2 = db.prepare("SELECT id FROM careers WHERE name = 'Quadro Técnico Comum'").get();
  if (!career2) {
    const id = 'car2_' + Date.now();
    db.prepare("INSERT INTO careers (id, name) VALUES (?, ?)").run(id, 'Quadro Técnico Comum');
    career2 = { id };
  }

  let cat2 = db.prepare("SELECT id FROM categories WHERE name = 'Assistente Técnico'").get();
  if (!cat2) {
    const id = 'cat2_' + Date.now();
    db.prepare("INSERT INTO categories (id, career_id, name) VALUES (?, ?, ?)").run(id, career2.id, 'Assistente Técnico');
    cat2 = { id };
  }

  // Update emp1
  db.prepare(`
    UPDATE employees 
    SET name = 'João Silva', 
        career_id = ?, 
        category_id = ?,
        admission_date = '2019-01-01',
        extra_data = '{"academicLevel":"Licenciatura"}'
    WHERE id = ?
  `).run(career1.id, cat1.id, emp1.id);

  // Update emp2
  db.prepare(`
    UPDATE employees 
    SET name = 'Maria Santos', 
        career_id = ?, 
        category_id = ?,
        admission_date = '2012-01-01',
        extra_data = '{"academicLevel":"Mestrado"}'
    WHERE id = ?
  `).run(career2.id, cat2.id, emp2.id);

  console.log("Updated 2 employees successfully.");
} else {
  console.log("Not enough employees to modify.");
}
