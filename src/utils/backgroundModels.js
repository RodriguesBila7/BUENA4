/**
 * Modelos de Fundos Futuristas, Elegantes e Simples para o SERNIC
 * Permite ao Administrador escolher entre 20 variantes sóbrias e profissionais.
 */

export const BACKGROUND_MODELS = [
  // ── CATEGORIA 1: VERMELHO INSTITUCIONAL SERNIC (5 MODELOS) ──
  {
    id: 'soberania_sernic',
    nome: 'Soberania SERNIC',
    categoria: 'Vermelho Institucional',
    descricao: 'Vermelho carmesim clássico com vinheta aveludada suave e elegante.',
    bgGradient: 'radial-gradient(ellipse 90% 70% at 50% 25%, #7D1316 0%, #45080B 55%, #1A0204 100%)',
    previewColor: '#7D1316',
    glowColor: 'rgba(220, 38, 38, 0.25)',
    watermarkOpacity: 0.08,
    isDark: true
  },
  {
    id: 'crimson_tech',
    nome: 'Crimson Tech',
    categoria: 'Vermelho Institucional',
    descricao: 'Gradiente carmesim tecnológico com iluminação zenital sutil.',
    bgGradient: 'linear-gradient(155deg, #8B181B 0%, #540B0E 50%, #1F0305 100%)',
    previewColor: '#8B181B',
    glowColor: 'rgba(239, 68, 68, 0.2)',
    watermarkOpacity: 0.08,
    isDark: true
  },
  {
    id: 'rubi_quantico',
    nome: 'Rubi Quântico',
    categoria: 'Vermelho Institucional',
    descricao: 'Tom rubi escuro com difusão limpa e suave de alta definição.',
    bgGradient: 'radial-gradient(circle at 50% 30%, #991B1B 0%, #680E11 45%, #2B0507 100%)',
    previewColor: '#991B1B',
    glowColor: 'rgba(220, 38, 38, 0.3)',
    watermarkOpacity: 0.085,
    isDark: true
  },
  {
    id: 'matriz_sernic',
    nome: 'Matriz SERNIC',
    categoria: 'Vermelho Institucional',
    descricao: 'Bordô profundo suave e sóbrio para máxima concentração.',
    bgGradient: 'linear-gradient(160deg, #6B1113 0%, #480A0C 60%, #1C0304 100%)',
    previewColor: '#6B1113',
    glowColor: 'rgba(183, 28, 28, 0.2)',
    watermarkOpacity: 0.075,
    isDark: true
  },
  {
    id: 'granada_executivo',
    nome: 'Granada Executivo',
    categoria: 'Vermelho Institucional',
    descricao: 'Degradê granada minimalista com acabamento fosco sem brilho excessivo.',
    bgGradient: 'linear-gradient(145deg, #7A1417 0%, #3D0709 100%)',
    previewColor: '#7A1417',
    glowColor: 'rgba(183, 28, 28, 0.18)',
    watermarkOpacity: 0.07,
    isDark: true
  },

  // ── CATEGORIA 2: OBSIDIANA E NOITE CIBERNÉTICA (5 MODELOS) ──
  {
    id: 'obsidiana_pura',
    nome: 'Obsidiana Pura',
    categoria: 'Obsidiana e Grafite',
    descricao: 'Preto nobre profundo com halo carmesim ultra discreto no centro.',
    bgGradient: 'radial-gradient(circle at 50% 35%, #1F0D11 0%, #0D0507 55%, #050203 100%)',
    previewColor: '#0D0507',
    glowColor: 'rgba(220, 38, 38, 0.15)',
    watermarkOpacity: 0.07,
    isDark: true
  },
  {
    id: 'ardosia_cibernetica',
    nome: 'Ardósia Cibernética',
    categoria: 'Obsidiana e Grafite',
    descricao: 'Grafite azulado sóbrio e moderno com estética de operações táticas.',
    bgGradient: 'linear-gradient(160deg, #1C2433 0%, #141A25 60%, #0A0D14 100%)',
    previewColor: '#1C2433',
    glowColor: 'rgba(59, 130, 246, 0.2)',
    watermarkOpacity: 0.065,
    isDark: true
  },
  {
    id: 'carbono_digital',
    nome: 'Carbono Digital',
    categoria: 'Obsidiana e Grafite',
    descricao: 'Cinza chumbo tecnológico profundo com textura de contraste perfeita.',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #2D3748 0%, #1A202C 55%, #0F131A 100%)',
    previewColor: '#2D3748',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    watermarkOpacity: 0.065,
    isDark: true
  },
  {
    id: 'furtivo_matte',
    nome: 'Furtivo Matte',
    categoria: 'Obsidiana e Grafite',
    descricao: 'Preto fosco executivo sem reflexos para descanso visual prolongado.',
    bgGradient: 'linear-gradient(150deg, #18191C 0%, #101114 60%, #09090A 100%)',
    previewColor: '#101114',
    glowColor: 'rgba(255, 255, 255, 0.1)',
    watermarkOpacity: 0.06,
    isDark: true
  },
  {
    id: 'grafite_nano',
    nome: 'Grafite Nano',
    categoria: 'Obsidiana e Grafite',
    descricao: 'Tom titânio escuro com iluminação volumétrica limpa e sem ruído.',
    bgGradient: 'linear-gradient(165deg, #222938 0%, #131720 100%)',
    previewColor: '#222938',
    glowColor: 'rgba(100, 116, 139, 0.2)',
    watermarkOpacity: 0.06,
    isDark: true
  },

  // ── CATEGORIA 3: AZUL ESPACIAL & TÁTICO (4 MODELOS) ──
  {
    id: 'comando_meia_noite',
    nome: 'Comando Meia-Noite',
    categoria: 'Azul Espacial & Tático',
    descricao: 'Azul marinho ultra escuro clássico de salas de comando institucionais.',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #152238 0%, #0D1624 55%, #060B12 100%)',
    previewColor: '#152238',
    glowColor: 'rgba(37, 99, 235, 0.2)',
    watermarkOpacity: 0.065,
    isDark: true
  },
  {
    id: 'espaco_profundo',
    nome: 'Espaço Profundo',
    categoria: 'Azul Espacial & Tático',
    descricao: 'Azul noite suave e sereno, garantindo leitura agradável e sem esforço.',
    bgGradient: 'linear-gradient(160deg, #1B365D 0%, #0D1B4B 60%, #050B20 100%)',
    previewColor: '#1B365D',
    glowColor: 'rgba(21, 101, 192, 0.2)',
    watermarkOpacity: 0.07,
    isDark: true
  },
  {
    id: 'cobalto_cyber',
    nome: 'Cobalto Cyber',
    categoria: 'Azul Espacial & Tático',
    descricao: 'Tom cobalto escuro com acabamento tático sóbrio de investigação.',
    bgGradient: 'linear-gradient(150deg, #0F2A4A 0%, #07172B 100%)',
    previewColor: '#0F2A4A',
    glowColor: 'rgba(2, 119, 189, 0.2)',
    watermarkOpacity: 0.065,
    isDark: true
  },
  {
    id: 'abismo_digital',
    nome: 'Abismo Digital',
    categoria: 'Azul Espacial & Tático',
    descricao: 'Transição suave entre safira escura e preto profundo.',
    bgGradient: 'radial-gradient(circle at 50% 30%, #122035 0%, #080E18 70%)',
    previewColor: '#122035',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    watermarkOpacity: 0.06,
    isDark: true
  },

  // ── CATEGORIA 4: TÁTICO & INTELIGÊNCIA (2 MODELOS) ──
  {
    id: 'radar_esmeralda',
    nome: 'Radar Esmeralda',
    categoria: 'Tático & Inteligência',
    descricao: 'Verde militar profundo discreto com atmosfera de inteligência tática.',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #132E20 0%, #0A1B12 60%, #040D08 100%)',
    previewColor: '#132E20',
    glowColor: 'rgba(16, 185, 129, 0.2)',
    watermarkOpacity: 0.065,
    isDark: true
  },
  {
    id: 'floresta_digital',
    nome: 'Floresta Digital',
    categoria: 'Tático & Inteligência',
    descricao: 'Verde floresta escuro minimalista para operações discretas.',
    bgGradient: 'linear-gradient(160deg, #1B5E20 0%, #0B330F 60%, #041406 100%)',
    previewColor: '#1B5E20',
    glowColor: 'rgba(34, 197, 94, 0.18)',
    watermarkOpacity: 0.07,
    isDark: true
  },

  // ── CATEGORIA 5: DOURADO & BRONZE INSTITUCIONAL (2 MODELOS) ──
  {
    id: 'terminal_ambar',
    nome: 'Terminal Âmbar',
    categoria: 'Dourado & Bronze',
    descricao: 'Bronze profundo com reflexo âmbar acolhedor e distinto.',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, #3B2312 0%, #201309 60%, #0D0704 100%)',
    previewColor: '#3B2312',
    glowColor: 'rgba(245, 158, 11, 0.2)',
    watermarkOpacity: 0.07,
    isDark: true
  },
  {
    id: 'ouro_titanio',
    nome: 'Ouro Titânio',
    categoria: 'Dourado & Bronze',
    descricao: 'Preto acetinado com realce dourado suave alusivo ao distintivo SERNIC.',
    bgGradient: 'linear-gradient(155deg, #2D2214 0%, #151009 50%, #0A0704 100%)',
    previewColor: '#2D2214',
    glowColor: 'rgba(251, 191, 36, 0.2)',
    watermarkOpacity: 0.075,
    isDark: true
  },

  // ── CATEGORIA 6: MODO CLARO FUTURISTA LIMPO (2 MODELOS) ──
  {
    id: 'minimalista_puro',
    nome: 'Minimalista Puro',
    categoria: 'Modo Claro Futurista',
    descricao: 'Branco luminoso com suave cinza perolado e marca d’água translúcida.',
    bgGradient: 'linear-gradient(160deg, #FFFFFF 0%, #F1F5F9 50%, #E2E8F0 100%)',
    previewColor: '#F8FAFC',
    glowColor: 'rgba(183, 28, 28, 0.1)',
    watermarkOpacity: 0.05,
    isDark: false
  },
  {
    id: 'titanio_cristalino',
    nome: 'Titânio Cristalino',
    categoria: 'Modo Claro Futurista',
    descricao: 'Cinza prata aerodinâmico e limpo com reflexos brancos puros.',
    bgGradient: 'radial-gradient(circle at 50% 30%, #F8FAFC 0%, #E2E8F0 60%, #CBD5E1 100%)',
    previewColor: '#E2E8F0',
    glowColor: 'rgba(148, 163, 184, 0.15)',
    watermarkOpacity: 0.05,
    isDark: false
  }
];

export const getBackgroundModel = (modelId) => {
  return BACKGROUND_MODELS.find(m => m.id === modelId) || BACKGROUND_MODELS[0];
};
