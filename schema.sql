-- Tabela de Configuração de Identidade Visual e Personalização Institucional do SERNIC
-- Armazena as preferências de cores, logótipo, nome da instituição e dados de auditoria.

CREATE TABLE IF NOT EXISTS configuracoes_identidade (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nome_instituicao VARCHAR(255) NOT NULL DEFAULT 'Serviço Nacional de Investigação Criminal',
    sigla VARCHAR(50) NOT NULL DEFAULT 'SERNIC',
    logotipo LONGTEXT NULL, -- Armazena a imagem codificada em Base64 ou a URL do ficheiro
    cor_principal VARCHAR(7) NOT NULL DEFAULT '#1B365D', -- Cor principal (padrão: Azul Institucional)
    cor_secundaria VARCHAR(7) NOT NULL DEFAULT '#2D3748', -- Cor secundária (padrão: Cinza Escuro)
    cor_destaque VARCHAR(7) NOT NULL DEFAULT '#FFFFFF', -- Cor de destaque (padrão: Branco)
    modo_tema VARCHAR(10) NOT NULL DEFAULT 'light', -- Modo do tema: 'light' (Claro) ou 'dark' (Escuro)
    data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, -- Data da última actualização
    usuario_responsavel VARCHAR(100) NOT NULL -- Utilizador responsável pela alteração (Super Administrador)
);

-- Inserção da configuração padrão inicial (caso a tabela esteja vazia)
INSERT INTO configuracoes_identidade (
    id, 
    nome_instituicao, 
    sigla, 
    logotipo, 
    cor_principal, 
    cor_secundaria, 
    cor_destaque, 
    modo_tema, 
    usuario_responsavel
) 
SELECT 
    1, 
    'Serviço Nacional de Investigação Criminal', 
    'SERNIC', 
    NULL, -- Inicialmente nulo (o sistema exibirá o logótipo padrão temporário)
    '#1B365D', 
    '#2D3748', 
    '#FFFFFF', 
    'light', 
    'Sistema (Padrão)'
ON DUPLICATE KEY UPDATE id=id;
