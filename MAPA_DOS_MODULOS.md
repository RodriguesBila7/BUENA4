# GUIA E MAPA DOS MÓDULOS DO SISTEMA (SERNIC-DRH)

Este documento traduz e explica a função de cada pasta e ficheiro do projeto, para que saiba com precisão onde intervir e o que cada componente executa.

---

## 1. Pastas Principais na Raiz do Projeto

| Pasta Técnica | Nome / Função em Português | O que contém | Pode ser renomeada? |
| :--- | :--- | :--- | :--- |
| **`src/`** | **Código-Fonte Principal** | Toda a lógica, ecrãs, tabelas e menus do sistema React. | ❌ *Não (padrão obrigatório do Vite/React)* |
| **`api/`** | **Serviços de Backend (Rotas)** | Endpoints de comunicação com o servidor e base de dados. | ❌ *Não (exigido pela plataforma Vercel)* |
| **`server/`** | **Servidor Local de Testes** | Servidor Node/Express e base de dados SQLite local. | ⚠️ *Requer ajuste nos scripts* |
| **`public/`** | **Ficheiros Públicos** | Logótipos, brasões da República e ícones estáticos. | ❌ *Não (padrão de assets públicos)* |
| **`scripts/`** | **Scripts de Automação** | Rotinas de sincronização da base de dados e migrações. | ⚠️ *Uso interno de suporte* |
| **`docs/`** | **Documentação** | Manuais técnicos e especificações do projeto. | ✔️ *Pasta livre* |
| **`node_modules/`**| **Bibliotecas Externas** | Pacotes instalados (React, Vite, gráficos, PDF, etc.). | ❌ *Não (obrigatório do Node.js)* |
| **`dist/`** | **Compilação de Produção** | Ficheiros finais gerados pelo comando de build. | ❌ *Gerado automaticamente* |

---

## 2. Ficheiros de Configuração na Raiz

| Ficheiro | O que faz em Português |
| :--- | :--- |
| **`schema.sql`** | **Estrutura da Base de Dados**: Criação de todas as tabelas (funcionários, carreiras, provimento, utilizadores, etc.). |
| **`package.json`** | **Registo de Dependências**: Lista de programas e comandos utilizados pelo Node.js. |
| **`index.html`** | **Página HTML Base**: Ficheiro inicial onde o sistema visual React é montado no navegador. |
| **`.env`** | **Variáveis de Ambiente**: Chaves e senhas confidenciais de ligação às bases de dados. |
| **`.gitignore`** | **Ficheiros Ignorados pelo Git**: Impede o envio de pastas pesadas (`node_modules`) para o GitHub. |
| **`vite.config.js`** | **Configuração do Compilador**: Define como o Vite junta e otimiza o código. |
| **`Super Administrador.txt`** | **Credenciais Mestre**: Registo dos dados de acesso do Super Administrador. |

---

## 3. Módulos do Sistema dentro de `src/components/`

Estes são os ecrãs e funcionalidades que vê e utiliza na interface gráfica:

| Pasta em `src/components/` | Módulo no Sistema | O que faz |
| :--- | :--- | :--- |
| **`employees/`** | **Gestão de Funcionários** | Lista de efectivos, formulário de cadastro, importação de dados por Excel, histórico e funcionários eliminados. |
| **`career/`** | **Carreiras e Tempo de Serviço** | Promoções, progressões, enquadramentos de categoria e cálculo automático de antiguidade. |
| **`adminActs/`** | **Actos Administrativos** | Gestão de provimento (nomeações, reconduções, posses), cessações de funções e despachos. |
| **`effectiveness/`** | **Efectividade** | Controlo de assiduidade mensal, faltas justificadas/injustificadas e emissão de folhas de efectividade. |
| **`disciplinary/`** | **Contencioso Laboral** | Processos disciplinares, averiguações, inquéritos e sanções aplicadas. |
| **`evaluations/`** | **Desempenho Individual** | Avaliação periódica de desempenho dos funcionários (GDI). |
| **`vacations/`** | **Férias e Licenças** | Mapa de férias, pedidos de gozo de férias e registo de licenças. |
| **`transfers/`** | **Transferências e Mobilidade** | Movimentação de funcionários entre direcções provinciais e repartições. |
| **`org/`** | **Estrutura Orgânica** | Direcções centrais/provinciais, departamentos, repartições e secções. |
| **`access/`** | **Controlo de Acesso** | Gestão de utilizadores do sistema, perfis e atribuição de permissões por módulo. |
| **`settings/`** | **Definições e Configurações** | Parâmetros do sistema, identidade visual (brasões/fundo), cópias de segurança (backup) e línguas. |
| **`common/`** | **Componentes Comuns** | Janelas de confirmação, avisos visuais (toasts) e atalhos de teclado. |

---

## 4. Onde Encontrar Outros Ficheiros Importantes em `src/`

- **`src/components/Dashboard.jsx`**: É o painel principal do sistema — gere o menu lateral, o cabeçalho, os atalhos e a alternância entre todos os módulos.
- **`src/components/HomeDashboard.jsx`**: É o ecrã inicial ("Início") com os indicadores estatísticos e resumo operacional.
- **`src/data/initialDbData.json`**: Contém os dados de arranque da base de dados (estrutura orgânica de Moçambique, carreiras, etc.).
- **`src/utils/backgroundPositions.js`**: Controla o posicionamento e transparência do Brasão da República no fundo do sistema.
- **`src/services/`**: Serviços de gravação de dados, sincronização na nuvem e exportação de ficheiros (Excel e PDF).
