import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'sernic.db'));

const acts = db.prepare('SELECT * FROM act_types').all();
const careers = db.prepare('SELECT * FROM careers').all();
const categories = db.prepare('SELECT * FROM categories').all();
const directorates = db.prepare('SELECT * FROM directorates').all();

const paramilitarCareers = careers.filter(c => c.name !== 'Carreira de Quadro Técnico Comum');
const civilCareers = careers.filter(c => c.name === 'Carreira de Quadro Técnico Comum');

const numEmployees = 30;

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const firstNames = ['João', 'Maria', 'Carlos', 'Ana', 'António', 'Sofia', 'Manuel', 'Marta', 'José', 'Sara', 'Pedro', 'Catarina', 'Paulo', 'Joana', 'Luís', 'Filipa', 'Rui', 'Inês', 'Tiago', 'Beatriz'];
const lastNames = ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Jesus', 'Sousa', 'Fernandes', 'Gomes', 'Marques', 'Almeida', 'Ribeiro', 'Pinto', 'Carvalho', 'Teixeira', 'Moreira', 'Correia', 'Mondlane', 'Machel', 'Chissano', 'Nyusi'];

const baseYear = 1970;

db.transaction(() => {
  for (let i = 0; i < numEmployees; i++) {
    const isParamilitar = Math.random() > 0.3; // 70% paramilitar
    const career = getRandomItem(isParamilitar ? paramilitarCareers : civilCareers);
    const validCategories = categories.filter(c => c.career_id === career.id);
    const category = validCategories.length > 0 ? getRandomItem(validCategories) : null;
    const dir = getRandomItem(directorates);
    
    const id = `emp_${crypto.randomUUID().replace(/-/g, '').substring(0, 10)}`;
    const name = `${getRandomItem(firstNames)} ${getRandomItem(lastNames)} ${getRandomItem(lastNames)}`;
    const nip = String(Math.floor(100000 + Math.random() * 900000));
    
    // Gerar data de nascimento realista
    const birthYear = baseYear + Math.floor(Math.random() * 30);
    const birthMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const birthDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    
    const extraData = {
      academic_level: getRandomItem(['Licenciatura', 'Mestrado', 'Doutoramento', 'Ensino Médio']),
      specialty: 'Geral',
      marital_status: getRandomItem(['Solteiro(a)', 'Casado(a)', 'Divorciado(a)'])
    };
    
    db.prepare(`
      INSERT INTO employees (
        id, nip, name, gender, birth_date, id_number, nuit, unit_type, directorate_id, career_id, category_id, status, is_active, extra_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, nip, name, Math.random() > 0.5 ? 'Masculino' : 'Feminino',
      `${birthYear}-${birthMonth}-${birthDay}`, `110${Math.floor(Math.random() * 1000000000)}B`, `1${Math.floor(Math.random() * 100000000)}`, 'normal', dir ? dir.id : null, career ? career.id : null, category ? category.id : null,
      'Ativo', 1, JSON.stringify(extraData)
    );

    // Apply an act to this employee (distribute acts evenly so all are covered)
    const actTypeObj = acts[i % acts.length];
    
    const actId = `act_${crypto.randomUUID().replace(/-/g, '').substring(0, 10)}`;
    
    let status = 'Ativo';
    let isActive = 1;
    
    if (['Demissão', 'Expulsão', 'Reforma', 'Óbito'].includes(actTypeObj.act_name)) {
      status = actTypeObj.act_name;
      isActive = 0;
      db.prepare(`UPDATE employees SET status = ?, is_active = ? WHERE id = ?`).run(status, isActive, id);
    }
    
    const historyObj = {
      id: actId,
      employee_id: id,
      act_type: actTypeObj.act_name,
      act_date: new Date().toISOString(),
      old_state_json: JSON.stringify({ careerId: career?.id, status: 'Ativo' }),
      new_state_json: JSON.stringify({ careerId: career?.id, status: status }),
      details_json: JSON.stringify({ despacho: `Despacho ${Math.floor(Math.random() * 100)}/2026`, note: `Exemplo de ${actTypeObj.act_name} gerado automaticamente.` }),
      user_responsible: 'admin'
    };

    db.prepare(`
      INSERT INTO functional_history (
        id, employee_id, act_type, act_date, old_state_json, new_state_json, details_json, user_responsible
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      historyObj.id, historyObj.employee_id, historyObj.act_type, historyObj.act_date,
      historyObj.old_state_json, historyObj.new_state_json, historyObj.details_json, historyObj.user_responsible
    );
  }
})();

console.log('Criados com sucesso 30 funcionários de exemplo com todos os tipos de actos distribuídos.');
