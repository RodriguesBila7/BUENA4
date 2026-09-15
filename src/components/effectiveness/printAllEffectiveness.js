/**
 * printAllEffectiveness.js
 * Utilitário de Impressão Oficial SERNIC — Consolidado Nacional de Faltas
 * Permite ao Gestor Principal imprimir todas as faltas de todas as Direcções e Unidades.
 */

export function printAllAbsencesNationalMap({ records = [], employees = [], orgData = {}, user = null }) {
  if (!records || records.length === 0) {
    return;
  }

  const directorates = orgData.directorates || [];
  const departments = orgData.departments || [];

  const getDirName = (id) => directorates.find(d => String(d.id) === String(id))?.name || 'Direcção Geral';
  const getDeptName = (id) => departments.find(d => String(d.id) === String(id))?.name || '-';

  // 1. Mapeamento consolidado por funcionário
  const faltososMap = {};
  let grandTotalDays = 0;
  let grandJustified = 0;
  let grandUnjustified = 0;

  records.forEach(rec => {
    const empId = String(rec.employeeId || rec.id);
    const emp = employees.find(e => String(e.id) === empId);
    const days = Number(rec.daysCount) || (rec.dates ? rec.dates.length : 1);
    const isJustified = rec.type === 'Falta Justificada';

    grandTotalDays += days;
    if (isJustified) grandJustified += days;
    else grandUnjustified += days;

    const dirName = rec.directorateName || getDirName(rec.directorateId || emp?.directorateId);
    const deptName = rec.departmentName || getDeptName(rec.departmentId || emp?.departmentId);

    if (!faltososMap[empId]) {
      faltososMap[empId] = {
        employeeId: empId,
        nip: rec.employeeNip || emp?.nip || emp?.nuit || '-',
        name: rec.employeeName || emp?.name || 'Funcionário',
        directorate: dirName,
        department: deptName,
        role: emp?.role || emp?.categoryName || emp?.rank || '-',
        province: rec.provinceId || emp?.province || dirName,
        totalJustified: 0,
        totalUnjustified: 0,
        totalDays: 0,
        records: []
      };
    }

    if (isJustified) faltososMap[empId].totalJustified += days;
    else faltososMap[empId].totalUnjustified += days;
    faltososMap[empId].totalDays += days;
    faltososMap[empId].records.push(rec);
  });

  const faltososList = Object.values(faltososMap).sort((a, b) => b.totalDays - a.totalDays);

  // 2. Resumo consolidado por Direcção / Unidade
  const dirSummaryMap = {};
  records.forEach(rec => {
    const emp = employees.find(e => String(e.id) === String(rec.employeeId));
    const dir = rec.directorateName || getDirName(rec.directorateId || emp?.directorateId);
    const days = Number(rec.daysCount) || (rec.dates ? rec.dates.length : 1);
    const isJustified = rec.type === 'Falta Justificada';

    if (!dirSummaryMap[dir]) {
      dirSummaryMap[dir] = {
        directorate: dir,
        uniqueEmployees: new Set(),
        justifiedDays: 0,
        unjustifiedDays: 0,
        totalDays: 0
      };
    }

    dirSummaryMap[dir].uniqueEmployees.add(rec.employeeId);
    if (isJustified) dirSummaryMap[dir].justifiedDays += days;
    else dirSummaryMap[dir].unjustifiedDays += days;
    dirSummaryMap[dir].totalDays += days;
  });

  const dirSummaryList = Object.values(dirSummaryMap).map(d => ({
    ...d,
    totalEmployees: d.uniqueEmployees.size,
    percent: grandTotalDays > 0 ? ((d.totalDays / grandTotalDays) * 100).toFixed(1) : '0'
  })).sort((a, b) => b.totalDays - a.totalDays);

  const issueDateTime = new Date().toLocaleDateString('pt-PT') + ' às ' + new Date().toLocaleTimeString('pt-PT');
  const gestorName = user?.name || user?.username || 'Administrador Principal Central';

  const printWin = window.open('', '_blank', 'width=1100,height=750');
  if (!printWin) {
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="pt">
      <head>
        <meta charset="utf-8" />
        <title>SERNIC - Mapa Geral de Efetividade (Consolidado Nacional)</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm 12mm 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #0F172A;
            margin: 0;
            padding: 14px;
            font-size: 10.5px;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 2.5px solid #1B365D;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .header h2 {
            margin: 0 0 2px 0;
            font-size: 13.5px;
            text-transform: uppercase;
            color: #1B365D;
            letter-spacing: 0.5px;
          }
          .header h3 {
            margin: 0 0 2px 0;
            font-size: 11.5px;
            font-weight: 600;
            color: #475569;
          }
          .header h4 {
            margin: 0 0 3px 0;
            font-size: 13px;
            color: #DC2626;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .dg-sub {
            font-weight: 800;
            font-size: 11px;
            color: #1B365D;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .drh-sub {
            font-weight: 700;
            font-size: 11px;
            color: #1B365D;
            text-transform: uppercase;
          }
          .doc-badge {
            display: inline-block;
            margin-top: 5px;
            padding: 4px 14px;
            background-color: #1B365D;
            color: #FFFFFF;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            border-radius: 4px;
            letter-spacing: 0.5px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            background-color: #F8FAFC;
            padding: 10px 14px;
            border: 1px solid #E2E8F0;
            border-left: 4px solid #1B365D;
            border-radius: 6px;
            margin-bottom: 14px;
          }
          .meta-item { font-size: 10.5px; line-height: 1.5; }
          .meta-item strong { color: #1E293B; }
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin-bottom: 14px;
          }
          .kpi-card {
            background-color: #F1F5F9;
            border: 1px solid #CBD5E1;
            border-radius: 6px;
            padding: 8px 10px;
            text-align: center;
          }
          .kpi-label { font-size: 9.5px; font-weight: 700; color: #475569; text-transform: uppercase; }
          .kpi-val { font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 2px; }
          .section-title {
            font-size: 11.5px;
            font-weight: 800;
            color: #1E293B;
            text-transform: uppercase;
            margin: 12px 0 6px 0;
            display: flex;
            align-items: center;
            gap: 6px;
            border-bottom: 1px solid #CBD5E1;
            padding-bottom: 4px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5px;
            margin-bottom: 12px;
          }
          th {
            background-color: #1E293B;
            color: #FFFFFF;
            padding: 5px 6px;
            border: 1px solid #0F172A;
            text-align: left;
            font-weight: 700;
          }
          td {
            padding: 4px 6px;
            border: 1px solid #CBD5E1;
            text-align: left;
          }
          tr:nth-child(even) { background-color: #F8FAFC; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .badge-just {
            color: #059669;
            font-weight: 700;
          }
          .badge-unjust {
            color: #DC2626;
            font-weight: 700;
          }
          .signatures {
            margin-top: 30px;
            display: flex;
            justifyContent: space-between;
            text-align: center;
            page-break-inside: avoid;
          }
          .sig-block {
            width: 30%;
            border-top: 1px solid #1E293B;
            padding-top: 6px;
            font-size: 10px;
            line-height: 1.4;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body onload="window.print();">
        <div class="header">
          <h2>REPÚBLICA DE MOÇAMBIQUE</h2>
          <h3>MINISTÉRIO DO INTERIOR</h3>
          <h4>SERVIÇO NACIONAL DE INVESTIGAÇÃO CRIMINAL (SERNIC)</h4>
          <div class="dg-sub">DIRECÇÃO GERAL</div>
          <div class="drh-sub">DIRECÇÃO DE RECURSOS HUMANOS</div>
          <div class="doc-badge">
            MAPA GERAL DE EFETIVIDADE E ASSIDUIDADE — CONSOLIDADO NACIONAL
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item">
            <strong>Âmbito Territorial:</strong> Consolidado Nacional Completo (Todas as Direcções e Unidades Orgânicas)<br />
            <strong>Gestor Emissor:</strong> ${gestorName} (${gestorRole})<br />
            <strong>Total de Direcções com Registos:</strong> ${dirSummaryList.length} Direcções
          </div>
          <div class="meta-item" style="text-align: right;">
            <strong>Data / Hora de Emissão:</strong> ${issueDateTime}<br />
            <strong>Finalidade:</strong> Controlo Geral de Assiduidade, Homologação e Auditoria Central DRH<br />
            <strong>Estado:</strong> Oficial / Registado no Sistema
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Efectivos Faltosos</div>
            <div class="kpi-val">${faltososList.length}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Faltas Justificadas</div>
            <div class="kpi-val" style="color: #059669;">${grandJustified} Dias</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Faltas Injustificadas</div>
            <div class="kpi-val" style="color: #DC2626;">${grandUnjustified} Dias</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Volume Geral Acumulado</div>
            <div class="kpi-val" style="color: #DC2626;">${grandTotalDays} Dias</div>
          </div>
        </div>

        <!-- 1. RESUMO EXECUTIVO POR DIRECÇÃO PROVINCIAL / UNIDADE CENTRAL -->
        <div class="section-title">
          1. Resumo Consolidado por Direcção e Unidade Orgânica
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;" class="text-center">Nº</th>
              <th>Direcção / Província / Unidade</th>
              <th class="text-center">Efectivos Faltosos</th>
              <th class="text-center">Faltas Justificadas (Dias)</th>
              <th class="text-center">Faltas Injustificadas (Dias)</th>
              <th class="text-center">Total de Dias</th>
              <th class="text-center">% do Volume Nacional</th>
            </tr>
          </thead>
          <tbody>
            ${dirSummaryList.map((d, idx) => `
              <tr>
                <td class="text-center">${idx + 1}</td>
                <td><strong>${d.directorate}</strong></td>
                <td class="text-center"><strong>${d.totalEmployees}</strong></td>
                <td class="text-center badge-just">${d.justifiedDays}</td>
                <td class="text-center badge-unjust">${d.unjustifiedDays}</td>
                <td class="text-center" style="font-weight: 800; background-color: #F8FAFC;">${d.totalDays}</td>
                <td class="text-center">${d.percent}%</td>
              </tr>
            `).join('')}
            <tr style="background-color: #F1F5F9; font-weight: 800;">
              <td colspan="2" style="text-align: right; padding-right: 10px;">TOTAIS CONSOLIDADOS:</td>
              <td class="text-center">${faltososList.length}</td>
              <td class="text-center badge-just">${grandJustified}</td>
              <td class="text-center badge-unjust">${grandUnjustified}</td>
              <td class="text-center" style="background-color: #E2E8F0;">${grandTotalDays}</td>
              <td class="text-center">100%</td>
            </tr>
          </tbody>
        </table>

        <!-- 2. RELAÇÃO NOMINAL DETALHADA DE EFECTIVOS FALTOSOS -->
        <div class="section-title" style="margin-top: 18px;">
          2. Relação Nominal Geral de Funcionários com Faltas Registadas
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;" class="text-center">Nº</th>
              <th style="width: 85px;">NUIT / NIP</th>
              <th>Nome Completo</th>
              <th>Carreira / Categoria</th>
              <th>Direcção / Província</th>
              <th>Unidade / Repartição</th>
              <th class="text-center" style="width: 60px;">F. Just.</th>
              <th class="text-center" style="width: 60px;">F. Injust.</th>
              <th class="text-center" style="width: 65px;">Total Dias</th>
              <th>Motivo Predominante</th>
            </tr>
          </thead>
          <tbody>
            ${faltososList.map((f, i) => {
              const mainReason = f.records?.[0]?.reason || '-';
              return `
                <tr>
                  <td class="text-center">${i + 1}</td>
                  <td><strong>${f.nip}</strong></td>
                  <td><strong>${f.name}</strong></td>
                  <td>${f.role}</td>
                  <td>${f.directorate}</td>
                  <td>${f.department}</td>
                  <td class="text-center badge-just">${f.totalJustified}</td>
                  <td class="text-center badge-unjust">${f.totalUnjustified}</td>
                  <td class="text-center" style="font-weight: 800; background-color: #F8FAFC;">${f.totalDays}</td>
                  <td>${mainReason}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- 3. ASSINATURAS INSTITUCIONAIS -->
        <div class="signatures">
          <div class="sig-block">
            O Responsável pelo Registo e Cadastro Central<br /><br /><br />
            ________________________________________<br />
            Data: ____/____/2026
          </div>
          <div class="sig-block">
            O Chefe do Departamento de Gestão de Pessoal<br /><br /><br />
            ________________________________________<br />
            Data: ____/____/2026
          </div>
          <div class="sig-block">
            O Director Central de Recursos Humanos<br />
            <strong>SERNIC — Direcção Geral</strong><br /><br />
            ________________________________________<br />
            Visto Central de Homologação
          </div>
        </div>
      </body>
    </html>
  `);

  printWin.document.close();
}
