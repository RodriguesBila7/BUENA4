/**
 * server/routes/employees.js
 * CRUD completo para Funcionarios
 */

import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// Converte uma linha da BD para o formato JS esperado pelo frontend
const rowToEmp = (row) => {
  if (!row) return null;
  const extra = row.extra_data ? JSON.parse(row.extra_data) : {};
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

// Converte dados JS para colunas da BD
const empToRow = (emp) => {
  const {
    id, nip, name, gender, birthDate, idNumber, nuit, address, email, phone, photo,
    directorateId, departmentId, divisionId, sectionId, careerId, categoryId,
    provinceId, districtId, status, isActive, admissionDate,
    unitType, districtDirectorateId,
    // Todos os restantes campos vao para extra_data
    createdAt, updatedAt, // ignorar
    ...extra
  } = emp;

  const isDistrict = unitType === 'district';

  return {
    id:            id,
    nip:           nip,
    name:          name,
    gender:        gender || null,
    birth_date:    birthDate || null,
    id_number:     idNumber || null,
    nuit:          nuit || null,
    address:       address || null,
    email:         email || null,
    phone:         phone || null,
    photo:         photo || null,
    unit_type:     unitType || 'normal',
    directorate_id: directorateId || null,
    department_id:  isDistrict ? null : (departmentId || null),
    division_id:    isDistrict ? null : (divisionId || null),
    district_directorate_id: isDistrict ? (districtDirectorateId || null) : null,
    section_id:     sectionId || null,
    career_id:      careerId || null,
    category_id:    categoryId || null,
    province_id:    provinceId || null,
    district_id:    districtId || null,
    status:        status || 'Ativo',
    is_active:     isActive !== false ? 1 : 0,
    admission_date: admissionDate || null,
    extra_data:    Object.keys(extra).length > 0 ? JSON.stringify(extra) : null,
  };
};

// GET /api/employees — lista todos
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM employees ORDER BY name').all();
    res.json(rows.map(rowToEmp));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/employees/:id — um funcionario
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not_found' });
    res.json(rowToEmp(row));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/employees — adicionar
router.post('/', (req, res) => {
  const emp = req.body;
  if (!emp.nip || !emp.name) return res.status(400).json({ error: 'NIP e Nome sao obrigatorios' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM employees WHERE nip = ?').get(emp.nip);
    if (dup) return res.status(409).json({ error: 'nip_duplicate' });
    const row = empToRow({ ...emp, id: emp.id || `emp-${Date.now()}-${Math.random().toString(36).substr(2,6)}` });
    db.prepare(`
      INSERT INTO employees (id, nip, name, gender, birth_date, id_number, nuit, address, email, phone, photo,
        unit_type, directorate_id, department_id, division_id, district_directorate_id, section_id, career_id, category_id,
        province_id, district_id, status, is_active, admission_date, extra_data)
      VALUES (@id, @nip, @name, @gender, @birth_date, @id_number, @nuit, @address, @email, @phone, @photo,
        @unit_type, @directorate_id, @department_id, @division_id, @district_directorate_id, @section_id, @career_id, @category_id,
        @province_id, @district_id, @status, @is_active, @admission_date, @extra_data)
    `).run(row);
    res.json({ success: true, id: row.id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/employees/:id — actualizar
router.put('/:id', (req, res) => {
  const emp = req.body;
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM employees WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not_found' });
    const dup = db.prepare('SELECT id FROM employees WHERE nip = ? AND id != ?').get(emp.nip, req.params.id);
    if (dup) return res.status(409).json({ error: 'nip_duplicate' });
    const row = empToRow({ ...emp, id: req.params.id });
    db.prepare(`
      UPDATE employees SET nip = @nip, name = @name, gender = @gender, birth_date = @birth_date,
        id_number = @id_number, nuit = @nuit, address = @address, email = @email, phone = @phone, photo = @photo,
        unit_type = @unit_type, directorate_id = @directorate_id, department_id = @department_id, division_id = @division_id,
        district_directorate_id = @district_directorate_id, section_id = @section_id, career_id = @career_id, category_id = @category_id,
        province_id = @province_id, district_id = @district_id, status = @status, is_active = @is_active,
        admission_date = @admission_date, extra_data = @extra_data, updated_at = datetime('now')
      WHERE id = @id
    `).run(row);

    // Sincronização profunda: se demitido ou expulso, elimina de outras funções
    if (req.body.status === 'Demitido' || req.body.status === 'Expulso') {
      db.prepare(`DELETE FROM admin_acts WHERE json_extract(data, '$.employeeId') = ? OR json_extract(data, '$.empId') = ?`).run(req.params.id, req.params.id);
      db.prepare(`DELETE FROM disciplinary WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
      db.prepare(`DELETE FROM transfers WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
      db.prepare(`DELETE FROM evaluations WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
      db.prepare(`DELETE FROM functional_history WHERE employee_id = ?`).run(req.params.id);
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/employees/:id (Soft Delete)
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE employees SET status = 'Apagado', is_active = 0 WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/employees/:id/permanent (Hard Delete com sincronização profunda)
router.delete('/:id/permanent', (req, res) => {
  try {
    const db = getDb();
    
    // Sincronização profunda: remover em todas as funções associadas
    db.prepare(`DELETE FROM admin_acts WHERE json_extract(data, '$.employeeId') = ? OR json_extract(data, '$.empId') = ?`).run(req.params.id, req.params.id);
    db.prepare(`DELETE FROM disciplinary WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
    db.prepare(`DELETE FROM transfers WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
    db.prepare(`DELETE FROM evaluations WHERE json_extract(data, '$.employeeId') = ?`).run(req.params.id);
    db.prepare(`DELETE FROM functional_history WHERE employee_id = ?`).run(req.params.id);
    
    db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/employees/:id/restore (Restaurar)
router.put('/:id/restore', (req, res) => {
  try {
    const db = getDb();
    db.prepare(`UPDATE employees SET status = 'Ativo', is_active = 1 WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/employees/bulk — importacao em massa
router.post('/bulk', (req, res) => {
  const { employees } = req.body;
  if (!Array.isArray(employees)) return res.status(400).json({ error: 'Array esperado' });
  const db = getDb();
  const insert = db.transaction((list) => {
    const currentNips = new Set(db.prepare('SELECT nip FROM employees').all().map(r => r.nip));
    const added = [], errors = [];
    list.forEach((emp, i) => {
      if (!emp.nip || !emp.name) { errors.push(`Linha ${i+2}: NIP e Nome sao obrigatorios`); return; }
      if (currentNips.has(emp.nip)) { errors.push(`Linha ${i+2}: NIP ${emp.nip} ja existe`); return; }
      const row = empToRow({ ...emp, id: `emp-${Date.now()}-${Math.random().toString(36).substr(2,6)}` });
      db.prepare(`
        INSERT INTO employees (id, nip, name, gender, birth_date, id_number, nuit, address, email, phone, photo,
          unit_type, directorate_id, department_id, division_id, district_directorate_id, section_id, career_id, category_id,
          province_id, district_id, status, is_active, admission_date, extra_data)
        VALUES (@id, @nip, @name, @gender, @birth_date, @id_number, @nuit, @address, @email, @phone, @photo,
          @unit_type, @directorate_id, @department_id, @division_id, @district_directorate_id, @section_id, @career_id, @category_id,
          @province_id, @district_id, @status, @is_active, @admission_date, @extra_data)
      `).run(row);
      currentNips.add(emp.nip);
      added.push(emp.nip);
    });
    return { added: added.length, errors };
  });
  try {
    const result = insert(employees);
    res.json({ success: result.errors.length === 0, ...result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/employees/migrate — importar do localStorage (one-time)
router.post('/migrate', (req, res) => {
  const { employees } = req.body;
  if (!Array.isArray(employees)) return res.status(400).json({ error: 'Array esperado' });
  const db = getDb();
  const migrate = db.transaction((list) => {
    let count = 0;
    list.forEach(emp => {
      try {
        const row = empToRow({ ...emp, id: emp.id || `emp-migr-${Math.random().toString(36).substr(2,9)}` });
        db.prepare(`INSERT OR IGNORE INTO employees (id, nip, name, gender, birth_date, id_number, nuit, address, email, phone, photo,
          unit_type, directorate_id, department_id, division_id, district_directorate_id, section_id, career_id, category_id,
          province_id, district_id, status, is_active, admission_date, extra_data)
        VALUES (@id, @nip, @name, @gender, @birth_date, @id_number, @nuit, @address, @email, @phone, @photo,
          @unit_type, @directorate_id, @department_id, @division_id, @district_directorate_id, @section_id, @career_id, @category_id,
          @province_id, @district_id, @status, @is_active, @admission_date, @extra_data)`).run(row);
        count++;
      } catch (e) { console.warn('Ignorando funcionario na migracao:', emp.nip, e.message); }
    });
    return count;
  });
  try {
    const count = migrate(employees);
    res.json({ success: true, migrated: count });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
