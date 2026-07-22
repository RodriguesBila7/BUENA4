export const fetchEmployees = async (employees, orgData, filters = {}, pagination = { page: 1, limit: 10 }, sort = { field: 'name', order: 'asc' }) => {
  // Simular atraso de rede
  // Simular atraso de rede
  await new Promise(resolve => setTimeout(resolve, 600));

  // Excluir funcionários eliminados da vista principal
  let result = employees.filter(e => !['Apagado', 'Demitido', 'Expulso'].includes(e.status));

  // Filtro de Texto
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    result = result.filter(emp => 
      emp.name?.toLowerCase().includes(term) || 
      emp.nip?.toLowerCase().includes(term)
    );
  }

  // Filtros Organizacionais (Hierarquia)
  if (filters.directorateId) result = result.filter(e => e.directorateId === filters.directorateId);
  if (filters.departmentId) result = result.filter(e => e.departmentId === filters.departmentId);
  if (filters.divisionId) result = result.filter(e => e.divisionId === filters.divisionId);
  if (filters.sectionId) result = result.filter(e => e.sectionId === filters.sectionId);

  // Filtros Profissionais
  if (filters.careerId) result = result.filter(e => e.careerId === filters.careerId);
  if (filters.categoryId) result = result.filter(e => e.categoryId === filters.categoryId);
  if (filters.role) result = result.filter(e => e.role?.toLowerCase().includes(filters.role.toLowerCase()));
  if (filters.class) result = result.filter(e => e.class === filters.class);
  if (filters.step) result = result.filter(e => e.step === filters.step);
  if (filters.academicLevel) result = result.filter(e => e.academicLevel === filters.academicLevel);
  if (filters.employmentStatus) result = result.filter(e => e.employmentStatus === filters.employmentStatus);

  // Filtros Pessoais e Demográficos
  if (filters.gender) result = result.filter(e => e.gender === filters.gender);
  if (filters.isActive !== undefined && filters.isActive !== '') {
    const isActiveBool = filters.isActive === 'true' || filters.isActive === true;
    result = result.filter(e => e.isActive === isActiveBool);
  }

  // Filtro por Idade
  if (filters.ageRange) {
    const currentYear = new Date().getFullYear();
    result = result.filter(e => {
      if (!e.dob) return false;
      const birthYear = new Date(e.dob).getFullYear();
      const age = currentYear - birthYear;
      if (filters.ageRange === '18-25') return age >= 18 && age <= 25;
      if (filters.ageRange === '26-35') return age >= 26 && age <= 35;
      if (filters.ageRange === '36-45') return age >= 36 && age <= 45;
      if (filters.ageRange === '46-55') return age >= 46 && age <= 55;
      if (filters.ageRange === '56+') return age > 55;
      return true;
    });
  }

  // Ordenação
  if (sort.field) {
    result.sort((a, b) => {
      const valA = a[sort.field] || '';
      const valB = b[sort.field] || '';
      if (typeof valA === 'string') {
        return sort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sort.order === 'asc' ? valA - valB : valB - valA;
    });
  }

  // Paginação
  const total = result.length;
  const start = (pagination.page - 1) * pagination.limit;
  const paginatedResult = result.slice(start, start + pagination.limit);

  return {
    data: paginatedResult,
    total,
    page: pagination.page,
    totalPages: Math.ceil(total / pagination.limit)
  };
};

export const getEmployeeStats = async (employees, orgData, currentFilters = {}) => {
  // Simular atraso
  await new Promise(resolve => setTimeout(resolve, 400));

  // Aplicar os mesmos filtros para obter as estatísticas da amostra filtrada,
  const { data: filteredSet } = await fetchEmployees(employees, orgData, currentFilters, { page: 1, limit: 999999 }, {});

  const currentYear = new Date().getFullYear();

  let maleCount = 0;
  let femaleCount = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  let totalAge = 0;
  let ageCount = 0;

  let minAge = 999;
  let maxAge = 0;

  const careerCounts = {};
  const academicCounts = {};
  const directorateCounts = {};

  filteredSet.forEach(emp => {
    if (emp.gender === 'M' || emp.gender === 'Masculino') maleCount++;
    if (emp.gender === 'F' || emp.gender === 'Feminino') femaleCount++;
    
    if (emp.isActive) activeCount++;
    else inactiveCount++;

    if (emp.dob) {
      const age = currentYear - new Date(emp.dob).getFullYear();
      totalAge += age;
      ageCount++;
      if (age < minAge) minAge = age;
      if (age > maxAge) maxAge = age;
    }

    if (emp.careerId) {
      careerCounts[emp.careerId] = (careerCounts[emp.careerId] || 0) + 1;
    }
    if (emp.academicLevel) {
      academicCounts[emp.academicLevel] = (academicCounts[emp.academicLevel] || 0) + 1;
    }
    if (emp.directorateId) {
      directorateCounts[emp.directorateId] = (directorateCounts[emp.directorateId] || 0) + 1;
    }
  });

  return {
    total: filteredSet.length,
    active: activeCount,
    inactive: inactiveCount,
    demographics: {
      male: maleCount,
      female: femaleCount,
      avgAge: ageCount > 0 ? Math.round(totalAge / ageCount) : 0,
      minAge: minAge === 999 ? 0 : minAge,
      maxAge: maxAge === 0 ? 0 : maxAge
    },
    careerCounts,
    academicCounts,
    directorateCounts
  };
};
