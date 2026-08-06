import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function generateEspecificacaoPDFSemCortes() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  const topMargin = 20;
  const bottomMargin = 22;
  let currentY = topMargin;

  const primaryColor = [139, 26, 26]; // SERNIC Burgundy #8B1A1A
  const secondaryColor = [212, 160, 23]; // SERNIC Gold #D4A017
  const darkTextColor = [30, 30, 30];
  const lightBgColor = [246, 248, 250];
  const tableBorderColor = [220, 224, 230];
  const accentGray = [100, 110, 120];

  function checkPageOverflow(neededHeight) {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  }

  // Banner inicial
  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, contentWidth, 32, 'F');

  doc.setFillColor(...secondaryColor);
  doc.rect(margin, currentY + 32, contentWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SERVICO NACIONAL DE INVESTIGACAO CRIMINAL', margin + 8, currentY + 11);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'normal');
  doc.text('DIRECCAO DE RECURSOS HUMANOS (SERNIC DRH)', margin + 8, currentY + 19);

  doc.setFontSize(8.5);
  doc.setTextColor(235, 235, 235);
  doc.text('Especificacao Detalhada, Funcional e Arquitetura do Sistema', margin + 8, currentY + 26);

  currentY += 40;

  // Metadata Box
  doc.setFillColor(...lightBgColor);
  doc.setDrawColor(...tableBorderColor);
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...primaryColor);
  doc.text('RESUMO EXECUTIVO DA ESPECIFICACAO', margin + 6, currentY + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(...darkTextColor);
  doc.text('Sistema: SERNIC DRH (v2.0.0)', margin + 6, currentY + 12.5);
  doc.text('Ambito: Gestao Biografica, Carreiras, Atos & Efetividade', margin + 6, currentY + 17.5);

  doc.text('Tecnologia: React 19 + Vite | Node.js + SQLite', margin + 98, currentY + 12.5);
  doc.text('Emissao: Agosto de 2026', margin + 98, currentY + 17.5);

  currentY += 29;

  function addSectionTitle(title) {
    checkPageOverflow(16);
    doc.setFillColor(...primaryColor);
    doc.rect(margin, currentY, 3.5, 8.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(title.toUpperCase(), margin + 6, currentY + 6);

    doc.setDrawColor(...tableBorderColor);
    doc.line(margin + 6, currentY + 8.5, pageWidth - margin, currentY + 8.5);
    currentY += 12;
  }

  function addParagraph(text) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...darkTextColor);
    const lines = doc.splitTextToSize(text, contentWidth);
    const blockHeight = lines.length * 4.1 + 2;
    checkPageOverflow(blockHeight);
    doc.text(lines, margin, currentY);
    currentY += blockHeight;
  }

  function addBulletItem(title, desc) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const fullText = `${title}: ${desc}`;
    const lines = doc.splitTextToSize(fullText, contentWidth - 8);
    const itemHeight = lines.length * 4.1 + 2;

    checkPageOverflow(itemHeight);

    doc.setFillColor(...secondaryColor);
    doc.circle(margin + 2, currentY - 1.2, 1, 'F');

    let lineY = currentY;
    lines.forEach((line, index) => {
      if (index === 0 && line.startsWith(title)) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(`${title}:`, margin + 6, lineY);

        const titleWidth = doc.getTextWidth(`${title}: `);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkTextColor);
        const restOfLine = line.substring(title.length + 1);
        doc.text(restOfLine, margin + 6 + titleWidth, lineY);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkTextColor);
        doc.text(line, margin + 6, lineY);
      }
      lineY += 4.1;
    });

    currentY += itemHeight;
  }

  // --- SEÇÃO 1 ---
  addSectionTitle('1. Visao Geral e Proposito do Sistema');
  addParagraph(
    'O SERNIC DRH e o Sistema Integrado de Informacao, Gestao de Recursos Humanos e Identidade Visual Institucional ' +
    'do Servico Nacional de Investigacao Criminal de Mocambique. O sistema foi projetado para modernizar, digitalizar ' +
    'e padronizar os processos de gestao de quadros, eliminando registos manuais em papel e tabelas dispersas.'
  );

  // --- SEÇÃO 2 ---
  addSectionTitle('2. Objetivos Estrategicos');
  addBulletItem('Centralizacao de Dados', 'Cadastro biografico e funcional unico para todo o efetivo nacional em todas as Direcoes e Delegacoes.');
  addBulletItem('Legalidade e Rastreabilidade', 'Emissao de Atos Administrativos (Despachos, Ordens de Servico, Guias de Marcha) com registo auditavel.');
  addBulletItem('Gestao de Carreiras', 'Automatizacao do controlo de tempo na categoria, requisitos para promocao, progressao e quadro de vagas.');
  addBulletItem('Mapa de Efetividade Mensal', 'Controlo de presencas, faltas, licencas e geracao automatica de mapas oficiais de efetividade.');
  addBulletItem('Seguranca e Conformidade', 'Controlo de acesso granular (RBAC), fecho de sessao por inatividade, logs de auditoria e backups.');

  // --- SEÇÃO 3 ---
  addSectionTitle('3. Modulos e Funcionalidades Principais');

  const tableHeaders = ['Modulo', 'Descricao e Funcionalidades Chave'];
  const tableData = [
    ['Ficha Biografica & Pessoal', 'Gestao completa do funcionario: fotografia, NUIT, categoria, patentes, habilitacoes literarias, dependentes, historico de mobilidade e lixeira com recuperacao.'],
    ['Estrutura Organica', 'Mapeamento hierarquico da instituicao: Direcoes Nacionais, Departamentos, Reparticoes, Brigadas e Delegacoes Provinciais e Distritais.'],
    ['Atos Administrativos', 'Criacao, despacho e emissao de atos normativos, decisoes institucionais e Guias de Marcha para transferencias de efetivo.'],
    ['Gestao de Carreiras', 'Acompanhamento do tempo de permanencia na categoria, requisitos para promocao/progressao e gestao de vagas.'],
    ['Avaliacao de Desempenho', 'Registo e acompanhamento periodico das fichas de notacao e avaliacao de desempenho individual dos funcionarios.'],
    ['Plano de Ferias & Licencas', 'Elaboracao, agendamento, validacao e controlo do mapa anual de ferias e licencas dos funcionarios.'],
    ['Processos Disciplinares', 'Instauracao de processos discipliares, registo de penas aplicadas, faltas, reabilitacoes e mapa de assiduidade.'],
    ['Mapa de Efetividade', 'Geracao e exportacao automatizada do mapa mensal de presenca e efetividade do pessoal.'],
    ['Seguranca & Auditoria', 'Gestao de contas de utilizador (Super Admin, Administrador, Operador, Leitor), registo rigoroso de logs e copias de seguranca.']
  ];

  autoTable(doc, {
    startY: currentY,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: darkTextColor,
      cellPadding: 2.2
    },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: 'bold' },
      1: { cellWidth: 138 }
    },
    margin: { left: margin, right: margin, top: topMargin, bottom: bottomMargin }
  });

  currentY = (doc.lastAutoTable || doc.previousAutoTable).finalY + 10;

  // --- SEÇÃO 4 ---
  addSectionTitle('4. Arquitetura Tecnologica e Engenharia');
  addBulletItem('Frontend (React 19 + Vite)', 'Interface moderna SPA (Single Page Application) com Design System customizado nas cores institucionais do SERNIC, graficos com Recharts, abas/modais arrastaveis e exportacao direta em PDF e Excel.');
  addBulletItem('Backend (Node.js + Express 5)', 'Servidor API REST otimizado, responsavel pela logica de negocio, autenticacao, controlo de permissoes e gestao de rotas.');
  addBulletItem('Base de Dados (SQLite + WAL)', 'Motor SQLite via better-sqlite3 de altissimo rendimento, com transacoes garantidas, registo WAL e backups operacionais.');
  addBulletItem('Seguranca e Protecao', 'Encriptacao de palavras-passe com BcryptJS, controlo de permissoes por modulo (PermissionGuard) e encerramento de sessao automatico por inatividade.');

  // --- SEÇÃO 5 ---
  addSectionTitle('5. Impacto e Beneficios Institucionais');
  addParagraph(
    'O SERNIC DRH assegura total transparencia e eficiencia na gestao do capital humano do Servico Nacional de Investigacao Criminal, ' +
    'reduzindo o tempo de emissao de documentos oficiais e garantindo que todas as decisoes administrativas sejam baseadas em dados confiaveis e auditaveis.'
  );

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 4, 'F');
    doc.setFillColor(...secondaryColor);
    doc.rect(0, 4, pageWidth, 1, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentGray);
    doc.text('SERNIC DRH - Especificacao Detalhada e Funcional do Sistema', margin, 11);
    doc.setDrawColor(...tableBorderColor);
    doc.line(margin, 13, pageWidth - margin, 13);

    doc.setDrawColor(...secondaryColor);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentGray);
    doc.text('Servico Nacional de Investigacao Criminal - Direccao de Recursos Humanos', margin, pageHeight - 5.5);
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
  }

  const outputPath = path.resolve('Especificacao_Projeto_SERNIC_DRH.pdf');
  const pdfBuffer = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
  console.log('PDF de Especificação gerado com sucesso em:', outputPath);
}

generateEspecificacaoPDFSemCortes().catch(err => {
  console.error('Erro ao gerar Especificação PDF:', err);
  process.exit(1);
});
