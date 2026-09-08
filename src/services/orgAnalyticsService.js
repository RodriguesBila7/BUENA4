export const getKPIs = (data) => {
  const countStatus = (list) => {
    const active = list.filter(i => i.isActive).length;
    const inactive = list.length - active;
    return { total: list.length, active, inactive };
  };

  return {
    directorates: countStatus(data.directorates || []),
    departments: countStatus(data.departments || []),
    divisions: countStatus(data.divisions || []),
    sections: countStatus(data.sections || []),
  };
};

export const getChartData = (data) => {
  const dirs = data.directorates || [];
  const deps = data.departments || [];
  const divs = data.divisions || [];
  const secs = data.sections || [];

  // Bar Chart: Direcções vs Departamentos vs Repartições vs Secções
  const overallComparison = [
    { name: 'Direcções', count: dirs.length },
    { name: 'Departamentos', count: deps.length },
    { name: 'Repartições', count: divs.length },
    { name: 'Secções', count: secs.length },
  ];

  // Pie Chart: Departamentos por Direcção
  const depsPerDir = dirs.map(dir => ({
    name: dir.name,
    value: deps.filter(dep => dep.directorateId === dir.id).length
  })).filter(d => d.value > 0);

  // Pie Chart: Repartições por Departamento
  const divsPerDep = deps.map(dep => ({
    name: dep.name,
    value: divs.filter(div => div.departmentId === dep.id).length
  })).filter(d => d.value > 0);

  return {
    overallComparison,
    depsPerDir,
    divsPerDep,
  };
};

export const getHierarchyTree = (data) => {
  const dirs = data.directorates || [];
  const deps = data.departments || [];
  const divs = data.divisions || [];
  const secs = data.sections || [];

  return dirs.map(dir => {
    const dirDeps = deps.filter(dep => dep.directorateId === dir.id).map(dep => ({
      ...dep,
      type: 'dep',
      children: divs.filter(div => div.departmentId === dep.id).map(div => ({
        ...div,
        type: 'rep',
        children: secs.filter(sec => sec.divisionId === div.id).map(sec => ({
          ...sec,
          type: 'sec',
          children: []
        }))
      }))
    }));

    const directDivs = divs.filter(div => !div.departmentId && div.directorateId === dir.id).map(div => ({
      ...div,
      type: 'rep',
      children: secs.filter(sec => sec.divisionId === div.id).map(sec => ({
        ...sec,
        type: 'sec',
        children: []
      }))
    }));

    return {
      ...dir,
      type: 'dir',
      children: [...dirDeps, ...directDivs]
    };
  });
};

export const getAuditIssues = (data) => {
  const issues = [];
  const dirs = data.directorates || [];
  const deps = data.departments || [];
  const divs = data.divisions || [];
  const secs = data.sections || [];

  const dirIds = new Set(dirs.map(d => d.id));
  const depIds = new Set(deps.map(d => d.id));
  const divIds = new Set(divs.map(d => d.id));

  // Órfãos
  deps.forEach(dep => {
    if (!dirIds.has(dep.directorateId)) {
      issues.push({ type: 'orphan', level: 'Departamento', name: dep.name, msg: `O Departamento "${dep.name}" aponta para uma Direcção inexistente.` });
    }
  });

  divs.forEach(div => {
    if (div.departmentId && !depIds.has(div.departmentId)) {
      issues.push({ type: 'orphan', level: 'Repartição', name: div.name, msg: `A Repartição "${div.name}" aponta para um Departamento inexistente.` });
    } else if (!div.departmentId && (!div.directorateId || !dirIds.has(div.directorateId))) {
      issues.push({ type: 'orphan', level: 'Repartição', name: div.name, msg: `A Repartição "${div.name}" não está associada a uma Direcção válida.` });
    }
  });

  secs.forEach(sec => {
    if (!divIds.has(sec.divisionId) && !depIds.has(sec.departmentId)) {
      issues.push({ type: 'orphan', level: 'Secção', name: sec.name, msg: `A Secção "${sec.name}" aponta para uma Repartição ou Departamento inexistente.` });
    }
  });

  // Estruturas Incompletas (Vazias)
  dirs.forEach(dir => {
    const hasChild = deps.some(d => d.directorateId === dir.id) || divs.some(div => div.directorateId === dir.id);
    if (!hasChild) issues.push({ type: 'empty', level: 'Direcção', name: dir.name, msg: `A Direcção "${dir.name}" não tem Departamentos nem Repartições directas.` });
  });

  deps.forEach(dep => {
    const hasChild = divs.some(d => d.departmentId === dep.id);
    if (!hasChild) issues.push({ type: 'empty', level: 'Departamento', name: dep.name, msg: `O Departamento "${dep.name}" não tem Repartições.` });
  });

  divs.forEach(div => {
    const hasChild = secs.some(s => s.divisionId === div.id);
    if (!hasChild) issues.push({ type: 'empty', level: 'Repartição', name: div.name, msg: `A Repartição "${div.name}" não tem Secções.` });
  });

  return issues;
};
