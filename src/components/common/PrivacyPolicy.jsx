import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
      <h2 style={{ color: '#1B365D', borderBottom: '2px solid #1B365D', paddingBottom: '10px' }}>
        Política de Privacidade e Proteção de Dados
      </h2>
      
      <p><strong>Serviço Nacional de Investigação Criminal (SERNIC)</strong></p>
      
      <p>
        Em conformidade com a <strong>Lei nº 3/2017, de 9 de Janeiro (Lei das Transacções Electrónicas)</strong> e os princípios 
        gerais de proteção de dados e privacidade em vigor na República de Moçambique, o Sistema de Gestão de Recursos Humanos 
        do SERNIC estabelece as seguintes diretrizes para o tratamento de dados pessoais.
      </p>

      <h3 style={{ marginTop: '20px' }}>1. Natureza dos Dados Recolhidos</h3>
      <p>
        O sistema processa dados estritamente profissionais e pessoais necessários para a gestão de recursos humanos da instituição, 
        incluindo, mas não se limitando a:
      </p>
      <ul>
        <li>Dados de Identificação (Nome, BI, NUIT, etc.)</li>
        <li>Dados de Contacto (Morada, Telefone, Email)</li>
        <li>Dados Profissionais (Carreira, Categoria, Histórico de Colocações, Processos Disciplinares)</li>
        <li>Dados Biométricos ou Fotografias (apenas para fins de identificação interna)</li>
      </ul>

      <h3 style={{ marginTop: '20px' }}>2. Sensibilidade e Confidencialidade</h3>
      <p>
        Dado o contexto de segurança nacional do SERNIC, <strong>todos os dados contidos neste sistema são classificados como sensíveis e confidenciais</strong>. 
        A fuga ou uso indevido destas informações constitui infração disciplinar grave e pode resultar em responsabilização criminal.
      </p>

      <h3 style={{ marginTop: '20px' }}>3. Controlo de Acesso (RBAC)</h3>
      <p>
        O acesso aos dados é governado pelo princípio do "menor privilégio necessário". 
        A visualização e alteração de registos dependem do perfil (Role) atribuído:
      </p>
      <ul>
        <li><strong>Super Administrador:</strong> Acesso total ao sistema para fins de manutenção e configuração.</li>
        <li><strong>Diretor / Chefe de RH:</strong> Acesso à visualização e edição de dados do pessoal subordinado.</li>
        <li><strong>Técnico de RH:</strong> Acesso condicionado para inserção e gestão de registos operacionais.</li>
      </ul>

      <h3 style={{ marginTop: '20px' }}>4. Auditoria e Rastreabilidade</h3>
      <p>
        Para garantir a responsabilização, o sistema regista automaticamente <strong>(Logs de Auditoria)</strong> todas as ações realizadas pelos utilizadores, 
        incluindo a data, hora, endereço de IP, navegador utilizado (User-Agent) e o detalhe da modificação feita. Estes registos não podem ser apagados ou manipulados.
      </p>

      <h3 style={{ marginTop: '20px' }}>5. Retenção e Segurança</h3>
      <p>
        Os dados são mantidos e processados num ambiente de rede restrito. As passwords de acesso estão protegidas por algoritmos de hashing 
        fortes (Bcrypt) e a comunicação deve ser efetuada preferencialmente sobre canais cifrados.
      </p>
      
      <p style={{ marginTop: '30px', fontSize: '0.9em', color: '#666' }}>
        <em>Última atualização: Julho de 2026. Aceder ou utilizar o sistema implica a aceitação destas condições.</em>
      </p>
    </div>
  );
}
