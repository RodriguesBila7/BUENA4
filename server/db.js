/**
 * server/db.js
 * Inicializa o SQLite e cria todas as tabelas necessarias.
 * Usa better-sqlite3 (sincrono) para simplicidade.
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'sernic.db');

let db;

export function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');   // Performance
  db.pragma('foreign_keys = ON');    // Integridade referencial
  initSchema(db);
  return db;
}

function initSchema(db) {
  db.exec(`
    -- =========================================================
    -- ESTRUTURA ORGANICA
    -- =========================================================
    CREATE TABLE IF NOT EXISTS directorates (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      province     TEXT, -- Província associada se for Direção Provincial
      is_active    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS district_directorates (
      id                      TEXT PRIMARY KEY,
      name                    TEXT NOT NULL,
      code                    TEXT NOT NULL UNIQUE,
      provincial_directorate_id TEXT REFERENCES directorates(id),
      province                TEXT NOT NULL,
      status                  TEXT NOT NULL DEFAULT 'Ativo',
      is_active               INTEGER NOT NULL DEFAULT 1,
      sort_order              INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now')),
      notes                   TEXT
    );

    CREATE TABLE IF NOT EXISTS departments (
      id               TEXT PRIMARY KEY,
      directorate_id   TEXT NOT NULL REFERENCES directorates(id),
      name             TEXT NOT NULL,
      is_active        INTEGER NOT NULL DEFAULT 1,
      sort_order       INTEGER NOT NULL DEFAULT 0,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS divisions (
      id             TEXT PRIMARY KEY,
      department_id  TEXT NOT NULL REFERENCES departments(id),
      name           TEXT NOT NULL,
      is_active      INTEGER NOT NULL DEFAULT 1,
      sort_order     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT DEFAULT (datetime('now')),
      updated_at     TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id                      TEXT PRIMARY KEY,
      department_id           TEXT REFERENCES departments(id),
      division_id             TEXT REFERENCES divisions(id),
      district_directorate_id TEXT REFERENCES district_directorates(id),
      name                    TEXT NOT NULL,
      is_active               INTEGER NOT NULL DEFAULT 1,
      sort_order              INTEGER NOT NULL DEFAULT 0,
      created_at              TEXT DEFAULT (datetime('now')),
      updated_at              TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS careers (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      is_active    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id           TEXT PRIMARY KEY,
      career_id    TEXT NOT NULL REFERENCES careers(id),
      name         TEXT NOT NULL,
      is_active    INTEGER NOT NULL DEFAULT 1,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- FUNCIONARIOS
    -- =========================================================
    CREATE TABLE IF NOT EXISTS employees (
      id                        TEXT PRIMARY KEY,
      nip                       TEXT NOT NULL UNIQUE,
      name                      TEXT NOT NULL,
      gender                    TEXT,
      birth_date                TEXT,
      id_number                 TEXT,
      nuit                      TEXT,
      address                   TEXT,
      email                     TEXT,
      phone                     TEXT,
      photo                     TEXT,
      unit_type                 TEXT DEFAULT 'normal', -- 'normal' ou 'district'
      directorate_id            TEXT REFERENCES directorates(id),
      department_id             TEXT REFERENCES departments(id),
      division_id               TEXT REFERENCES divisions(id),
      district_directorate_id   TEXT REFERENCES district_directorates(id),
      section_id                TEXT REFERENCES sections(id),
      career_id                 TEXT REFERENCES careers(id),
      category_id               TEXT REFERENCES categories(id),
      province_id               TEXT,
      district_id               TEXT,
      status                    TEXT NOT NULL DEFAULT 'Ativo',
      is_active                 INTEGER NOT NULL DEFAULT 1,
      admission_date            TEXT,
      extra_data                TEXT,   -- JSON para campos adicionais
      created_at                TEXT DEFAULT (datetime('now')),
      updated_at                TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_employees_nip             ON employees(nip);
    CREATE INDEX IF NOT EXISTS idx_employees_directorate_id  ON employees(directorate_id);
    CREATE INDEX IF NOT EXISTS idx_employees_department_id   ON employees(department_id);
    CREATE INDEX IF NOT EXISTS idx_employees_status          ON employees(status);

    -- =========================================================
    -- AUTENTICACAO
    -- =========================================================
    CREATE TABLE IF NOT EXISTS roles (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL UNIQUE,
      description  TEXT,
      permissions  TEXT NOT NULL DEFAULT '{}',  -- JSON
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL,
      username         TEXT NOT NULL UNIQUE,
      email            TEXT,
      contact          TEXT,
      password         TEXT NOT NULL,
      role_id          TEXT REFERENCES roles(id),
      delegated_role_id TEXT REFERENCES roles(id),
      delegation_start_date TEXT,
      delegation_end_date TEXT,
      status           TEXT NOT NULL DEFAULT 'Ativo',
      directorate_id   TEXT,
      department_id    TEXT,
      division_id      TEXT,
      section_id       TEXT,
      avatar           TEXT,
      created_at       TEXT DEFAULT (datetime('now')),
      updated_at       TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- CONFIGURACOES
    -- =========================================================
    CREATE TABLE IF NOT EXISTS app_settings (
      key          TEXT PRIMARY KEY,
      value        TEXT NOT NULL,
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- AUDITORIA
    -- =========================================================
    CREATE TABLE IF NOT EXISTS audit_log (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user         TEXT NOT NULL,
      action       TEXT NOT NULL,
      module       TEXT NOT NULL,
      details      TEXT,
      ip           TEXT,
      timestamp    TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_module    ON audit_log(module);

    -- =========================================================
    -- ACTOS ADMINISTRATIVOS E HISTORICO FUNCIONAL
    -- =========================================================
    CREATE TABLE IF NOT EXISTS admin_acts (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,  -- JSON completo do acto
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS functional_history (
      id               TEXT PRIMARY KEY,
      employee_id      TEXT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      act_type         TEXT NOT NULL,
      act_date         TEXT NOT NULL,
      old_state_json   TEXT,
      new_state_json   TEXT,
      details_json     TEXT,
      user_responsible TEXT,
      created_at       TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- PROCESSOS DISCIPLINARES
    -- =========================================================
    CREATE TABLE IF NOT EXISTS disciplinary (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,  -- JSON completo
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- TRANSFERENCIAS
    -- =========================================================
    CREATE TABLE IF NOT EXISTS transfers (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,  -- JSON completo
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- AVALIACOES DE DESEMPENHO
    -- =========================================================
    CREATE TABLE IF NOT EXISTS evaluations (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,  -- JSON completo
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- TIPOS DE ACTOS (CRUD)
    -- =========================================================
    CREATE TABLE IF NOT EXISTS act_types (
      id           TEXT PRIMARY KEY,
      group_name   TEXT NOT NULL,
      act_name     TEXT NOT NULL,
      is_active    INTEGER DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- EFETIVIDADE
    -- =========================================================
    CREATE TABLE IF NOT EXISTS effectiveness (
      id           TEXT PRIMARY KEY,
      data         TEXT NOT NULL,  -- JSON completo
      created_at   TEXT DEFAULT (datetime('now')),
      updated_at   TEXT DEFAULT (datetime('now'))
    );

    -- =========================================================
    -- SEGURANCA
    -- =========================================================
    CREATE TABLE IF NOT EXISTS security_settings (
      id           INTEGER PRIMARY KEY DEFAULT 1,
      data         TEXT NOT NULL DEFAULT '{}'  -- JSON completo
    );
  `);

  // Auto-seed Act Types
  const actTypesCount = db.prepare('SELECT COUNT(*) as c FROM act_types').get().c;
  if (actTypesCount === 0) {
    const defaultActs = [
      { group: 'Promoção e Progressão', acts: ['Promoção', 'Progressão'] },
      { group: 'Mudança de Carreira', acts: ['Mudança de Carreira'] },
      { group: 'Transferências e Mobilidade', acts: ['Transferência', 'Destacamento', 'Reafectação', 'Comissão de Serviço'] },
      { group: 'Férias e Licenças', acts: ['Licença', 'Férias'] },
      { group: 'Saúde e Óbitos', acts: ['Junta de Saúde', 'Óbito'] },
      { group: 'Reserva e Reforma', acts: ['Reserva', 'Reforma'] },
      { group: 'Processos Disciplinares', acts: ['Advertência', 'Repreensão', 'Multa', 'Suspensão', 'Demissão', 'Expulsão'] },
      { group: 'Provimento e Cessação', acts: ['Nomeação', 'Recondução', 'Designação', 'Cessação de Funções', 'Exoneração', 'Reintegração'] }
    ];
    const insertActType = db.prepare('INSERT INTO act_types (id, group_name, act_name) VALUES (?, ?, ?)');
    defaultActs.forEach(g => {
      g.acts.forEach(a => {
        const id = 'actt_' + Math.random().toString(36).substr(2, 9);
        insertActType.run(id, g.group, a);
      });
    });
  }

  // Inserir dados padrao da seguranca se nao existirem
  const sec = db.prepare('SELECT id FROM security_settings WHERE id = 1').get();
  if (!sec) {
    db.prepare("INSERT INTO security_settings (id, data) VALUES (1, ?)").run(JSON.stringify({
      sessionTimeoutMinutes: 30,
      loginMaxAttempts: 5,
      loginLockoutMinutes: 15,
      passwordExpirationDays: 90,
      passwordMinLength: 6
    }));
  }

  // Inserir Role Super Admin padrao se a tabela estiver vazia
  const roleCount = db.prepare('SELECT COUNT(*) as c FROM roles').get().c;
  if (roleCount === 0) {
    const ALL_MODULES = [
      'Dashboard', 'Funcionarios', 'Estrutura Organizacional', 'Processo Disciplinar',
      'Formacao', 'Avaliacao de Desempenho', 'Ferias', 'Licencas', 'Transferencias',
      'Promocoes', 'Carreiras', 'Categorias', 'Relatorios', 'Configuracoes',
      'Utilizadores', 'Auditoria', 'Efetividade'
    ];
    const superAdminPerms = ALL_MODULES.reduce((acc, mod) => {
      acc[mod] = ['Visualizar', 'Criar', 'Editar', 'Eliminar', 'Validar', 'Exportar', 'Importar', 'Imprimir', 'Administrar'];
      return acc;
    }, {});
    
    db.prepare('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)').run(
      'super_admin', 'Super Administrador', 'Acesso total a todas as funcionalidades', JSON.stringify(superAdminPerms)
    );
  }  // Inserir User Admin padrao se a tabela estiver vazia
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount === 0) {
    const hash = (pwd) => bcrypt.hashSync(pwd, 10);

    db.prepare(`INSERT INTO users (id, name, username, password, role_id, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'usr_admin', 'Administrador Principal', 'admin', hash('admin123'), 'super_admin', 'Ativo'
    );
    // Inserir role user se nao existir
    db.prepare("INSERT OR IGNORE INTO roles (id, name, description, permissions) VALUES ('user', 'Utilizador Normal', 'Acesso básico de consulta', '{}')").run();
    db.prepare(`INSERT INTO users (id, name, username, password, role_id, status) VALUES (?, ?, ?, ?, ?, ?)`).run(
      'usr_basic', 'Utilizador Padrão', 'user', hash('user123'), 'user', 'Ativo'
    );
  }

  // Migrações e correções automáticas de nomenclatura para esquemas existentes
  try { db.exec("ALTER TABLE directorates ADD COLUMN province TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE sections ADD COLUMN district_directorate_id TEXT DEFAULT NULL REFERENCES district_directorates(id)"); } catch (e) {}
  try { db.exec("ALTER TABLE employees ADD COLUMN unit_type TEXT DEFAULT 'normal'"); } catch (e) {}
  try { db.exec("ALTER TABLE employees ADD COLUMN district_directorate_id TEXT DEFAULT NULL REFERENCES district_directorates(id)"); } catch (e) {}
  try { db.exec("ALTER TABLE employees ADD COLUMN provincial_directorate_id TEXT DEFAULT NULL REFERENCES directorates(id)"); } catch (e) {}
  try { db.exec("ALTER TABLE district_directorates ADD COLUMN sort_order INTEGER DEFAULT 0"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN nuit TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("UPDATE users SET nuit = username WHERE nuit IS NULL OR nuit = ''"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN delegation_status TEXT DEFAULT 'Aprovado'"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN delegation_requested_by TEXT DEFAULT NULL"); } catch (e) {}
  try { db.exec("ALTER TABLE users ADD COLUMN delegation_approved_by TEXT DEFAULT NULL"); } catch (e) {}

  // Auto-seeding do Utilizador de Teste do Departamento de Recursos Humanos da Cidade de Maputo
  try {
    const hash55555 = bcrypt.hashSync('55555', 10);
    let maputoDir = db.prepare("SELECT id FROM directorates WHERE province = 'Cidade de Maputo' OR lower(name) LIKE '%cidade de maputo%'").get();
    const maputoDirId = maputoDir ? maputoDir.id : 'dir_maputo_cidade';
    let adminRole = db.prepare("SELECT id FROM roles WHERE id = 'usuario_admin' OR name LIKE '%Chefes dos Departamentos Provinciais%'").get();
    const adminRoleId = adminRole ? adminRole.id : 'usuario_admin';

    const existingUser = db.prepare("SELECT id FROM users WHERE username = 'Administrador' OR nuit = 'Administrador'").get();
    if (existingUser) {
      db.prepare("UPDATE users SET name = 'Administrador RH (Cidade de Maputo)', password = ?, role_id = ?, directorate_id = ?, status = 'Ativo' WHERE id = ?")
        .run(hash55555, adminRoleId, maputoDirId, existingUser.id);
    } else {
      db.prepare("INSERT INTO users (id, name, username, nuit, password, role_id, directorate_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        'usr_admin_maputo_cidade',
        'Administrador RH (Cidade de Maputo)',
        'Administrador',
        'Administrador',
        hash55555,
        adminRoleId,
        maputoDirId,
        'Ativo'
      );
    }
  } catch (e) {
    console.error('[db.js] Erro ao semear Administrador Cidade de Maputo:', e.message);
  }

  // Rectificação profunda e deduplicação de TODAS as Direcções Provinciais
  try {
    const PROVINCES_LIST = [
      { name: 'Cidade de Maputo', dirName: 'Direcção da Cidade de Maputo' },
      { name: 'Maputo Província', dirName: 'Direcção Provincial de Maputo' },
      { name: 'Gaza', dirName: 'Direcção Provincial de Gaza' },
      { name: 'Inhambane', dirName: 'Direcção Provincial de Inhambane' },
      { name: 'Sofala', dirName: 'Direcção Provincial de Sofala' },
      { name: 'Manica', dirName: 'Direcção Provincial de Manica' },
      { name: 'Tete', dirName: 'Direcção Provincial de Tete' },
      { name: 'Zambézia', dirName: 'Direcção Provincial de Zambézia' },
      { name: 'Nampula', dirName: 'Direcção Provincial de Nampula' },
      { name: 'Niassa', dirName: 'Direcção Provincial de Niassa' },
      { name: 'Cabo Delgado', dirName: 'Direcção Provincial de Cabo Delgado' }
    ];

    PROVINCES_LIST.forEach(p => {
      const matching = db.prepare(`
        SELECT id, name, province FROM directorates 
        WHERE province = ? OR lower(name) LIKE ? OR lower(name) LIKE ?
      `).all(p.name, `%${p.name.toLowerCase()}%`, `%direc%${p.name.toLowerCase()}%`);

      if (matching.length > 1) {
        let mainDir = matching.find(m => m.name === p.dirName) || matching[0];
        db.prepare("UPDATE directorates SET name = ?, province = ? WHERE id = ?").run(p.dirName, p.name, mainDir.id);

        matching.forEach(dup => {
          if (dup.id !== mainDir.id) {
            db.prepare("UPDATE district_directorates SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(mainDir.id, dup.id);
            db.prepare("UPDATE departments SET directorate_id = ? WHERE directorate_id = ?").run(mainDir.id, dup.id);
            db.prepare("UPDATE employees SET directorate_id = ? WHERE directorate_id = ?").run(mainDir.id, dup.id);
            db.prepare("UPDATE employees SET provincial_directorate_id = ? WHERE provincial_directorate_id = ?").run(mainDir.id, dup.id);
            db.prepare("DELETE FROM directorates WHERE id = ?").run(dup.id);
          }
        });
      }
    });
  } catch (e) {}

  // Rectificação e deduplicação de TODAS as Direcções Distritais na BD
  try {
    const allDistricts = db.prepare('SELECT id, name, province, provincial_directorate_id FROM district_directorates').all();
    const map = new Map();

    const cleanName = (rawName) => {
      if (!rawName) return '';
      let str = rawName.trim();
      str = str.replace(/^(Direc?çã?o\s+Distrital\s+(de|da|do)?\s*)+/i, '');
      str = str.replace(/^(Direc?çã?o\s+Distrital\s*)+/i, '');
      str = str.trim();
      if (!str) return '';
      const lower = str.toLowerCase();
      if (['matola', 'beira', 'manhiça', 'namaacha', 'mavia', 'maganja da costa'].includes(lower) || lower.startsWith('ilha ') || lower.startsWith('cidade ')) {
        return `Direcção Distrital da ${str}`;
      }
      return `Direcção Distrital de ${str}`;
    };

    allDistricts.forEach(d => {
      const canonicalName = cleanName(d.name);
      const key = `${canonicalName.toLowerCase()}||${(d.province || '').toLowerCase()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push({ ...d, canonicalName });
    });

    map.forEach((items) => {
      if (items.length > 1) {
        const mainDist = items[0];
        db.prepare('UPDATE district_directorates SET name = ? WHERE id = ?').run(mainDist.canonicalName, mainDist.id);
        for (let i = 1; i < items.length; i++) {
          const dup = items[i];
          db.prepare('UPDATE sections SET district_directorate_id = ? WHERE district_directorate_id = ?').run(mainDist.id, dup.id);
          db.prepare('UPDATE employees SET district_directorate_id = ? WHERE district_directorate_id = ?').run(mainDist.id, dup.id);
          db.prepare('DELETE FROM district_directorates WHERE id = ?').run(dup.id);
        }
      } else if (items.length === 1) {
        const dist = items[0];
        if (dist.name !== dist.canonicalName) {
          db.prepare('UPDATE district_directorates SET name = ? WHERE id = ?').run(dist.canonicalName, dist.id);
        }
      }
    });
  } catch (e) {}

  // Auto-seeding das Direções Provinciais se a tabela estiver vazia
  const dirCount = db.prepare('SELECT COUNT(*) as c FROM directorates').get().c;
  if (dirCount === 0) {
    const provincialDirs = [
      { id: "dir_maputo_cidade", name: "Direcção da Cidade de Maputo", province: "Cidade de Maputo" },
      { id: "dir_maputo_provincia", name: "Direcção Provincial de Maputo", province: "Maputo Província" },
      { id: "dir_gaza", name: "Direcção Provincial de Gaza", province: "Gaza" },
      { id: "dir_inhambane", name: "Direcção Provincial de Inhambane", province: "Inhambane" },
      { id: "dir_sofala", name: "Direcção Provincial de Sofala", province: "Sofala" },
      { id: "dir_manica", name: "Direcção Provincial de Manica", province: "Manica" },
      { id: "dir_tete", name: "Direcção Provincial de Tete", province: "Tete" },
      { id: "dir_zambezia", name: "Direcção Provincial de Zambézia", province: "Zambézia" },
      { id: "dir_nampula", name: "Direcção Provincial de Nampula", province: "Nampula" },
      { id: "dir_niassa", name: "Direcção Provincial de Niassa", province: "Niassa" },
      { id: "dir_cabo_delgado", name: "Direcção Provincial de Cabo Delgado", province: "Cabo Delgado" }
    ];

    const insertDir = db.prepare(`
      INSERT INTO directorates (id, name, province, is_active)
      VALUES (?, ?, ?, 1)
    `);

    provincialDirs.forEach(d => {
      insertDir.run(d.id, d.name, d.province);
    });
    console.log('[DB] Seeding de Direções Provinciais concluído.');
  }

  // Auto-seeding das Direções Distritais de Moçambique
  const districtCount = db.prepare('SELECT COUNT(*) as c FROM district_directorates').get().c;
  if (districtCount === 0) {
    const districtsData = [
      { province: "Cidade de Maputo", districts: ["KaMpfumo", "Nlhamankulu", "KaMaxakeni", "KaMavota", "KaMubukwana", "KaTembe", "KaNyaka"] },
      { province: "Maputo Província", districts: ["Boane", "Magude", "Manhiça", "Marracuene", "Matola", "Matutuíne", "Moamba", "Namaacha"] },
      { province: "Gaza", districts: ["Bilene", "Chibuto", "Chicualacuala", "Chigubo", "Chókwè", "Guijá", "Limpopo", "Mabalane", "Macia", "Mandlakaze", "Mapai", "Massangena", "Massingir", "Xai-Xai"] },
      { province: "Inhambane", districts: ["Funhalouro", "Govuro", "Homoíne", "Inhambane", "Inharrime", "Inhassoro", "Jangamo", "Mabote", "Massinga", "Maxixe", "Morrumbene", "Panda", "Vilankulo", "Zavala"] },
      { province: "Sofala", districts: ["Beira", "Búzi", "Caia", "Chemba", "Cheringoma", "Chibabava", "Dondo", "Gorongosa", "Machanga", "Maringué", "Muanza", "Nhamatanda"] },
      { province: "Manica", districts: ["Bárue", "Chimoio", "Gondola", "Guro", "Macate", "Machaze", "Macossa", "Manica", "Mossurize", "Sussundenga", "Tambara", "Vanduzi"] },
      { province: "Tete", districts: ["Angónia", "Cahora-Bassa", "Changara", "Chifunde", "Chiúta", "Dôa", "Macanga", "Magoé", "Marávia", "Moatize", "Mutarara", "Tete", "Tsangano", "Zumbo"] },
      { province: "Zambézia", districts: ["Alto Molócuè", "Chinde", "Derre", "Gilé", "Gurué", "Ile", "Inhassunge", "Lugela", "Maganja da Costa", "Milange", "Mocuba", "Mopeia", "Morrumbala", "Mulevala", "Namacurra", "Namarroi", "Nicoadala", "Pebane", "Quelimane"] },
      { province: "Nampula", districts: ["Angoche", "Eráti", "Ilha de Moçambique", "Lalaua", "Larde", "Liúpo", "Malema", "Meconta", "Mecubúri", "Memba", "Mogincual", "Mogovolas", "Moma", "Monapo", "Mossuril", "Muecate", "Murrupula", "Nacala Porto", "Nacala-a-Velha", "Nampula", "Rapale", "Ribáuè"] },
      { province: "Niassa", districts: ["Chimbonila", "Cuamba", "Lago", "Lichinga", "Majune", "Mandimba", "Marrupa", "Maúa", "Mavago", "Mecanhelas", "Mecula", "Metarica", "Muembe", "N'gauma", "Nipepe", "Sanga"] },
      { province: "Cabo Delgado", districts: ["Ancuabe", "Balama", "Chiúre", "Ibo", "Macomia", "Mecúfi", "Meluco", "Metuge", "Mocímboa da Praia", "Montepuez", "Mueda", "Muidumbe", "Namuno", "Nangade", "Palma", "Pemba", "Quissanga"] }
    ];

    const insertDist = db.prepare(`
      INSERT INTO district_directorates (id, name, code, provincial_directorate_id, province, status, is_active)
      VALUES (?, ?, ?, ?, ?, 'Ativo', 1)
    `);

    const insertSection = db.prepare(`
      INSERT INTO sections (id, name, division_id, department_id, district_directorate_id, is_active)
      VALUES (?, ?, NULL, NULL, ?, 1)
    `);

    const standardSections = [
      "Secção de Investigação e Instrução Criminal",
      "Secção de Investigação Operativa",
      "Secção Técnica Criminalística",
      "Secção de Identificação e Registo Policial",
      "Secção de Armamento e Segurança",
      "Piquete Operativo",
      "Secção de Apoio e Documentação",
      "Secretaria"
    ];

    let count = 1;
    districtsData.forEach(prov => {
      // Procurar ID da Direção Provincial correspondente
      const matchedProvDir = db.prepare("SELECT id FROM directorates WHERE province = ?").get(prov.province);
      const provincialDirectorateId = matchedProvDir ? matchedProvDir.id : null;

      prov.districts.forEach(dist => {
        const cleanName = dist.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "");
        const id = 'dist_' + dist.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
        const code = `DIST-${cleanName.substring(0, 4).toUpperCase()}-${1000 + count}`;
        insertDist.run(id, dist, code, provincialDirectorateId, prov.province);

        standardSections.forEach((secName, secIdx) => {
          const secId = `sec_dist_${dist.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${secIdx}_${Math.random().toString(36).substr(2, 4)}`;
          insertSection.run(secId, secName, id);
        });

        count++;
      });
    });
    console.log('[DB] Seeding de Direções Distritais e Secções concluído.');
  }

  console.log('[DB] Schema inicializado em:', DB_PATH);
}
