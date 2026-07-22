import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

// GET all admin acts (para a HomeDashboard)
router.get('/', (req, res) => {
  const db = getDb();
  try {
    const rows = db.prepare('SELECT * FROM admin_acts ORDER BY created_at DESC').all();
    const acts = rows.map(r => JSON.parse(r.data));
    res.json(acts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET functional history for a specific employee
router.get('/history/:employeeId', (req, res) => {
  const db = getDb();
  try {
    const { employeeId } = req.params;
    const history = db.prepare('SELECT * FROM functional_history WHERE employee_id = ? ORDER BY date(act_date) DESC, created_at DESC').all();
    res.json(history.map(h => ({
      id: h.id,
      actType: h.act_type,
      actDate: h.act_date,
      oldState: h.old_state_json ? JSON.parse(h.old_state_json) : null,
      newState: h.new_state_json ? JSON.parse(h.new_state_json) : null,
      details: h.details_json ? JSON.parse(h.details_json) : null,
      user: h.user_responsible,
      createdAt: h.created_at
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST register a simple act
router.post('/', (req, res) => {
  const db = getDb();
  try {
    const actData = req.body;
    db.prepare('INSERT INTO admin_acts (id, data) VALUES (?, ?)').run(actData.id || `act_${Date.now()}`, JSON.stringify(actData));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST register a new administrative act
router.post('/register', (req, res) => {
  const db = getDb();
  const { employeeId, actType, actDate, despacho, br, details, userResponsible } = req.body;

  if (!employeeId || !actType || !actDate) {
    return res.status(400).json({ error: 'Faltam campos obrigatórios (employeeId, actType, actDate).' });
  }

  try {
    const employeeRow = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employeeRow) {
      return res.status(404).json({ error: 'Funcionário não encontrado.' });
    }

    const extraData = employeeRow.extra_data ? JSON.parse(employeeRow.extra_data) : {};
    const oldState = {
      careerId: employeeRow.career_id,
      categoryId: employeeRow.category_id,
      status: employeeRow.status,
      isActive: employeeRow.is_active,
      role: extraData.role || '',
      step: extraData.step || '',
      class: extraData.class || '',
      vinculo: extraData.vinculo || '',
      salary: extraData.salary || ''
    };

    let newState = { ...oldState };
    const updateFields = [];
    const updateValues = [];

    // LÓGICA DE NEGÓCIO POR TIPO DE ACTO
    let isPending = false;

    if (actType === 'Promoção') {
      if (!details.newCategoryId) return res.status(400).json({ error: 'Categoria destino não informada.' });
      
      const newCat = db.prepare('SELECT * FROM categories WHERE id = ?').get(details.newCategoryId);
      if (!newCat) return res.status(400).json({ error: 'Categoria destino inválida.' });
      if (newCat.career_id !== oldState.careerId) {
         return res.status(400).json({ error: 'Promoção deve ser na mesma carreira. Use Mudança de Carreira se aplicável.' });
      }
      
      newState.categoryId = newCat.id;
      updateFields.push('category_id = ?');
      updateValues.push(newCat.id);
      isPending = true; // Promoções ficam pendentes de confirmação
      
    } else if (actType === 'Progressão') {
      if (!details.newEscalao) return res.status(400).json({ error: 'Novo escalão não informado.' });
      newState.step = details.newEscalao;
      if (details.newClasse) newState.class = details.newClasse;
      // In SQLite, JSON functions are used or we can update step in extra_data below
      isPending = true; // Progressões ficam pendentes de confirmação

    } else if (actType === 'Mudança de Carreira' || actType === 'Promoção por Mudança de Carreira') {
      if (!details.newCareerId || !details.newCategoryId) {
        return res.status(400).json({ error: 'Nova carreira e categoria obrigatórias.' });
      }
      newState.careerId = details.newCareerId;
      newState.categoryId = details.newCategoryId;
      updateFields.push('career_id = ?', 'category_id = ?');
      updateValues.push(details.newCareerId, details.newCategoryId);

    } else if (actType === 'Nomeação' || actType === 'Cessação de Funções' || actType === 'Alteração de Cargo') {
      newState.role = details.newCargo || '';
      if (details.newVinculo) newState.vinculo = details.newVinculo;

    } else if (actType === 'Reserva' || actType === 'Reforma') {
      newState.status = actType === 'Reforma' ? 'Reformado' : 'Na Reserva';
      newState.isActive = 0;
      updateFields.push('status = ?', 'is_active = ?');
      updateValues.push(newState.status, 0);

    } else if (actType === 'Demissão') {
      newState.status = 'Demitido';
      newState.isActive = 0;
      updateFields.push('status = ?', 'is_active = ?');
      updateValues.push('Demitido', 0);

    } else if (actType === 'Expulsão') {
      newState.status = 'Expulso';
      newState.isActive = 0;
      updateFields.push('status = ?', 'is_active = ?');
      updateValues.push('Expulso', 0);

    } else if (actType === 'Óbito') {
      newState.status = 'Falecido';
      newState.isActive = 0;
      updateFields.push('status = ?', 'is_active = ?');
      updateValues.push('Falecido', 0);

    } else if (['Transferência', 'Destacamento', 'Reafectação'].includes(actType)) {
      if (details.newDirectorateId) {
        updateFields.push('directorate_id = ?');
        updateValues.push(details.newDirectorateId);
      }
      if (details.newDepartmentId !== undefined) {
        updateFields.push('department_id = ?');
        updateValues.push(details.newDepartmentId || null);
      }
      if (details.newDistrictDirectorateId !== undefined) {
        updateFields.push('district_directorate_id = ?');
        updateValues.push(details.newDistrictDirectorateId || null);
      }
      if (details.newSectionId !== undefined) {
        updateFields.push('section_id = ?');
        updateValues.push(details.newSectionId || null);
      }
      if (details.newProvinceId) {
        updateFields.push('province_id = ?');
        updateValues.push(details.newProvinceId);
      }
      if (details.newDistrictId !== undefined) {
        updateFields.push('district_id = ?');
        updateValues.push(details.newDistrictId || null);
      }
    } else if (['Advertência', 'Repreensão', 'Multa', 'Suspensão'].includes(actType)) {
      if (actType === 'Suspensão') {
         newState.status = 'Suspenso';
         updateFields.push('status = ?');
         updateValues.push('Suspenso');
      }
    } else if (actType === 'Junta de Saúde') {
      newState.healthStatus = 'Baixa Médica';
    }

    const newExtraData = { ...extraData, ...newState };
    
    // Se não for pendente, atualizamos os dados do funcionário
    if (!isPending) {
      updateFields.push('extra_data = ?', "updated_at = datetime('now')");
      updateValues.push(JSON.stringify(newExtraData));
    }

    const tx = db.transaction(() => {
      const historyId = 'hist_' + Date.now();
      const status = isPending ? 'Pendente' : 'Confirmado';
      db.prepare(`
        INSERT INTO functional_history (id, employee_id, act_type, act_date, old_state_json, new_state_json, details_json, user_responsible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        historyId, employeeId, actType, actDate, 
        JSON.stringify(oldState), JSON.stringify(newState), JSON.stringify({ despacho, br, ...details, status }), userResponsible || 'Sistema'
      );

      const actId = 'act_' + Date.now();
      let extraActProps = { status };
      if (actType === 'Junta de Saúde') extraActProps.status = 'Em Baixa';

      const actJson = JSON.stringify({ id: actId, historyId, employeeId, actType, actDate, despacho, br, details: { ...details, status }, user: userResponsible, date: new Date().toISOString(), ...extraActProps });
      db.prepare('INSERT INTO admin_acts (id, data) VALUES (?, ?)').run(actId, actJson);

      if (!isPending && updateFields.length > 0) {
        updateValues.push(employeeId);
        db.prepare(`UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }
    });

    tx();
    res.json({ success: true, message: 'Acto Administrativo registado com sucesso.' });

  } catch (error) {
    console.error('Erro ao registar acto:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update an admin act
router.put('/:id', (req, res) => {
  const db = getDb();
  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(req.params.id);
    if (!actRow) return res.status(404).json({ error: 'Ato não encontrado' });
    
    const existingData = JSON.parse(actRow.data);
    const newData = { ...existingData, ...req.body };
    
    db.prepare('UPDATE admin_acts SET data = ? WHERE id = ?').run(JSON.stringify(newData), req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE an admin act
router.delete('/:id', (req, res) => {
  const db = getDb();
  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(req.params.id);
    if (!actRow) return res.status(404).json({ error: 'Ato não encontrado' });

    // Reverse employee state if it's a death/óbiito? Let's just delete the record for now
    db.prepare('DELETE FROM admin_acts WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST confirm a pending act
router.post('/confirm/:id', (req, res) => {
  const db = getDb();
  const actId = req.params.id;

  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(actId);
    if (!actRow) return res.status(404).json({ error: 'Ato não encontrado' });

    let actData = JSON.parse(actRow.data);
    if (actData.status !== 'Pendente' && actData.details?.status !== 'Pendente') {
      return res.status(400).json({ error: 'Este acto não está pendente.' });
    }

    const employeeRow = db.prepare('SELECT * FROM employees WHERE id = ?').get(actData.employeeId);
    if (!employeeRow) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    const extraData = employeeRow.extra_data ? JSON.parse(employeeRow.extra_data) : {};
    const updateFields = [];
    const updateValues = [];
    
    let newExtraData = { ...extraData };

    if (actData.actType === 'Promoção') {
      updateFields.push('category_id = ?');
      updateValues.push(actData.details.newCategoryId);
      if (actData.details.newEscalao) newExtraData.step = actData.details.newEscalao;
    } else if (actData.actType === 'Progressão') {
      if (actData.details.newEscalao) newExtraData.step = actData.details.newEscalao;
      if (actData.details.newClasse) newExtraData.class = actData.details.newClasse;
    } else if (actData.actType === 'Reintegração') {
      updateFields.push('status = ?', 'is_active = ?');
      updateValues.push('Ativo', 1);
    }

    updateFields.push('extra_data = ?', "updated_at = datetime('now')");
    updateValues.push(JSON.stringify(newExtraData));
    updateValues.push(actData.employeeId);

    actData.status = 'Confirmado';
    actData.details.status = 'Confirmado';

    const tx = db.transaction(() => {
      // 1. Update employee
      db.prepare(`UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      
      // 2. Update admin_acts
      db.prepare('UPDATE admin_acts SET data = ? WHERE id = ?').run(JSON.stringify(actData), actId);

      // 3. Update functional_history status if we have the historyId
      if (actData.historyId) {
        const histRow = db.prepare('SELECT details_json FROM functional_history WHERE id = ?').get(actData.historyId);
        if (histRow) {
          let histDetails = JSON.parse(histRow.details_json || '{}');
          histDetails.status = 'Confirmado';
          db.prepare('UPDATE functional_history SET details_json = ? WHERE id = ?').run(JSON.stringify(histDetails), actData.historyId);
        }
      }
    });

    tx();
    res.json({ success: true, message: 'Acto confirmado com sucesso.' });
  } catch (error) {
    console.error('Erro ao confirmar acto:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
