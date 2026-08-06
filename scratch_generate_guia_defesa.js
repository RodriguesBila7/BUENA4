import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';
import path from 'path';

async function generateGuiaDefesaSemCortesPDF() {
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

  // Cores institucionais SERNIC
  const primaryColor = [139, 26, 26]; // SERNIC Burgundy #8B1A1A
  const secondaryColor = [212, 160, 23]; // SERNIC Gold #D4A017
  const darkTextColor = [30, 30, 30];
  const lightBgColor = [246, 248, 250];
  const cardBorderColor = [220, 225, 232];
  const accentGray = [100, 110, 120];
  const greenTextColor = [20, 110, 45];

  function checkPageOverflow(neededHeight) {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = topMargin;
    }
  }

  // --- CABEÇALHO / BANNER DA CAPA ---
  doc.setFillColor(...primaryColor);
  doc.rect(margin, currentY, contentWidth, 32, 'F');

  doc.setFillColor(...secondaryColor);
  doc.rect(margin, currentY + 32, contentWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('GUIA DE APRESENTACAO E DEFESA TECNICA DO CODIGO', margin + 8, currentY + 11);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SERNIC DRH - Manual Completo e Simplificado para Apresentacao', margin + 8, currentY + 19);

  doc.setFontSize(8);
  doc.setTextColor(235, 235, 235);
  doc.text('Estrutura de Codigo, Fluxo de Dados, Perguntas do Engenheiro e Negocio', margin + 8, currentY + 26);

  currentY += 40;

  function addSectionTitle(num, title) {
    checkPageOverflow(16);
    doc.setFillColor(...primaryColor);
    doc.rect(margin, currentY, 3.5, 8.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.text(`${num}. ${title}`.toUpperCase(), margin + 6, currentY + 6);

    doc.setDrawColor(...cardBorderColor);
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

  function addSubSectionTitle(title) {
    checkPageOverflow(9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text(title, margin, currentY);
    currentY += 5;
  }

  function addBulletItem(title, desc) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    const textToSplit = title ? `${title}: ${desc}` : desc;
    const lines = doc.splitTextToSize(textToSplit, contentWidth - 8);
    const itemHeight = lines.length * 4.1 + 2;

    checkPageOverflow(itemHeight);

    // Marcador
    doc.setFillColor(...secondaryColor);
    doc.circle(margin + 2, currentY - 1.2, 1, 'F');

    let lineY = currentY;
    lines.forEach((line, index) => {
      if (index === 0 && title && line.startsWith(title)) {
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

  function addQAItem(qNum, question, directAnswer, detailedExplanation) {
    const cardPadding = 4;
    const innerWidth = contentWidth - cardPadding * 2; // 174mm

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const qLines = doc.splitTextToSize(`Pergunta ${qNum}: ${question}`, innerWidth);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    const directLines = doc.splitTextToSize(`O que responder: "${directAnswer}"`, innerWidth);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const detailLines = doc.splitTextToSize(`Explicacao detalhada: ${detailedExplanation}`, innerWidth);

    const qHeight = qLines.length * 4.0;
    const directHeight = directLines.length * 3.9;
    const detailHeight = detailLines.length * 3.8;
    const totalBoxHeight = qHeight + directHeight + detailHeight + 10;

    checkPageOverflow(totalBoxHeight);

    // Fundo do Card
    doc.setFillColor(...lightBgColor);
    doc.setDrawColor(...cardBorderColor);
    doc.roundedRect(margin, currentY, contentWidth, totalBoxHeight, 1.5, 1.5, 'FD');

    let localY = currentY + cardPadding + 3;

    // Pergunta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text(qLines, margin + cardPadding, localY);
    localY += qHeight + 2;

    // Resposta Curta
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(...greenTextColor);
    doc.text(directLines, margin + cardPadding, localY);
    localY += directHeight + 2;

    // Explicação Detalhada
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkTextColor);
    doc.text(detailLines, margin + cardPadding, localY);

    currentY += totalBoxHeight + 4;
  }

  // --- SEÇÃO 1: OBJETIVO DO SISTEMA ---
  addSectionTitle('1', 'Objetivo do Sistema (Explicacao Simples)');
  addParagraph(
    'O SERNIC DRH e uma plataforma digital desenvolvida para resolver o problema da gestao manual e desorganizada de pessoal no Servico Nacional de Investigacao Criminal de Mocambique. ' +
    'Antes do sistema, as informacoes dos funcionarios ficavam espalhadas em folhas de papel e ficheiros Excel soltos nas provincias. ' +
    'Com o SERNIC DRH, tudo passa a ser gerido num unico local seguro, permitindo emitir Guias de Marcha, Atos Administrativos, controlar a efetividade mensal e verificar a evolucao das carreiras em segundos.'
  );

  // --- SEÇÃO 2: ARQUITETURA DO SISTEMA ---
  addSectionTitle('2', 'Arquitetura do Sistema (A Analogia Simplificada)');
  addParagraph(
    'Para explicar a arquitetura a um engenheiro, o sistema esta dividido em 4 camadas principais que funcionam de forma semelhante a um restaurante:'
  );
  addBulletItem('React 19 (Frontend SPA - O Garcom e a Ementa)', 'E o ecra com que o utilizador interage. Apresenta os formularios, tabelas e graficos. Atualiza a tela instantaneamente sem dar "reload" na pagina.');
  addBulletItem('Node.js (O Motor da Cozinha)', 'E o ambiente que executa o codigo JavaScript no servidor de forma assincrona e rapida, processando multiplos pedidos ao mesmo tempo.');
  addBulletItem('Express v5 (O Chefe de Sala / Gestor de Pedidos)', 'Controla as rotas da API REST. Quando o frontend faz um pedido HTTP (ex: "Criar Funcionario"), o Express verifica a permissao do utilizador e chama a funcao correta.');
  addBulletItem('SQLite / better-sqlite3 (A Despensa de Dados)', 'E a base de dados relacional onde todas as tabelas (funcionarios, utilizadores, despachos, faltas) ficam guardadas em disco com elevado desempenho e seguranca transacional.');

  // --- SEÇÃO 3: ESTRUTURA DAS PASTAS ---
  addSectionTitle('3', 'Estrutura das Pastas (Organizacao do Codigo)');

  addSubSectionTitle('Frontend (src/)');
  addBulletItem('src/components/', 'Conteudo dos ecras divididos por modulos: employees/, adminActs/, access/, org/, vacations/.');
  addBulletItem('src/components/common/', 'Componentes reutilizaveis: DraggableModal (janelas flutuantes com Pointer Events nativos), DraggableTabs, ErrorBoundary.');
  addBulletItem('src/hooks/', 'Logica de dados isolada: useAdminActsData, useEmployees, useDraggable.');
  addBulletItem('src/context/', 'Guarda o estado global de autenticacao e sessao do utilizador.');

  addSubSectionTitle('Backend (server/)');
  addBulletItem('server/index.js', 'Ficheiro principal que liga o servidor Express, configura permissoes de CORS e inicia o servidor.');
  addBulletItem('server/db.js', 'Cria e liga a base de dados SQLite, define o esquema de tabelas, indices e funcoes preparadas (DAO).');
  addBulletItem('server/routes/', 'Rotas REST divididas por recurso: employees.js, adminActs.js, auth.js, org.js.');

  // --- SEÇÃO 4: FLUXO PASSO A PASSO ---
  addSectionTitle('4', 'Fluxo de Funcionamento (Exemplo: Cadastro de Funcionario)');
  addBulletItem('Passo 1: Clique do Utilizador', 'O operador preenche os dados do funcionario no formulario e clica no botao "Guardar".');
  addBulletItem('Passo 2: Chamada da API REST', 'O React executa a funcao fetch("/api/employees", { method: "POST", body: JSON.stringify(dados) }).');
  addBulletItem('Passo 3: Rececao no Express', 'O Express recebe o pedido na rota server/routes/employees.js e verifica a autenticacao.');
  addBulletItem('Passo 4: Gravacao Segura na DB', 'A rota chama a funcao de server/db.js que executa uma Prepared Statement: db.prepare("INSERT INTO employees...").run(...).');
  addBulletItem('Passo 5: Resposta e Atualizacao', 'A base de dados confirma a gravacao, o Express responde HTTP 201 Created em JSON, e o React atualiza a tabela no ecra sem dar reload.');

  // --- SEÇÃO 5 A 8: SEGURANÇA E SESSÃO ---
  addSectionTitle('5 a 8', 'Funcionamento de Requisicoes, Autenticacao e Seguranca');
  addBulletItem('Metodos HTTP REST', 'Usamos GET (buscar dados), POST (criar registos), PUT (atualizar) e DELETE (remover ou mover para a lixeira).');
  addBulletItem('Autenticacao Segura', 'As senhas sao encriptadas com a biblioteca BcryptJS (hash com sal). O sistema nunca guarda a senha em texto limpo.');
  addBulletItem('Controlo por Perfis (RBAC)', 'O sistema suporta 4 niveis: Super Admin, Administrador, Operador e Leitor. Cada perfil so ve o que tem autorizacao.');
  addBulletItem('Protecao SQL Injection', 'Todas as consultas usam parametros vinculados (?). O SQLite trata as variaveis separadamente do comando SQL, impedindo injecoes de codigo.');
  addBulletItem('Temporizador de Inatividade', 'O SessionTimeoutModal.jsx monitoriza a atividade. Se o operador se afastar da mesa, a sessao e encerrada automaticamente.');

  // --- SEÇÃO 9 A 12: MÓDULOS E FUTURO ---
  addSectionTitle('9 a 12', 'Modulos Principais, Desafios e Futuro');
  addBulletItem('Modulos Notaveis', 'Ficha Biografica, Organograma interativo em arvore, Atos Administrativos/Guias de Marcha em PDF, Mapa Mensal de Efetividade e Lixeira de Registos com auditoria.');
  addBulletItem('Desafios de Engenharia', 'Integracao perfeita com o Strict Mode do React 19 atraves de Hooks nativos com Pointer Events (sem pacotes legados instaveis) e geracao de PDFs institucionais formatados.');
  addBulletItem('Evolucao Futura', 'Possibilidade de migrar do SQLite para PostgreSQL sem alterar a interface do utilizador, e integracao com autenticacao governamental (SSO/Keycloak).');

  // --- SEÇÃO 13: PERGUNTAS DO ENGENHEIRO ---
  addSectionTitle('13', 'Perguntas Probabilissimas do Engenheiro (Com Respostas Prontas)');

  addQAItem(
    '1',
    'Por que escolheste React e Node.js?',
    'Escolhi React pela velocidade na criacao de interfaces SPA reativas sem reload. O Node.js da-nos um servidor REST leve e rapido com a mesma linguagem em todo o projeto.',
    'O React gere o DOM virtual garantindo atualizacoes rapidas da UI. O Node.js lida com multiplos pedidos I/O nao bloqueantes de forma eficiente.'
  );

  addQAItem(
    '2',
    'Como funciona o login e a seguranca da senha?',
    'O utilizador envia NUIT e senha. O backend valida a senha encriptada em BcryptJS e devolve a sessao com o perfil de acesso.',
    'Utilizamos Bcrypt com salt para encriptar senhas na tabela users. O frontend armazena a sessao e o SessionTimeoutModal fecha a sessao em caso de inatividade.'
  );

  addQAItem(
    '3',
    'Como garantes que nao ha SQL Injection?',
    'Usamos a biblioteca better-sqlite3 exclusivamente com Prepared Statements e parametros vinculados (?, ?).',
    'Exemplo: db.prepare("SELECT * FROM employees WHERE id = ?").get(id). O motor da DB nunca interpreta as entradas do utilizador como comando SQL.'
  );

  addQAItem(
    '4',
    'Como proteges os componentes e as rotas?',
    'No Frontend usamos o PermissionGuard para bloquear ecras. No Backend, os middlewares do Express bloqueiam rotas nao autorizadas com codigo HTTP 401 ou 403.',
    'Mesmo que alguem tente fazer um pedido direto via Postman ou cURL para a API REST, o servidor recusa o pedido antes de consultar a base de dados.'
  );

  addQAItem(
    '5',
    'Como tratas os erros na aplicacao?',
    'No Frontend usamos o ErrorBoundary do React para capturar falhas da UI. No Backend usamos blocos try...catch em todas as rotas com respostas JSON explicativas.',
    'Se ocorrer um erro inesperado, a aplicacao nao vai abaixo. O utilizador ve um modal explicativo e o servidor devolve HTTP 500 com registo no log de auditoria.'
  );

  addQAItem(
    '6',
    'Como adicionarias um novo modulo sem alterar o codigo existente?',
    'O codigo e 100% modular. Criaria a tabela no db.js, a nova rota em server/routes/, a pasta do componente em src/components/ e a nova aba no Dashboard.',
    'Nao e necessario alterar nenhuma linha dos modulos ja existentes. O principio de responsabilidade unica e modularidade e mantido rigorosamente.'
  );

  addQAItem(
    '7',
    'O sistema segue algum padrao de arquitetura?',
    'Sim, segue o padrao Cliente-Servidor REST com Arquitetura em Camadas (Apresentacao em React, Servicos em Express e Dados em SQLite).',
    'Esta separacao em camadas facilita a manutencao, testes e substituicao de componentes sem afetar as restantes partes do sistema.'
  );

  addQAItem(
    '8',
    'Como farias a escalabilidade do sistema?',
    'O frontend pode ser servido num CDN/Nginx, o backend Node.js conteinerizado em Docker, e o SQLite migrado para PostgreSQL se o volume nacional exigir.',
    'Como a comunicacao e feita via API REST padronizada em JSON, a transicao da base de dados para PostgreSQL requer apenas a alteracao das queries no db.js.'
  );

  // --- SEÇÃO 14: VALOR DE NEGÓCIO ---
  addSectionTitle('14', 'Decisoes de Negocio e Valor Institucional (SERNIC)');
  addBulletItem('Centralizacao Total', 'Eliminacao da dispersao de dados entre os orgaos centrais e as delegacoes provinciais.');
  addBulletItem('Fim dos Ficheiros Excel Isolados', 'Substituicao por uma base de dados relacional segura com copias de seguranca automaticas.');
  addBulletItem('Rastreabilidade Imutavel (Audit Trail)', 'Registo de quem criou, editou ou removeu cada funcionario ou despacho.');
  addBulletItem('Apoio a Decisao da Direcao', 'Geracao instantanea de relatorios em PDF e mapas de efetividade para transferencias e promocoes.');

  // --- LOOP FINAL DE PÁGINAS ---
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
    doc.text('SERNIC DRH - Guia de Apresentacao e Defesa Tecnica do Codigo', margin, 11);
    doc.setDrawColor(...cardBorderColor);
    doc.line(margin, 13, pageWidth - margin, 13);

    doc.setDrawColor(...secondaryColor);
    doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...accentGray);
    doc.text('Servico Nacional de Investigacao Criminal - Direccao de Recursos Humanos', margin, pageHeight - 5.5);
    doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
  }

  const outputPath = path.resolve('Guia_Defesa_Tecnica_SERNIC_DRH.pdf');
  const pdfBuffer = doc.output('arraybuffer');
  fs.writeFileSync(outputPath, Buffer.from(pdfBuffer));
  console.log('Guia PDF sem cortes gerado com sucesso em:', outputPath);
}

generateGuiaDefesaSemCortesPDF().catch(err => {
  console.error('Erro ao gerar Guia PDF:', err);
  process.exit(1);
});
