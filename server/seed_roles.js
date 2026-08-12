import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, 'sernic.db'));

const ALL_MODULES = [
  'Dashboard', 'Funcionários', 'Estrutura Organizacional', 'Processos Disciplinares',
  'Efetividade (Faltas)', 'Avaliação de Desempenho', 'Promoção e Progressão',
  'Férias e Licenças', 'Mudança de Carreira', 'Provimento e Cessação',
  'Reserva e Reforma', 'Saúde e Óbitos', 'Transferências e Mobilidade',
  'Carreiras', 'Categorias Funcionais', 'Relatórios e Impressão', 'Configurações',
  'Utilizadores', 'Auditoria', 'Acessos e Perfis'
];

const fullPermissions = ALL_MODULES.reduce((acc, mod) => {
  acc[mod] = ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'];
  return acc;
}, { all: true, manage_users: true });

const roles = [
  {
    id: 'super_admin_1',
    name: 'Super Administrador Principal',
    description: 'Chefe da Direcção de Recursos Humanos (Acesso Total e Confirmação Final de Actos)',
    permissions: JSON.stringify(fullPermissions)
  },
  {
    id: 'admin_1',
    name: 'Super Administrador',
    description: 'Chefe do Departamento de Gestão de Pessoal',
    permissions: JSON.stringify(fullPermissions)
  },
  {
    id: 'admin_2',
    name: 'Administrador Principal',
    description: 'Técnico Central de Recursos Humanos',
    permissions: JSON.stringify(fullPermissions)
  },
  {
    id: 'usuario_admin',
    name: 'Administrador',
    description: 'Chefes dos Departamentos Provinciais de Recursos Humanos e Apoio Administrativo',
    permissions: JSON.stringify(fullPermissions)
  },
  {
    id: 'tecnico_reserva',
    name: 'Técnico de Pensões e Reserva',
    description: 'RH Central - Específico para Reserva e Reforma',
    permissions: JSON.stringify({ reserva_reforma: true, view_employees: true })
  },
  {
    id: 'tecnico_saude',
    name: 'Técnico de Saúde e Óbitos',
    description: 'RH Central - Específico para Saúde e Óbitos',
    permissions: JSON.stringify({ saude_obitos: true, view_employees: true })
  },
  {
    id: 'usuario_normal',
    name: 'Usuário',
    description: 'Adjuntos dos Administradores (Podem substituir Usuários Administrativos)',
    permissions: JSON.stringify({ view_only: true })
  }
];

db.transaction(() => {
  // Migrar utilizadores associados a roles legadas
  db.prepare("UPDATE users SET role_id = 'super_admin_1' WHERE role_id = 'super_admin' OR username = 'admin'").run();
  db.prepare("UPDATE users SET role_id = 'usuario_normal' WHERE role_id = 'user'").run();

  // Apagar role legada super_admin
  db.prepare("DELETE FROM roles WHERE id = 'super_admin' OR id = 'user'").run();

  // Atualizar nomes temporariamente para evitar violações da restrição UNIQUE
  db.prepare("UPDATE roles SET name = name || '_' || id").run();

  // Atualizar ou Inserir cada role oficial com o seu nome e descrição final
  const updateStmt = db.prepare('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?');
  const insertStmt = db.prepare('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)');

  for (const r of roles) {
    const res = updateStmt.run(r.name, r.description, r.permissions, r.id);
    if (res.changes === 0) {
      insertStmt.run(r.id, r.name, r.description, r.permissions);
    }
  }
})();

console.log('Perfis de Sistema Reestruturados com Sucesso!');
