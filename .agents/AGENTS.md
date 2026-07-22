# Regras Específicas do Projeto BUENA3

## Regras de Compatibilidade Frontend (React 19 + Vite)

1. **Evitar Bibliotecas Externas para Interações UI Básicas (ex: react-draggable)**:
   Devido às rigorosas restrições do React 19 (Strict Mode) e conflitos frequentes com animações CSS, evite instalar pacotes externos legados para interações de arrasto ou redimensionamento. Prefira a criação e utilização de Hooks customizados leves, utilizando *Pointer Events* nativos (como o `useDraggable.js` existente).

2. **Importação Segura de Módulos (Vite/Rollup)**:
   Sempre que integrar bibliotecas de exportação (ex: `jspdf-autotable`), utilize as sintaxes de importação funcional e desestruturada suportadas nativamente pelo Vite. 
   - **Errado**: `import 'jspdf-autotable'; doc.autoTable(...)`
   - **Correto**: `import autoTable from 'jspdf-autotable'; autoTable(doc, {...});`
   - **Segurança**: Quando aceder a propriedades de desenho dinâmico em relatórios (ex: calcular o espaço ocupado por uma tabela), utilize sintaxes de recuo (fallback) seguras: `const finalY = (doc.lastAutoTable || doc.previousAutoTable || { finalY: 64 }).finalY;`.

## Regras de Autonomia do Assistente (Agente Antigravity)

1. **Execução Direta e Sem Confirmação (Planos Rápidos)**:
   A partir de agora, o agente deve aceitar e aplicar todas as alterações solicitadas pelo utilizador imediatamente, sem a necessidade de criar propostas de planos de implementação longos com pedido de aprovação explícito (`request_feedback: true` em artefactos de plano), a menos que seja uma alteração estrutural de altíssimo risco que possa causar perda total de dados não recuperáveis.
