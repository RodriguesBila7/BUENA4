/**
 * src/utils/scopeUtils.js
 * Utilitário profissional de controlo de escopo territorial/multi-tenant (SERNIC)
 * 
 * Regras Institucionais:
 * 1. Nível Central (1º Nível DRH, 2º Nível DGP, 3º Nível Técnico Central, Técnicos Específicos RH Central):
 *    - Visibilidade GLOBAL NACIONALE COMPLETA de todos os funcionários e actos administrativos.
 * 
 * 2. Nível Provincial / Apoio Administrativo (4º Nível Administrador, 5º Nível Usuário):
 *    - Visibilidade ESTRITAMENTE LOCAL da sua Direcção Provincial e de todas as Direcções Distritais subordinadas àquela Província.
 *    - As Direcções Distritais NÃO possuem Recursos Humanos próprios; todos os actos funcionais distritais são geridos e visíveis pela Direcção Provincial correspondente.
 */

export function isCentralUser(user) {
  if (!user) return true;
  if (user.username === 'admin') return true;
  
  const roleId = String(user.roleId || user.role || '').toLowerCase();
  const roleName = String(user.roleName || user.roleDetails?.name || '').toLowerCase();

  // Perfis com escopo central global
  const centralRoles = [
    'super_admin_1', 
    'admin_1', 
    'admin_2', 
    'tecnico_reserva', 
    'tecnico_saude', 
    'super_admin',
    'hr_manager'
  ];

  if (centralRoles.includes(roleId)) return true;

  if (
    roleName.includes('principal') || 
    roleName.includes('chefe da direcção') || 
    roleName.includes('chefe do departamento de gestão de pessoal') || 
    roleName.includes('técnico central') ||
    roleName.includes('super administrador')
  ) {
    return true;
  }

  // Se não tiver direcção provincial associada, assume escopo central por defeito
  if (!user.directorateId) return true;

  return false;
}

export function filterByProvincialScope(items, user, orgData) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  if (isCentralUser(user)) return items;

  const userDirId = String(user.directorateId);
  
  // Mapear IDs de todas as Direcções Distritais que pertencem a esta Direcção Provincial
  const districtDirIds = new Set(
    (orgData?.districtDirectorates || [])
      .filter(d => String(d.provincialDirectorateId || d.directorateId) === userDirId)
      .map(d => String(d.id))
  );

  return items.filter(item => {
    if (!item) return false;

    // Verificar campos diretos de direcção no item
    const itemDirId = item.directorateId ? String(item.directorateId) : null;
    const itemProvDirId = item.provincialDirectorateId ? String(item.provincialDirectorateId) : null;
    const itemDistDirId = (item.districtDirectorateId || item.districtId) ? String(item.districtDirectorateId || item.districtId) : null;

    // 1. Pertence diretamente à Direcção Provincial do utilizador
    if (itemDirId === userDirId || itemProvDirId === userDirId) return true;

    // 2. Pertence a uma Direcção Distrital desta Província
    if (itemDistDirId && districtDirIds.has(itemDistDirId)) return true;

    // 3. Se for um registo vinculado a um objeto funcionário
    if (item.employee) {
      const empDirId = item.employee.directorateId ? String(item.employee.directorateId) : null;
      const empProvDirId = item.employee.provincialDirectorateId ? String(item.employee.provincialDirectorateId) : null;
      const empDistDirId = (item.employee.districtDirectorateId || item.employee.districtId) ? String(item.employee.districtDirectorateId || item.employee.districtId) : null;

      if (empDirId === userDirId || empProvDirId === userDirId) return true;
      if (empDistDirId && districtDirIds.has(empDistDirId)) return true;
    }

    return false;
  });
}
