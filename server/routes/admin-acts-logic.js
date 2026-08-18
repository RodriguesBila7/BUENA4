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
    const history = db.prepare('SELECT * FROM functional_history WHERE employee_id = ? ORDER BY date(act_date) DESC, created_at DESC').all(employeeId);
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
    const isSecondaryRequest = (
      req.headers['x-is-secondary'] === 'true' || 
      req.headers['x-secondary'] === 'true' || 
      req.body.isSecondary === true ||
      req.body.isSecondaryUser === true ||
      req.headers['x-user-role'] === 'usuario_normal' ||
      req.headers['x-user-role'] === 'usuario'
    );

    let isPending = isSecondaryRequest;

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
      isPending = true; // Promoções ficam sempre pendentes de confirmação
      
    } else if (actType === 'Progressão') {
      if (!details.newEscalao) return res.status(400).json({ error: 'Novo escalão não informado.' });
      newState.step = details.newEscalao;
      if (details.newClasse) newState.class = details.newClasse;
      isPending = true; // Progressões ficam sempre pendentes de confirmação

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

// ══════════════════════════════════════════════════════════════════════════════
// FLUXO DE PROVIMENTO E CESSAÇÃO (Nomeação, Cessação de Funções, Reintegração)
// ══════════════════════════════════════════════════════════════════════════════

// POST criar processo de Provimento / Cessação
router.post('/provimento/create', (req, res) => {
  const db = getDb();
  const { 
    employeeId, 
    employeeName, 
    employeeNuit, 
    actType, 
    actDate, 
    despacho, 
    details = {}, 
    userResponsible, 
    userRole, 
    isSecondary 
  } = req.body;

  if (!employeeId || !actType || !actDate) {
    return res.status(400).json({ error: 'Campos obrigatórios em falta (employeeId, actType, actDate).' });
  }

  try {
    const employeeRow = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
    if (!employeeRow) return res.status(404).json({ error: 'Funcionário não encontrado.' });

    const isSec = Boolean(
      isSecondary || 
      req.headers['x-is-secondary'] === 'true' || 
      userRole === 'usuario_normal' || 
      userRole === 'usuario'
    );

    // Se for secundário, ou se não houver despacho, entra como Pendente de Despacho
    let status = 'Pendente de Despacho';
    let despachoInfo = null;

    if (!isSec && despacho && despacho.trim()) {
      status = 'Pendente de Aprovação';
      despachoInfo = {
        texto: despacho.trim(),
        data: new Date().toISOString(),
        user: userResponsible || 'Super Administrador',
        cargo: 'Direcção de Recursos Humanos'
      };
    }

    const actId = 'act_' + Date.now();
    const history = [
      {
        id: 'h_' + Date.now() + '_1',
        action: 'Processo Iniciado',
        user: userResponsible || 'Utilizador',
        role: userRole || (isSec ? 'Usuário Secundário' : 'Administrador Primário'),
        date: new Date().toISOString(),
        description: `Processo de ${actType} registado no sistema com estado "${status}".`
      }
    ];

    if (despachoInfo) {
      history.push({
        id: 'h_' + Date.now() + '_2',
        action: 'Despacho Inserido',
        user: despachoInfo.user,
        role: despachoInfo.cargo,
        date: despachoInfo.data,
        description: `Despacho emitido pela DRH: "${despachoInfo.texto}". Processo encaminhado para Tripla Aprovação.`
      });
    }

    const newAct = {
      id: actId,
      group: 'Provimento e Cessação',
      actType,
      employeeId,
      employeeName: employeeName || employeeRow.name,
      employeeNuit: employeeNuit || employeeRow.nuit || employeeRow.id,
      actDate,
      status,
      despacho: despachoInfo ? despachoInfo.texto : '',
      despachoDate: despachoInfo ? despachoInfo.data : null,
      despachoUser: despachoInfo ? despachoInfo.user : null,
      details: {
        ...details,
        brNumber: details.brNumber || '',
        effectiveDate: details.effectiveDate || actDate,
        reason: details.reason || '',
        observations: details.observations || ''
      },
      approvals: {
        super_admin_1: { approved: false, user: null, name: null, roleTitle: 'Super Administrador Principal (Chefe da Direcção de Recursos Humanos)', date: null, observation: null },
        admin_1: { approved: false, user: null, name: null, roleTitle: 'Super Administrador (Chefe do Departamento Central de Administração de Pessoal)', date: null, observation: null },
        admin_2: { approved: false, user: null, name: null, roleTitle: 'Administrador Principal (Técnico Central de RH)', date: null, observation: null }
      },
      rejection: null,
      history,
      createdAt: new Date().toISOString(),
      createdBy: userResponsible || 'Utilizador'
    };

    db.prepare('INSERT INTO admin_acts (id, data) VALUES (?, ?)').run(actId, JSON.stringify(newAct));
    res.json({ success: true, act: newAct, message: `Processo de ${actType} criado com sucesso!` });
  } catch (error) {
    console.error('Erro ao criar processo de provimento:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST adicionar despacho ao processo (Apenas Usuário Primário Central)
router.post('/provimento/:id/despacho', (req, res) => {
  const db = getDb();
  const actId = req.params.id;
  const { despacho, userResponsible, userRole, brNumber } = req.body;

  if (!despacho || !despacho.trim()) {
    return res.status(400).json({ error: 'O texto do despacho é obrigatório.' });
  }

  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(actId);
    if (!actRow) return res.status(404).json({ error: 'Processo não encontrado.' });

    let actData = JSON.parse(actRow.data);

    if (actData.status === 'Finalizado' || actData.status === 'Rejeitado') {
      return res.status(400).json({ error: `Não é possível adicionar despacho a um processo no estado "${actData.status}".` });
    }

    actData.despacho = despacho.trim();
    actData.despachoDate = new Date().toISOString();
    actData.despachoUser = userResponsible || 'Super Administrador Principal';
    actData.status = 'Pendente de Aprovação';

    if (brNumber) {
      actData.details = { ...actData.details, brNumber };
    }

    if (!Array.isArray(actData.history)) actData.history = [];
    actData.history.push({
      id: 'h_' + Date.now(),
      action: 'Despacho Inserido',
      user: userResponsible || 'Chefe da DRH',
      role: userRole || 'Direcção de Recursos Humanos',
      date: new Date().toISOString(),
      description: `Despacho inserido pela DRH: "${despacho.trim()}". Processo avançado para fase de Tripla Aprovação.`
    });

    db.prepare('UPDATE admin_acts SET data = ? WHERE id = ?').run(JSON.stringify(actData), actId);
    res.json({ success: true, act: actData, message: 'Despacho registado com sucesso. Processo em fase de aprovação!' });
  } catch (error) {
    console.error('Erro ao adicionar despacho:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST aprovação de um dos 3 níveis obrigatórios
router.post('/provimento/:id/approve', (req, res) => {
  const db = getDb();
  const actId = req.params.id;
  const { roleKey, userResponsible, userName, roleTitle, observation } = req.body;

  const validKeys = ['super_admin_1', 'admin_1', 'admin_2'];
  if (!validKeys.includes(roleKey)) {
    return res.status(400).json({ error: 'Perfil de aprovação inválido. Deve ser um dos 3 Administradores Primários Centrais.' });
  }

  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(actId);
    if (!actRow) return res.status(404).json({ error: 'Processo não encontrado.' });

    let actData = JSON.parse(actRow.data);

    if (actData.status !== 'Pendente de Aprovação') {
      return res.status(400).json({ error: `O processo deve estar no estado "Pendente de Aprovação" (Estado atual: ${actData.status}). Certifique-se de que o despacho foi emitido.` });
    }

    if (!actData.approvals) {
      actData.approvals = {
        super_admin_1: { approved: false },
        admin_1: { approved: false },
        admin_2: { approved: false }
      };
    }

    // Regista a aprovação no slot correspondente
    actData.approvals[roleKey] = {
      approved: true,
      user: userResponsible || 'Admin',
      name: userName || userResponsible || 'Administrador Primário',
      roleTitle: roleTitle || (
        roleKey === 'super_admin_1' ? 'Super Administrador Principal (Chefe da Direcção de Recursos Humanos)' :
        roleKey === 'admin_1' ? 'Super Administrador (Chefe do Departamento Central de Administração de Pessoal)' :
        'Administrador Principal (Técnico Central de RH)'
      ),
      date: new Date().toISOString(),
      observation: (observation || '').trim()
    };

    // Contagem de aprovações
    const approvedList = validKeys.filter(k => actData.approvals[k]?.approved);
    const isAllApproved = approvedList.length === 3;

    if (!Array.isArray(actData.history)) actData.history = [];

    actData.history.push({
      id: 'h_' + Date.now(),
      action: `Aprovação (${approvedList.length}/3)`,
      user: userName || userResponsible || 'Administrador',
      role: actData.approvals[roleKey].roleTitle,
      date: new Date().toISOString(),
      description: `Aprovação confirmada por ${actData.approvals[roleKey].roleTitle}.${observation ? ' Nota: ' + observation : ''}`
    });

    const tx = db.transaction(() => {
      // Se todos os 3 perfis aprovaram, FINALIZA O PROCESSO e aplica alterações na base de dados
      if (isAllApproved) {
        actData.status = 'Finalizado';
        actData.history.push({
          id: 'h_' + Date.now() + '_final',
          action: 'Processo Finalizado',
          user: 'Sistema SERNIC',
          role: 'Tripla Aprovação Completa (3/3)',
          date: new Date().toISOString(),
          description: 'Todas as 3 aprovações obrigatórias foram concluídas. O acto foi homologado e os dados funcionais do funcionário foram actualizados com sucesso.'
        });

        // Actualiza o funcionário se existir
        const employeeRow = db.prepare('SELECT * FROM employees WHERE id = ?').get(actData.employeeId);
        if (employeeRow) {
          const extraData = employeeRow.extra_data ? JSON.parse(employeeRow.extra_data) : {};
          const updateFields = [];
          const updateValues = [];

          if (actData.actType === 'Nomeação') {
            extraData.role = actData.details?.newRole || actData.details?.newCargo || extraData.role;
            if (actData.details?.newDirectorateId) {
              updateFields.push('directorate_id = ?');
              updateValues.push(actData.details.newDirectorateId);
            }
            if (actData.details?.newDepartmentId) {
              updateFields.push('department_id = ?');
              updateValues.push(actData.details.newDepartmentId);
            }
            if (actData.details?.newSectionId) {
              updateFields.push('section_id = ?');
              updateValues.push(actData.details.newSectionId);
            }
          } else if (actData.actType === 'Cessação de Funções') {
            extraData.previousRole = extraData.role || actData.details?.previousRole || '';
            extraData.role = actData.details?.posteriorRole || 'Técnico de Investigação';
          } else if (actData.actType === 'Reintegração') {
            updateFields.push('status = ?', 'is_active = ?');
            updateValues.push('Ativo', 1);
            if (actData.details?.newRole) extraData.role = actData.details.newRole;
          }

          updateFields.push('extra_data = ?', "updated_at = datetime('now')");
          updateValues.push(JSON.stringify(extraData));
          updateValues.push(actData.employeeId);

          db.prepare(`UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);

          // Regista no histórico funcional oficial
          db.prepare(`
            INSERT INTO functional_history (id, employee_id, act_type, act_date, old_state_json, new_state_json, details_json, user_responsible)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            'hist_' + Date.now(),
            actData.employeeId,
            actData.actType,
            actData.actDate,
            JSON.stringify({ status: employeeRow.status, role: extraData.previousRole || '' }),
            JSON.stringify({ status: 'Ativo', role: extraData.role || '' }),
            JSON.stringify({ despacho: actData.despacho, status: 'Finalizado', approvals: actData.approvals }),
            userName || userResponsible || 'Super Administrador'
          );
        }
      }

      db.prepare('UPDATE admin_acts SET data = ? WHERE id = ?').run(JSON.stringify(actData), actId);
    });

    tx();

    res.json({ 
      success: true, 
      act: actData, 
      isFinalized: isAllApproved, 
      approvedCount: approvedList.length,
      message: isAllApproved ? 'Processo Aprovado por todos os 3 perfis e Finalizado com sucesso!' : `Aprovação registada com sucesso (${approvedList.length}/3)!` 
    });
  } catch (error) {
    console.error('Erro ao aprovar processo:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST rejeição do processo
router.post('/provimento/:id/reject', (req, res) => {
  const db = getDb();
  const actId = req.params.id;
  const { reason, userResponsible, userName, roleTitle } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'O motivo da rejeição é obrigatório.' });
  }

  try {
    const actRow = db.prepare('SELECT * FROM admin_acts WHERE id = ?').get(actId);
    if (!actRow) return res.status(404).json({ error: 'Processo não encontrado.' });

    let actData = JSON.parse(actRow.data);

    if (actData.status === 'Finalizado') {
      return res.status(400).json({ error: 'Não é possível rejeitar um processo já finalizado.' });
    }

    actData.status = 'Rejeitado';
    actData.rejection = {
      rejectedBy: userName || userResponsible || 'Super Administrador',
      roleTitle: roleTitle || 'Administrador Primário',
      date: new Date().toISOString(),
      reason: reason.trim()
    };

    if (!Array.isArray(actData.history)) actData.history = [];
    actData.history.push({
      id: 'h_' + Date.now(),
      action: 'Processo Rejeitado',
      user: userName || userResponsible,
      role: roleTitle || 'Administrador Primário',
      date: new Date().toISOString(),
      description: `Processo rejeitado por ${roleTitle || 'Administrador'}. Motivo: "${reason.trim()}".`
    });

    db.prepare('UPDATE admin_acts SET data = ? WHERE id = ?').run(JSON.stringify(actData), actId);
    res.json({ success: true, act: actData, message: 'Processo rejeitado com sucesso.' });
  } catch (error) {
    console.error('Erro ao rejeitar processo:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
