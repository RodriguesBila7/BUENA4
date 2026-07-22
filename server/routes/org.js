/**
 * server/routes/org.js
 * CRUD completo para Estrutura Organica:
 *   Direccoes, Departamentos, Reparticoes, Seccoes, Carreiras, Categorias
 */

import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// ─── Utilitarios ─────────────────────────────────────────────────────────────
const rowToJs = (row) => {
  if (!row) return null;
  return {
    id:         row.id,
    name:       row.name,
    isActive:   row.is_active === 1,
    sortOrder:  row.sort_order,
    // campos opcionais de ligacao
    ...(row.province !== undefined && { province: row.province }),
    ...(row.directorate_id !== undefined && { directorateId: row.directorate_id }),
    ...(row.department_id  !== undefined && { departmentId:  row.department_id  }),
    ...(row.division_id    !== undefined && { divisionId:    row.division_id || '' }),
    ...(row.district_directorate_id !== undefined && { districtDirectorateId: row.district_directorate_id || '' }),
    ...(row.career_id      !== undefined && { careerId:      row.career_id      }),
  };
};

// ─── GET /api/org — devolver toda a estrutura organica ───────────────────────
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const result = {
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
    res.json(result);
  } catch (e) {
    console.error('[org GET /]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/org/bootstrap-districts — Popular distritos de MZ ───────────
router.post('/bootstrap-districts', (req, res) => {
  try {
    const db = getDb();
    
    // Lista oficial de distritos por província
    const mozDistricts = {
      'Maputo Província': ['Boane', 'Magude', 'Manhiça', 'Marracuene', 'Matutuíne', 'Moamba', 'Namaacha', 'Matola'],
      'Cidade de Maputo': ['KaMpfumo', 'Nlhamankulu', 'KaMaxakeni', 'KaMavota', 'KaMubukwana', 'KaTembe', 'KaNyaka'],
      'Gaza': ['Bilene', 'Chibuto', 'Chicualacuala', 'Chigubo', 'Chókwè', 'Chonguene', 'Guijá', 'Limpopo', 'Mabalane', 'Mandlakaze', 'Mapai', 'Massangena', 'Massingir', 'Xai-Xai'],
      'Inhambane': ['Funhalouro', 'Govuro', 'Homoíne', 'Inhambane', 'Inharrime', 'Inhassoro', 'Jangamo', 'Mabote', 'Massinga', 'Maxixe', 'Morrumbene', 'Panda', 'Vilankulo', 'Zavala'],
      'Sofala': ['Beira', 'Búzi', 'Caia', 'Chemba', 'Cheringoma', 'Chibabava', 'Dondo', 'Gorongosa', 'Machanga', 'Maringué', 'Marromeu', 'Muanza', 'Nhamatanda'],
      'Manica': ['Bárue', 'Chimoio', 'Gondola', 'Guro', 'Macate', 'Machaze', 'Macossa', 'Manica', 'Mossurize', 'Sussundenga', 'Tambara', 'Vanduzi'],
      'Tete': ['Angónia', 'Cahora-Bassa', 'Changara', 'Chifunde', 'Chiúta', 'Doa', 'Macanga', 'Magoe', 'Marávia', 'Moatize', 'Mutarara', 'Tete', 'Tsangano', 'Zumbo'],
      'Zambézia': ['Alto Molócue', 'Chinde', 'Derre', 'Gilé', 'Gurué', 'Ile', 'Inhassunge', 'Lugela', 'Maganja da Costa', 'Milange', 'Mocuba', 'Mocubela', 'Molumbo', 'Mopeia', 'Morrumbala', 'Mulevala', 'Namacurra', 'Namarroi', 'Nicoadala', 'Pebane', 'Quelimane', 'Luabo'],
      'Nampula': ['Angoche', 'Eráti', 'Ilha de Moçambique', 'Lalaua', 'Larde', 'Malema', 'Meconta', 'Mecubúri', 'Memba', 'Mogincual', 'Mogovolas', 'Moma', 'Monapo', 'Mossuril', 'Muecate', 'Murrupula', 'Nacala-a-Velha', 'Nacala Porto', 'Nampula', 'Rapale', 'Ribáuè', 'Liúpo'],
      'Niassa': ["Cuamba", "Lago", "Lichinga", "Majune", "Mandimba", "Marrupa", "Maúa", "Mecanhelas", "Mecula", "Metarica", "Muembe", "N'gauma", "Nipepe", "Sanga", "Chimbunila"],
      'Cabo Delgado': ['Ancuabe', 'Balama', 'Chiúre', 'Ibo', 'Macomia', 'Mecúfi', 'Meluco', 'Metuge', 'Mocímboa da Praia', 'Montepuez', 'Mueda', 'Muidumbe', 'Namuno', 'Nangade', 'Palma', 'Pemba', 'Quissanga']
    };

    let addedCount = 0;
    const stmtCheck = db.prepare('SELECT id FROM district_directorates WHERE name = ? AND province = ?');
    const stmtInsert = db.prepare(`
      INSERT INTO district_directorates (id, name, code, province, status, is_active, sort_order)
      VALUES (?, ?, ?, ?, 'Ativo', 1, 0)
    `);

    db.transaction(() => {
      for (const [province, districts] of Object.entries(mozDistricts)) {
        for (const district of districts) {
          const name = `Direção Distrital de ${district}`;
          
          // Verifica se já existe (evita duplicados)
          const exists = stmtCheck.get(name, province);
          if (!exists) {
            const code = `RD-${district.substring(0, 3).toUpperCase()}-${Date.now().toString(36).substring(4)}${Math.random().toString(36).substr(2,4)}`;
            const id = `dist-${Date.now().toString(36)}-${Math.random().toString(36).substr(2,6)}`;
            
            stmtInsert.run(id, name, code, province);
            addedCount++;
          }
        }
      }
    })();

    res.json({ success: true, message: `${addedCount} Direções Distritais adicionadas com sucesso!`, addedCount });
  } catch (e) {
    console.error('[org POST /bootstrap-districts]', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/org/migrate — importar dados do localStorage (one-time) ───────
router.post('/migrate', (req, res) => {
  const data = req.body;
  if (!data) return res.status(400).json({ error: 'No data' });

  const db = getDb();
  const insert = db.transaction(() => {
    const insertDir = db.prepare('INSERT OR IGNORE INTO directorates (id, name, is_active, sort_order) VALUES (?, ?, ?, ?)');
    const insertDep = db.prepare('INSERT OR IGNORE INTO departments  (id, directorate_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?)');
    const insertDiv = db.prepare('INSERT OR IGNORE INTO divisions    (id, department_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?)');
    const insertSec = db.prepare('INSERT OR IGNORE INTO sections     (id, department_id, division_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?)');
    const insertCar = db.prepare('INSERT OR IGNORE INTO careers      (id, name, is_active, sort_order) VALUES (?, ?, ?, ?)');
    const insertCat = db.prepare('INSERT OR IGNORE INTO categories   (id, career_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?)');

    let counts = { directorates: 0, departments: 0, divisions: 0, sections: 0, careers: 0, categories: 0 };

    (data.directorates || []).forEach((d, i) => { insertDir.run(d.id, d.name, d.isActive ? 1 : 0, i); counts.directorates++; });
    (data.departments  || []).forEach((d, i) => { insertDep.run(d.id, d.directorateId, d.name, d.isActive ? 1 : 0, i); counts.departments++; });
    (data.divisions    || []).forEach((d, i) => { insertDiv.run(d.id, d.departmentId, d.name, d.isActive ? 1 : 0, i); counts.divisions++; });
    (data.sections     || []).forEach((s, i) => { insertSec.run(s.id, s.departmentId || null, s.divisionId || null, s.name, s.isActive ? 1 : 0, i); counts.sections++; });
    (data.careers      || []).forEach((c, i) => { insertCar.run(c.id, c.name, c.isActive ? 1 : 0, i); counts.careers++; });
    (data.categories   || []).forEach((c, i) => { insertCat.run(c.id, c.careerId, c.name, c.isActive ? 1 : 0, i); counts.categories++; });

    return counts;
  });

  try {
    const counts = insert();
    res.json({ success: true, counts });
  } catch (e) {
    console.error('[org migrate]', e);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECCOES
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/directorates', (req, res) => {
  const { id, name, province } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM directorates WHERE lower(name) = lower(?)').get(name.trim());
    if (exists) return res.status(409).json({ error: 'duplicate' });

    if (province) {
      const activeProv = db.prepare('SELECT id FROM directorates WHERE province = ? AND is_active = 1').get(province);
      if (activeProv) return res.status(409).json({ error: 'province_duplicate' });
    }

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM directorates').get().m;
    db.prepare('INSERT INTO directorates (id, name, province, is_active, sort_order) VALUES (?, ?, ?, 1, ?)').run(id, name.trim(), province || null, maxOrder + 1);

    // Se for Provincial, associar os distritos automaticamente
    if (province) {
      db.prepare('UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = ?').run(id, province);

      // Criar as 8 secções padrão para cada distrito desta província se não existirem
      const districts = db.prepare('SELECT id FROM district_directorates WHERE provincial_directorate_id = ?').all(id);
      const DISTRICT_SECTIONS = [
        'Secção de Investigação e Instrução Criminal',
        'Secção de Investigação Operativa',
        'Secção Técnica Criminalística',
        'Secção de Identificação e Registo Policial',
        'Secção de Armamento e Segurança',
        'Piquete Operativo',
        'Secção de Apoio e Documentação',
        'Secretaria'
      ];
      
      const insertSec = db.prepare('INSERT INTO sections (id, district_directorate_id, name, is_active, sort_order) VALUES (?, ?, ?, 1, ?)');
      districts.forEach(dist => {
        const count = db.prepare('SELECT COUNT(*) as c FROM sections WHERE district_directorate_id = ?').get(dist.id).c;
        if (count === 0) {
          DISTRICT_SECTIONS.forEach((secName, index) => {
            const secId = 'sec_dist_' + dist.id.substring(5) + '_' + index + '_' + Math.random().toString(36).substr(2, 4);
            insertSec.run(secId, dist.id, secName, index + 1);
          });
        }
      });
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/directorates/:id', (req, res) => {
  const { name, province } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM directorates WHERE lower(name) = lower(?) AND id != ?').get(name.trim(), req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate' });

    if (province) {
      const activeProv = db.prepare('SELECT id FROM directorates WHERE province = ? AND is_active = 1 AND id != ?').get(province, req.params.id);
      if (activeProv) return res.status(409).json({ error: 'province_duplicate' });
    }

    // Obter província antiga
    const oldDir = db.prepare('SELECT province FROM directorates WHERE id = ?').get(req.params.id);
    const oldProvince = oldDir ? oldDir.province : null;

    db.prepare('UPDATE directorates SET name = ?, province = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), province || null, req.params.id);

    // Se a província mudou, ou foi desassociada, desvincular distritos antigos
    if (oldProvince && oldProvince !== province) {
      db.prepare('UPDATE district_directorates SET provincial_directorate_id = NULL WHERE provincial_directorate_id = ?').run(req.params.id);
    }

    // Associar novos distritos
    if (province) {
      db.prepare('UPDATE district_directorates SET provincial_directorate_id = ? WHERE province = ?').run(req.params.id, province);

      // Criar as 8 secções padrão para cada distrito desta província se não existirem
      const districts = db.prepare('SELECT id FROM district_directorates WHERE provincial_directorate_id = ?').all(req.params.id);
      const DISTRICT_SECTIONS = [
        'Secção de Investigação e Instrução Criminal',
        'Secção de Investigação Operativa',
        'Secção Técnica Criminalística',
        'Secção de Identificação e Registo Policial',
        'Secção de Armamento e Segurança',
        'Piquete Operativo',
        'Secção de Apoio e Documentação',
        'Secretaria'
      ];
      
      const insertSec = db.prepare('INSERT INTO sections (id, district_directorate_id, name, is_active, sort_order) VALUES (?, ?, ?, 1, ?)');
      districts.forEach(dist => {
        const count = db.prepare('SELECT COUNT(*) as c FROM sections WHERE district_directorate_id = ?').get(dist.id).c;
        if (count === 0) {
          DISTRICT_SECTIONS.forEach((secName, index) => {
            const secId = 'sec_dist_' + dist.id.substring(5) + '_' + index + '_' + Math.random().toString(36).substr(2, 4);
            insertSec.run(secId, dist.id, secName, index + 1);
          });
        }
      });
    }

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/directorates/:id/status', (req, res) => {
  try {
    const db = getDb();
    const dir = db.prepare('SELECT is_active, province FROM directorates WHERE id = ?').get(req.params.id);
    if (!dir) return res.status(404).json({ error: 'not_found' });

    const newStatus = dir.is_active === 1 ? 0 : 1;

    // Se estamos a activar, validar que nao existe outra activa para esta provincia
    if (newStatus === 1 && dir.province) {
      const activeProv = db.prepare('SELECT id FROM directorates WHERE province = ? AND is_active = 1 AND id != ?').get(dir.province, req.params.id);
      if (activeProv) return res.status(409).json({ error: 'province_duplicate' });
    }

    db.prepare('UPDATE directorates SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStatus, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/directorates/:id', (req, res) => {
  try {
    const db = getDb();
    const hasChildren = db.prepare('SELECT id FROM departments WHERE directorate_id = ? LIMIT 1').get(req.params.id);
    if (hasChildren) return res.status(409).json({ error: 'has_children' });

    // Verificar se tem funcionários normais
    const hasEmployees = db.prepare('SELECT id FROM employees WHERE directorate_id = ? LIMIT 1').get(req.params.id);
    if (hasEmployees) return res.status(409).json({ error: 'has_employees' });

    // Desvincular distritos
    db.prepare('UPDATE district_directorates SET provincial_directorate_id = NULL WHERE provincial_directorate_id = ?').run(req.params.id);

    db.prepare('DELETE FROM directorates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPARTAMENTOS
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/departments', (req, res) => {
  const { id, directorateId, name } = req.body;
  if (!name?.trim() || !directorateId) return res.status(400).json({ error: 'Campos obrigatorios' });
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM departments WHERE lower(name) = lower(?) AND directorate_id = ?').get(name.trim(), directorateId);
    if (exists) return res.status(409).json({ error: 'duplicate' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM departments WHERE directorate_id = ?').get(directorateId).m;
    db.prepare('INSERT INTO departments (id, directorate_id, name, is_active, sort_order) VALUES (?, ?, ?, 1, ?)').run(id, directorateId, name.trim(), maxOrder + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/departments/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const target = db.prepare('SELECT directorate_id FROM departments WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'not_found' });
    const dup = db.prepare('SELECT id FROM departments WHERE lower(name) = lower(?) AND directorate_id = ? AND id != ?').get(name.trim(), target.directorate_id, req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate' });
    db.prepare('UPDATE departments SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/departments/:id/status', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE departments SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/departments/:id', (req, res) => {
  try {
    const db = getDb();
    const hasDivisions = db.prepare('SELECT id FROM divisions WHERE department_id = ? LIMIT 1').get(req.params.id);
    const hasSections  = db.prepare('SELECT id FROM sections  WHERE department_id = ? LIMIT 1').get(req.params.id);
    if (hasDivisions || hasSections) return res.status(409).json({ error: 'has_children' });
    db.prepare('DELETE FROM departments WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REPARTICOES
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/divisions', (req, res) => {
  const { id, departmentId, name } = req.body;
  if (!name?.trim() || !departmentId) return res.status(400).json({ error: 'Campos obrigatorios' });
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM divisions WHERE lower(name) = lower(?) AND department_id = ?').get(name.trim(), departmentId);
    if (exists) return res.status(409).json({ error: 'duplicate' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM divisions WHERE department_id = ?').get(departmentId).m;
    db.prepare('INSERT INTO divisions (id, department_id, name, is_active, sort_order) VALUES (?, ?, ?, 1, ?)').run(id, departmentId, name.trim(), maxOrder + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/divisions/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const target = db.prepare('SELECT department_id FROM divisions WHERE id = ?').get(req.params.id);
    if (!target) return res.status(404).json({ error: 'not_found' });
    const dup = db.prepare('SELECT id FROM divisions WHERE lower(name) = lower(?) AND department_id = ? AND id != ?').get(name.trim(), target.department_id, req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate' });
    db.prepare('UPDATE divisions SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/divisions/:id/status', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE divisions SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/divisions/:id', (req, res) => {
  try {
    const db = getDb();
    const hasChildren = db.prepare('SELECT id FROM sections WHERE division_id = ? LIMIT 1').get(req.params.id);
    if (hasChildren) return res.status(409).json({ error: 'has_children' });
    db.prepare('DELETE FROM divisions WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECCOES
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/sections', (req, res) => {
  const { id, parentId, parentType, name } = req.body;
  if (!name?.trim() || !parentId) return res.status(400).json({ error: 'Campos obrigatorios' });
  try {
    const db = getDb();
    const depId = parentType === 'departmentId' ? parentId : null;
    const divId = parentType === 'divisionId'   ? parentId : null;
    const distId = (parentType === 'districtId' || parentType === 'district_directorate_id') ? parentId : null;
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM sections').get().m;
    db.prepare('INSERT INTO sections (id, department_id, division_id, district_directorate_id, name, is_active, sort_order) VALUES (?, ?, ?, ?, ?, 1, ?)').run(id, depId, divId, distId, name.trim(), maxOrder + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/sections/:id', (req, res) => {
  const { name, parentId, parentType } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const depId = parentType === 'departmentId' ? parentId : null;
    const divId = parentType === 'divisionId'   ? parentId : null;
    const distId = (parentType === 'districtId' || parentType === 'district_directorate_id') ? parentId : null;
    db.prepare('UPDATE sections SET name = ?, department_id = ?, division_id = ?, district_directorate_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), depId, divId, distId, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/sections/:id/status', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE sections SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/sections/:id', (req, res) => {
  try {
    const db = getDb();
    const hasEmployees = db.prepare('SELECT id FROM employees WHERE section_id = ? LIMIT 1').get(req.params.id);
    if (hasEmployees) return res.status(409).json({ error: 'has_employees' });
    db.prepare('DELETE FROM sections WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARREIRAS
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/careers', (req, res) => {
  const { id, name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM careers WHERE lower(name) = lower(?)').get(name.trim());
    if (exists) return res.status(409).json({ error: 'duplicate' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM careers').get().m;
    db.prepare('INSERT INTO careers (id, name, is_active, sort_order) VALUES (?, ?, 1, ?)').run(id, name.trim(), maxOrder + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/careers/:id', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM careers WHERE lower(name) = lower(?) AND id != ?').get(name.trim(), req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate' });
    db.prepare('UPDATE careers SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/careers/:id/status', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE careers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/careers/:id', (req, res) => {
  try {
    const db = getDb();
    const hasCategories = db.prepare('SELECT id FROM categories WHERE career_id = ? LIMIT 1').get(req.params.id);
    if (hasCategories) return res.status(409).json({ error: 'has_children' });
    db.prepare('DELETE FROM careers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORIAS
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/categories', (req, res) => {
  const { id, careerId, name } = req.body;
  if (!name?.trim() || !careerId) return res.status(400).json({ error: 'Campos obrigatorios' });
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM categories WHERE lower(name) = lower(?) AND career_id = ?').get(name.trim(), careerId);
    if (exists) return res.status(409).json({ error: 'duplicate' });
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM categories WHERE career_id = ?').get(careerId).m;
    db.prepare('INSERT INTO categories (id, career_id, name, is_active, sort_order) VALUES (?, ?, ?, 1, ?)').run(id, careerId, name.trim(), maxOrder + 1);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/categories/:id', (req, res) => {
  const { name, careerId } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatorio' });
  try {
    const db = getDb();
    const dup = db.prepare('SELECT id FROM categories WHERE lower(name) = lower(?) AND career_id = ? AND id != ?').get(name.trim(), careerId, req.params.id);
    if (dup) return res.status(409).json({ error: 'duplicate' });
    db.prepare('UPDATE categories SET name = ?, career_id = ?, updated_at = datetime(\'now\') WHERE id = ?').run(name.trim(), careerId, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/categories/:id/status', (req, res) => {
  try {
    const db = getDb();
    db.prepare('UPDATE categories SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/categories/:id', (req, res) => {
  try {
    const db = getDb();
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Reordenar ────────────────────────────────────────────────────────────────
router.post('/reorder', (req, res) => {
  const { table, id, direction } = req.body;
  const allowed = ['directorates','departments','divisions','sections','careers','categories','district_directorates'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'invalid table' });
  try {
    const db = getDb();
    const current = db.prepare(`SELECT id, sort_order FROM ${table} WHERE id = ?`).get(id);
    if (!current) return res.status(404).json({ error: 'not_found' });
    const op = direction === 'up' ? '<' : '>';
    const order = direction === 'up' ? 'DESC' : 'ASC';
    const neighbour = db.prepare(`SELECT id, sort_order FROM ${table} WHERE sort_order ${op} ? ORDER BY sort_order ${order} LIMIT 1`).get(current.sort_order);
    if (neighbour) {
      db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(neighbour.sort_order, id);
      db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(current.sort_order, neighbour.id);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/move', (req, res) => {
  const { table, draggedId, targetId } = req.body;
  const allowed = ['directorates','departments','divisions','sections','careers','categories','district_directorates'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'invalid table' });
  try {
    const db = getDb();
    const dragged = db.prepare(`SELECT id, sort_order FROM ${table} WHERE id = ?`).get(draggedId);
    const target = db.prepare(`SELECT id, sort_order FROM ${table} WHERE id = ?`).get(targetId);
    if (!dragged || !target) return res.status(404).json({ error: 'not_found' });

    const start = dragged.sort_order;
    const end = target.sort_order;

    db.transaction(() => {
      if (start < end) {
        // Move down: shift intermediate items up
        db.prepare(`UPDATE ${table} SET sort_order = sort_order - 1 WHERE sort_order > ? AND sort_order <= ?`).run(start, end);
      } else {
        // Move up: shift intermediate items down
        db.prepare(`UPDATE ${table} SET sort_order = sort_order + 1 WHERE sort_order >= ? AND sort_order < ?`).run(end, start);
      }
      db.prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`).run(end, draggedId);
    })();

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DIRECCOES DISTRITAIS
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/district-directorates', (req, res) => {
  const { id, name, code, provincialDirectorateId, notes } = req.body;
  if (!name?.trim() || !code?.trim() || !provincialDirectorateId) {
    return res.status(400).json({ error: 'Campos obrigatorios' });
  }
  try {
    const db = getDb();
    const exists = db.prepare('SELECT id FROM district_directorates WHERE lower(code) = lower(?)').get(code.trim());
    if (exists) return res.status(409).json({ error: 'duplicate_code' });

    const provDir = db.prepare('SELECT province FROM directorates WHERE id = ?').get(provincialDirectorateId);
    const province = provDir ? provDir.province : '';

    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM district_directorates').get().m;

    db.prepare(`
      INSERT INTO district_directorates (id, name, code, provincial_directorate_id, province, notes, status, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, 'Ativo', 1, ?)
    `).run(id, name.trim(), code.trim().toUpperCase(), provincialDirectorateId, province, notes || '', maxOrder + 1);

    // Criar as 8 secções padrão para este novo distrito
    const DISTRICT_SECTIONS = [
      'Secção de Investigação e Instrução Criminal',
      'Secção de Investigação Operativa',
      'Secção da Técnica Criminalística',
      'Secção de Identificação e Registo Policial',
      'Secção de Armamento e Segurança',
      'Piquete Operativo',
      'Secção de Apoio e Documentação',
      'Secretaria'
    ];
    const maxSecOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM sections').get().m;
    const insertSec = db.prepare('INSERT INTO sections (id, name, district_directorate_id, is_active, sort_order) VALUES (?, ?, ?, 1, ?)');
    DISTRICT_SECTIONS.forEach((secName, index) => {
      const secId = `sec_${id.substring(5)}_${index + 1}_${Date.now().toString(36)}`;
      insertSec.run(secId, secName, id, maxSecOrder + index + 1);
    });

    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/district-directorates/:id', (req, res) => {
  const { name, provincialDirectorateId, notes, status } = req.body;
  if (!name?.trim() || !provincialDirectorateId) {
    return res.status(400).json({ error: 'Nome e Direcao Provincial sao obrigatorios' });
  }
  try {
    const db = getDb();
    
    const provDir = db.prepare('SELECT province FROM directorates WHERE id = ?').get(provincialDirectorateId);
    const province = provDir ? provDir.province : '';

    db.prepare(`
      UPDATE district_directorates 
      SET name = ?, provincial_directorate_id = ?, province = ?, notes = ?, status = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(name.trim(), provincialDirectorateId, province, notes || '', status || 'Ativo', req.params.id);
    
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.patch('/district-directorates/:id/status', (req, res) => {
  try {
    const db = getDb();
    const current = db.prepare('SELECT is_active, status FROM district_directorates WHERE id = ?').get(req.params.id);
    if (!current) return res.status(404).json({ error: 'not_found' });
    const newActive = current.is_active === 1 ? 0 : 1;
    const newStatus = newActive === 1 ? 'Ativo' : 'Inativo';
    db.prepare('UPDATE district_directorates SET is_active = ?, status = ? WHERE id = ?').run(newActive, newStatus, req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/district-directorates/:id', (req, res) => {
  try {
    const db = getDb();
    // Verificar se tem funcionários
    const hasEmployees = db.prepare('SELECT id FROM employees WHERE district_directorate_id = ? AND is_active = 1 LIMIT 1').get(req.params.id);
    if (hasEmployees) return res.status(409).json({ error: 'has_employees' });

    db.transaction(() => {
      // Eliminar as secções deste distrito
      db.prepare('DELETE FROM sections WHERE district_directorate_id = ?').run(req.params.id);
      // Eliminar o distrito
      db.prepare('DELETE FROM district_directorates WHERE id = ?').run(req.params.id);
    })();
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
