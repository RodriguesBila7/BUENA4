/**
 * src/utils/scopeUtils.js
 * Utilitário profissional de controlo de escopo territorial/multi-tenant (SERNIC)
 * 
 * Regras Institucionais:
 * 1. Nível Central (1º Nível DRH, 2º Nível DGP, 3º Nível Técnico Central, Técnicos Específicos RH Central):
 *    - Visibilidade GLOBAL NACIONAL E COMPLETA de todos os funcionários e actos administrativos.
 * 
 * 2. Nível Provincial / Apoio Administrativo (4º Nível Administrador, 5º Nível Usuário):
 *    - Visibilidade ESTRITAMENTE LOCAL da sua Direcção Provincial e de todas as Direcções Distritais subordinadas àquela Província.
 *    - As Direcções Distritais NÃO possuem Recursos Humanos próprios; todos os actos funcionais distritais são geridos e visíveis pela Direcção Provincial correspondente.
 */

export function isCentralUser(user) {
  if (!user) return true;
  
  // O utilizador admin de sistema genérico sem direcção atribuída é central por defeito
  if (user.username === 'admin' && !user.directorateId) return true;

  const roleId = String(user.roleId || user.role || '').toLowerCase();
  const roleName = String(user.roleName || user.roleDetails?.name || '').toLowerCase();

  // Perfis provinciais/locais (4º Nível Administrador e 5º Nível Usuário) -> ESTRITAMENTE LOCAL PROVINCIAL
  if (
    roleId === 'usuario_admin' || 
    roleId === 'usuario_normal' || 
    roleId === 'admin_provincial' || 
    roleId === 'admin_3' || 
    roleId === 'usuario'
  ) {
    return false;
  }

  // Se o utilizador possui uma direcção vinculada (ex: Cidade de Maputo, Sofala, Nampula) -> Escopo Provincial Local
  if (user.directorateId) {
    // A menos que seja explicitamente um dos 3 níveis centrais
    const isExplicitCentral = (
      roleId === 'super_admin_1' || 
      roleId === 'admin_1' || 
      roleId === 'admin_2' ||
      roleName.includes('super administrador principal') ||
      roleName.includes('chefe da direcção de recursos humanos') ||
      roleName.includes('chefe do departamento de gestão de pessoal') ||
      roleName.includes('técnico central')
    );
    if (!isExplicitCentral) return false;
  }

  return true;
}

export function filterByProvincialScope(items, user, orgData) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  if (isCentralUser(user)) return items;

  const userDirId = String(user.directorateId || '');
  if (!userDirId) return items;

  const userDir = (orgData?.directorates || []).find(d => String(d.id) === userDirId);
  const userProvince = (userDir?.province || userDir?.name || '').toLowerCase();

  // Mapear IDs de todas as Direcções Distritais que pertencem a esta Direcção Provincial
  const districtDirIds = new Set(
    (orgData?.districtDirectorates || [])
      .filter(d => {
        const provIdMatch = String(d.provincialDirectorateId || d.directorateId || '') === userDirId;
        const provNameMatch = userProvince && d.province && userProvince.includes(d.province.toLowerCase());
        return provIdMatch || provNameMatch;
      })
      .map(d => String(d.id))
  );

  return items.filter(item => {
    if (!item) return false;

    // Campos diretos de direcção no item
    const itemDirId = item.directorateId ? String(item.directorateId) : null;
    const itemProvDirId = item.provincialDirectorateId ? String(item.provincialDirectorateId) : null;
    const itemDistDirId = (item.districtDirectorateId || item.districtId) ? String(item.districtDirectorateId || item.districtId) : null;

    // 1. Pertence diretamente à Direcção Provincial do utilizador
    if (itemDirId === userDirId || itemProvDirId === userDirId) return true;

    // 2. Pertence a uma Direcção Distrital desta Província
    if (itemDistDirId && districtDirIds.has(itemDistDirId)) return true;

    // 3. Se o item tiver indicação textual de província idêntica à do utilizador
    if (userProvince && item.province && userProvince.includes(item.province.toLowerCase())) return true;

    // 4. Se for um registo vinculado a um objeto funcionário
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
