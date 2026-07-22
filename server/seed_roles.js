import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'sernic.db'));

const roles = [
  {
    id: 'super_admin_1',
    name: 'Super Administrador 1',
    description: 'Chefe da Direção de Recursos Humanos (Acesso Total)',
    permissions: JSON.stringify({ "all": true, "manage_users": true })
  },
  {
    id: 'admin_1',
    name: 'Administrador 1',
    description: 'Chefe do Departamento de Gestão de Pessoal (Acesso Total)',
    permissions: JSON.stringify({ "all": true, "manage_users": true })
  },
  {
    id: 'admin_2',
    name: 'Administrador 2',
    description: 'Técnico de Gestão de BD Central RH (Acesso Total)',
    permissions: JSON.stringify({ "all": true, "manage_users": true })
  },
  {
    id: 'usuario_admin',
    name: 'Usuário Administrativo',
    description: 'Chefes de RH Provinciais e Chefes de Dept Central (Acesso Adquirido Total)',
    permissions: JSON.stringify({ "all": true, "manage_users": false })
  },
  {
    id: 'usuario_normal',
    name: 'Usuário',
    description: 'Adjuntos (Podem substituir Usuários Administrativos)',
    permissions: JSON.stringify({ "view_only": true })
  },
  {
    id: 'tecnico_saude',
    name: 'Técnico de Saúde e Óbitos',
    description: 'RH Central - Específico para Saúde e Óbitos',
    permissions: JSON.stringify({ "saude_obitos": true, "view_employees": true })
  },
  {
    id: 'tecnico_reserva',
    name: 'Técnico de Pensões e Reserva',
    description: 'RH Central - Específico para Reserva e Reforma',
    permissions: JSON.stringify({ "reserva_reforma": true, "view_employees": true })
  }
];

const insertStmt = db.prepare('INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)');
const updateStmt = db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?');

db.transaction(() => {
  for (const r of roles) {
    const res = updateStmt.run(r.name, r.description, r.permissions, r.id);
    if (res.changes === 0) {
      insertStmt.run(r.id, r.name, r.description, r.permissions);
    }
  }
  
  // Atualizar utilizadores existentes para não quebrarem
  db.prepare("UPDATE users SET role_id = 'super_admin_1' WHERE role_id = 'super_admin' OR username = 'admin'").run();
  db.prepare("UPDATE users SET role_id = 'usuario_normal' WHERE role_id = 'user' OR username = 'user'").run();
})();

console.log('Novos Perfis / Papéis de Sistema Injetados com Sucesso!');
