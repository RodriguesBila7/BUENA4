/**
 * scripts/sync_db.cjs
 * Sincroniza integralmente a base de dados SQLite (server/sernic.db)
 * com o ficheiro de dados do frontend Vercel (src/data/initialDbData.json).
 * Desta forma, a base de dados fica idêntica e completa nos dois sítios.
 */

const fs = require('fs');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'server', 'sernic.db');
const JSON_PATH = path.resolve(__dirname, '..', 'src', 'data', 'initialDbData.json');

function syncDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    console.warn(`[sync_db] Ficheiro SQLite não encontrado em: ${DB_PATH}. A ignorar sincronização.`);
    return;
  }

  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (err) {
    console.warn('[sync_db] better-sqlite3 não disponível no ambiente atual. Mantendo initialDbData.json existente.');
    return;
  }

  const db = new Database(DB_PATH);

  // Utilitários de conversão idênticos aos controllers do servidor
  const rowToEmp = (row) => {
    if (!row) return null;
    let extra = {};
    if (row.extra_data) {
      try { extra = JSON.parse(row.extra_data); } catch (e) {}
    }
    return {
      id:                    row.id,
      nip:                   row.nip,
      name:                  row.name,
      gender:                row.gender,
      birthDate:             row.birth_date,
      idNumber:              row.id_number,
      nuit:                  row.nuit,
      address:               row.address,
      email:                 row.email,
      phone:                 row.phone,
      photo:                 row.photo,
      unitType:              row.unit_type || 'normal',
      directorateId:         row.directorate_id,
      departmentId:          row.department_id,
      divisionId:            row.division_id,
      districtDirectorateId: row.district_directorate_id,
      sectionId:             row.section_id,
      careerId:              row.career_id,
      categoryId:            row.category_id,
      provinceId:            row.province_id,
      districtId:            row.district_id,
      status:                row.status,
      isActive:              row.is_active === 1,
      admissionDate:         row.admission_date,
      createdAt:             row.created_at,
      updatedAt:             row.updated_at,
      ...extra,
    };
  };

  const rowToJs = (row) => {
    if (!row) return null;
    return {
      id:         row.id,
      name:       row.name,
      isActive:   row.is_active === 1,
      sortOrder:  row.sort_order,
      ...(row.province !== undefined && { province: row.province }),
      ...(row.directorate_id !== undefined && { directorateId: row.directorate_id }),
      ...(row.department_id  !== undefined && { departmentId:  row.department_id  }),
      ...(row.division_id    !== undefined && { divisionId:    row.division_id || '' }),
      ...(row.district_directorate_id !== undefined && { districtDirectorateId: row.district_directorate_id || '' }),
      ...(row.career_id      !== undefined && { careerId:      row.career_id      }),
    };
  };

  const getGenericData = (tableName) => {
    try {
      const rows = db.prepare(`SELECT * FROM ${tableName} ORDER BY created_at DESC`).all();
      return rows.map(r => {
        let parsed = {};
        if (r.data) {
          try { parsed = JSON.parse(r.data); } catch (e) {}
        }
        return {
          ...parsed,
          id: r.id,
          createdAt: r.created_at || parsed.createdAt,
          updatedAt: r.updated_at || parsed.updatedAt
        };
      });
    } catch (e) {
      return [];
    }
  };

  // 1. Employees
  const employees = db.prepare('SELECT * FROM employees ORDER BY name').all().map(rowToEmp);

  // 2. Org Structure
  const org = {
    directorates: db.prepare('SELECT * FROM directorates ORDER BY sort_order, name').all().map(rowToJs),
    districtDirectorates: db.prepare('SELECT * FROM district_directorates ORDER BY sort_order, name').all().map(row => ({
      id: row.id,
      name: row.name,
      code: row.code,
      provincialDirectorateId: row.provincial_directorate_id || '',
      province: row.province,
      status: row.status,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      notes: row.notes || ''
    })),
    departments:  db.prepare('SELECT * FROM departments  ORDER BY sort_order, name').all().map(rowToJs),
    divisions:    db.prepare('SELECT * FROM divisions    ORDER BY sort_order, name').all().map(rowToJs),
    sections:     db.prepare('SELECT * FROM sections     ORDER BY sort_order, name').all().map(rowToJs),
    careers:      db.prepare('SELECT * FROM careers      ORDER BY sort_order, name').all().map(rowToJs),
    categories:   db.prepare('SELECT * FROM categories   ORDER BY sort_order, name').all().map(rowToJs),
  };

  // 3. Roles
  const roles = db.prepare('SELECT * FROM roles').all().map(r => {
    let perms = {};
    try { perms = typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}); } catch (e) {}
    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      permissions: perms
    };
  });

  // 4. Users (garantir senhas padrão para acesso offline/Vercel)
  const defaultPasswords = {
    '123922328': 'buenaverte7',
    'buenaverte': 'buenaverte7',
    'admin': 'admin123',
    'administrador': '55555',
    'user': 'user123'
  };

  const users = db.prepare('SELECT * FROM users').all().map(u => {
    const key = (u.username || '').toLowerCase();
    const nuitKey = (u.nuit || '').toLowerCase();
    const pwd = defaultPasswords[key] || defaultPasswords[nuitKey] || 'buenaverte7';
    return {
      id: u.id,
      name: u.name,
      username: u.username,
      nuit: u.nuit || u.username,
      role_id: u.role_id,
      role: u.role_id,
      directorate_id: u.directorate_id || null,
      status: u.status || 'Ativo',
      delegation_status: u.delegation_status || 'Aprovado',
      password: pwd,
      avatar: u.avatar || null,
      photo: u.avatar || null,
      created_at: u.created_at || new Date().toISOString()
    };
  });

  // 5. Tipos de Atos
  const actTypes = db.prepare('SELECT * FROM act_types ORDER BY group_name, act_name').all();

  // 6. Módulos genéricos (Atos Administrativos, Avaliações, Disciplinar, Transferências, Efetividade, Auditoria)
  const adminActs = getGenericData('admin_acts');
  const evaluations = getGenericData('evaluations');
  const disciplinary = getGenericData('disciplinary');
  const transfers = getGenericData('transfers');
  const effectiveness = getGenericData('effectiveness');
  const audit = getGenericData('audit_log');

  // 7. Security Settings
  let securitySettings = null;
  try {
    const secRow = db.prepare('SELECT * FROM security_settings LIMIT 1').get();
    if (secRow && secRow.data) {
      securitySettings = JSON.parse(secRow.data);
    }
  } catch (e) {}

  const fullData = {
    employees,
    org,
    users,
    roles,
    actTypes,
    adminActs,
    evaluations,
    disciplinary,
    transfers,
    effectiveness,
    audit,
    securitySettings
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(fullData, null, 2), 'utf8');
  console.log(`[sync_db] SUCESSO: Banco SQLite sincronizado com ${JSON_PATH}!`);
  console.log(`- Funcionários: ${employees.length}`);
  console.log(`- Direções Provinciais: ${org.directorates.length}`);
  console.log(`- Direções Distritais: ${org.districtDirectorates.length}`);
  console.log(`- Departamentos: ${org.departments.length}`);
  console.log(`- Repartições: ${org.divisions.length}`);
  console.log(`- Secções: ${org.sections.length}`);
  console.log(`- Carreiras: ${org.careers.length}`);
  console.log(`- Categorias: ${org.categories.length}`);
  console.log(`- Utilizadores: ${users.length}`);
  console.log(`- Perfis: ${roles.length}`);
  console.log(`- Tipos de Actos: ${actTypes.length}`);
  console.log(`- Actos Administrativos: ${adminActs.length}`);
}

syncDatabase();
