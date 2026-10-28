/**
 * Catálogo Completo de Modelos de Posicionamento do Brasão/Ícone SERNIC como Fundo Transparente
 * Oferece configurações Únicas, Duplicadas, Triplicadas, Múltiplas e Monumentais / Gigantes.
 */

export const ESCALAS_BRASAO = [
  { id: '1.0', label: 'Padrão (100%)', mult: 1.0, icon: '📐' },
  { id: '1.35', label: 'Grande (135%)', mult: 1.35, icon: '🔍' },
  { id: '1.7', label: 'Monumental (170%)', mult: 1.7, icon: '🏛️' },
  { id: '2.1', label: 'Gigante Maxi (210%)', mult: 2.1, icon: '👑' },
];

export const getEscalaMultiplier = (val) => {
  if (!val) return 1.0;
  if (typeof val === 'number') return val;
  const found = ESCALAS_BRASAO.find(e => e.id === String(val) || e.label.toLowerCase().includes(String(val).toLowerCase()));
  if (found) return found.mult;
  const num = parseFloat(val);
  return isNaN(num) || num <= 0 ? 1.0 : num;
};

export const BACKGROUND_POSITIONS = [
  // ── 1 a 10: CONFIGURAÇÕES ÚNICAS (1 BRASÃO) ──
  {
    id: 'centro_imponente',
    nome: 'Centro Imponente',
    categoria: 'Único',
    tipoDesign: 'Central Solene',
    descricao: 'Um brasão oficial de grande porte, centralizado com solenidade e prestígio no núcleo do sistema.',
    icon: '🎯',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '680px', maxWidth: '78vw', maxHeight: '78vh', opacityMult: 1.0 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '44px' }
    ]
  },
  {
    id: 'centro_compacto',
    nome: 'Centro Compacto',
    categoria: 'Único',
    tipoDesign: 'Central Discreto',
    descricao: 'Brasão centralizado em escala moderada e minimalista, mantendo total clareza nos dados.',
    icon: '🔍',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '420px', maxWidth: '50vw', maxHeight: '50vh', opacityMult: 0.95 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '26px' }
    ]
  },
  {
    id: 'canto_superior_direito',
    nome: 'Canto Superior Direito',
    categoria: 'Único',
    tipoDesign: 'Chancela Executiva',
    descricao: 'Insígnia discreta no quadrante executivo superior direito, equilibrando a visão dos dados.',
    icon: '↗️',
    emblems: [
      { top: '90px', right: '40px', size: '380px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '10px', right: '10px', size: '24px' }
    ]
  },
  {
    id: 'canto_superior_esquerdo',
    nome: 'Canto Superior Esquerdo',
    categoria: 'Único',
    tipoDesign: 'Vértice Tático',
    descricao: 'Posicionamento tático institucional no canto superior esquerdo da área de trabalho.',
    icon: '↖️',
    emblems: [
      { top: '90px', left: '40px', size: '380px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '10px', left: '16px', size: '24px' }
    ]
  },
  {
    id: 'canto_inferior_direito',
    nome: 'Canto Inferior Direito',
    categoria: 'Único',
    tipoDesign: 'Selo de Autenticidade',
    descricao: 'Chancela pericial de segurança alinhada ao canto inferior direito como marca de garantia.',
    icon: '↘️',
    emblems: [
      { bottom: '40px', right: '40px', size: '400px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { bottom: '10px', right: '10px', size: '24px' }
    ]
  },
  {
    id: 'canto_inferior_esquerdo',
    nome: 'Canto Inferior Esquerdo',
    categoria: 'Único',
    tipoDesign: 'Chancela de Base',
    descricao: 'Brasão sóbrio na base esquerda, mantendo os painéis centrais totalmente desimpedidos.',
    icon: '↙️',
    emblems: [
      { bottom: '40px', left: '40px', size: '400px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { bottom: '10px', left: '16px', size: '24px' }
    ]
  },
  {
    id: 'lateral_direita_flutuante',
    nome: 'Lateral Direita Flutuante',
    categoria: 'Único',
    tipoDesign: 'Flanco Direito',
    descricao: 'Símbolo verticalmente centrado na margem lateral direita do ambiente de trabalho.',
    icon: '▶️',
    emblems: [
      { top: '50%', right: '35px', transform: 'translateY(-50%)', size: '500px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '50%', right: '10px', transform: 'translateY(-50%)', size: '32px' }
    ]
  },
  {
    id: 'lateral_esquerda_flutuante',
    nome: 'Lateral Esquerda Flutuante',
    categoria: 'Único',
    tipoDesign: 'Flanco Esquerdo',
    descricao: 'Símbolo verticalmente centrado ao longo da margem interna de navegação.',
    icon: '◀️',
    emblems: [
      { top: '50%', left: '35px', transform: 'translateY(-50%)', size: '500px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '50%', left: '16px', transform: 'translateY(-50%)', size: '32px' }
    ]
  },
  {
    id: 'topo_centralizado',
    nome: 'Topo Centralizado',
    categoria: 'Único',
    tipoDesign: 'Estandarte Superior',
    descricao: 'Emblema em arco superior suave posicionado logo abaixo da barra de navegação.',
    icon: '⬆️',
    emblems: [
      { top: '85px', left: '50%', transform: 'translateX(-50%)', size: '440px', opacityMult: 0.85 }
    ],
    previewEmblems: [
      { top: '8px', left: '50%', transform: 'translateX(-50%)', size: '28px' }
    ]
  },
  {
    id: 'base_centralizada',
    nome: 'Base Centralizada',
    categoria: 'Único',
    tipoDesign: 'Fundação Central',
    descricao: 'Selo de integridade forense fixado de forma graciosa na base inferior da tela.',
    icon: '⬇️',
    emblems: [
      { bottom: '25px', left: '50%', transform: 'translateX(-50%)', size: '440px', opacityMult: 0.85 }
    ],
    previewEmblems: [
      { bottom: '8px', left: '50%', transform: 'translateX(-50%)', size: '28px' }
    ]
  },

  // ── 11 a 16: CONFIGURAÇÕES DUPLICADAS (2 BRASÕES) ──
  {
    id: 'duplo_lateral_espelhado',
    nome: 'Duplo Lateral Espelhado',
    categoria: 'Duplicado',
    tipoDesign: 'Colunas Simétricas',
    descricao: 'Dois brasões simétricos nas margens esquerda e direita, emoldurando os quadros de trabalho.',
    icon: '⚖️',
    emblems: [
      { top: '50%', left: '35px', transform: 'translateY(-50%)', size: '420px', opacityMult: 0.8 },
      { top: '50%', right: '35px', transform: 'translateY(-50%)', size: '420px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '50%', left: '14px', transform: 'translateY(-50%)', size: '24px' },
      { top: '50%', right: '14px', transform: 'translateY(-50%)', size: '24px' }
    ]
  },
  {
    id: 'duplo_diagonal_oposta',
    nome: 'Duplo Diagonal Oposta',
    categoria: 'Duplicado',
    tipoDesign: 'Vetor Diagonal A',
    descricao: 'Composição dinâmica cruzada do canto superior esquerdo ao canto inferior direito.',
    icon: '⤡',
    emblems: [
      { top: '85px', left: '40px', size: '360px', opacityMult: 0.8 },
      { bottom: '35px', right: '40px', size: '360px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '10px', left: '16px', size: '22px' },
      { bottom: '10px', right: '14px', size: '22px' }
    ]
  },
  {
    id: 'duplo_diagonal_invertida',
    nome: 'Duplo Diagonal Invertida',
    categoria: 'Duplicado',
    tipoDesign: 'Vetor Diagonal B',
    descricao: 'Composição dinâmica cruzada do canto superior direito ao canto inferior esquerdo.',
    icon: '⤢',
    emblems: [
      { top: '85px', right: '40px', size: '360px', opacityMult: 0.8 },
      { bottom: '35px', left: '40px', size: '360px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '10px', right: '14px', size: '22px' },
      { bottom: '10px', left: '16px', size: '22px' }
    ]
  },
  {
    id: 'duplo_cantos_superiores',
    nome: 'Duplo Cantos Superiores',
    categoria: 'Duplicado',
    tipoDesign: 'Estandartes de Topo',
    descricao: 'Par de insígnias nos dois vértices superiores, emulando pórticos de honra institucional.',
    icon: '🏛️',
    emblems: [
      { top: '85px', left: '40px', size: '340px', opacityMult: 0.8 },
      { top: '85px', right: '40px', size: '340px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '10px', left: '16px', size: '22px' },
      { top: '10px', right: '14px', size: '22px' }
    ]
  },
  {
    id: 'duplo_cantos_inferiores',
    nome: 'Duplo Cantos Inferiores',
    categoria: 'Duplicado',
    tipoDesign: 'Selos de Base',
    descricao: 'Dois selos simétricos de validação na base inferior das áreas de dados.',
    icon: '⚓',
    emblems: [
      { bottom: '35px', left: '40px', size: '340px', opacityMult: 0.8 },
      { bottom: '35px', right: '40px', size: '340px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { bottom: '10px', left: '16px', size: '22px' },
      { bottom: '10px', right: '14px', size: '22px' }
    ]
  },
  {
    id: 'duplo_vertical_central',
    nome: 'Duplo Vertical Central',
    categoria: 'Duplicado',
    tipoDesign: 'Meridiano Central',
    descricao: 'Dois símbolos alinhados no meridiano vertical (topo e base), abraçando os quadros.',
    icon: '↕️',
    emblems: [
      { top: '85px', left: '50%', transform: 'translateX(-50%)', size: '360px', opacityMult: 0.8 },
      { bottom: '25px', left: '50%', transform: 'translateX(-50%)', size: '360px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '8px', left: '50%', transform: 'translateX(-50%)', size: '22px' },
      { bottom: '8px', left: '50%', transform: 'translateX(-50%)', size: '22px' }
    ]
  },

  // ── 17 e 18: CONFIGURAÇÕES TRIPLICADAS (3 BRASÕES) ──
  {
    id: 'triplo_alinhado_superior',
    nome: 'Triplo Alinhado Superior',
    categoria: 'Triplicado',
    tipoDesign: 'Tríade de Topo',
    descricao: 'Três insígnias periciais alinhadas horizontalmente na faixa superior de comando.',
    icon: '👑',
    emblems: [
      { top: '85px', left: '40px', size: '300px', opacityMult: 0.75 },
      { top: '85px', left: '50%', transform: 'translateX(-50%)', size: '300px', opacityMult: 0.75 },
      { top: '85px', right: '40px', size: '300px', opacityMult: 0.75 }
    ],
    previewEmblems: [
      { top: '8px', left: '18px', size: '18px' },
      { top: '8px', left: '50%', transform: 'translateX(-50%)', size: '18px' },
      { top: '8px', right: '14px', size: '18px' }
    ]
  },
  {
    id: 'triplo_triangular_tatico',
    nome: 'Triplo Triangular Tático',
    categoria: 'Triplicado',
    tipoDesign: 'Trígono de Segurança',
    descricao: 'Geometria triangular de segurança: 1 emblema superior central e 2 nas bases laterais.',
    icon: '🔺',
    emblems: [
      { top: '85px', left: '50%', transform: 'translateX(-50%)', size: '350px', opacityMult: 0.8 },
      { bottom: '35px', left: '40px', size: '300px', opacityMult: 0.75 },
      { bottom: '35px', right: '40px', size: '300px', opacityMult: 0.75 }
    ],
    previewEmblems: [
      { top: '8px', left: '50%', transform: 'translateX(-50%)', size: '22px' },
      { bottom: '8px', left: '16px', size: '18px' },
      { bottom: '8px', right: '14px', size: '18px' }
    ]
  },

  // ── 19 e 20: CONFIGURAÇÕES MÚLTIPLAS (4 e 5 BRASÕES) ──
  {
    id: 'quadruplo_quatro_cantos',
    nome: 'Quádruplo em 4 Cantos',
    categoria: 'Múltiplo',
    tipoDesign: 'Baluarte Quádruplo',
    descricao: 'Quatro emblemas perfeitamente ancorados nos quatro vértices cardeais da tela.',
    icon: '⛶',
    emblems: [
      { top: '85px', left: '40px', size: '280px', opacityMult: 0.75 },
      { top: '85px', right: '40px', size: '280px', opacityMult: 0.75 },
      { bottom: '35px', left: '40px', size: '280px', opacityMult: 0.75 },
      { bottom: '35px', right: '40px', size: '280px', opacityMult: 0.75 }
    ],
    previewEmblems: [
      { top: '8px', left: '16px', size: '18px' },
      { top: '8px', right: '14px', size: '18px' },
      { bottom: '8px', left: '16px', size: '18px' },
      { bottom: '8px', right: '14px', size: '18px' }
    ]
  },
  {
    id: 'quintuplo_cruz_tatica',
    nome: 'Quíntuplo Cruz Tática',
    categoria: 'Múltiplo',
    tipoDesign: 'Pentágono Institucional',
    descricao: 'Composição magna de honra: brasão central ladeado por quatro selos nos cantos.',
    icon: '⭐',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '420px', opacityMult: 1.0 },
      { top: '85px', left: '40px', size: '240px', opacityMult: 0.7 },
      { top: '85px', right: '40px', size: '240px', opacityMult: 0.7 },
      { bottom: '35px', left: '40px', size: '240px', opacityMult: 0.7 },
      { bottom: '35px', right: '40px', size: '240px', opacityMult: 0.7 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '26px' },
      { top: '8px', left: '16px', size: '14px' },
      { top: '8px', right: '14px', size: '14px' },
      { bottom: '8px', left: '16px', size: '14px' },
      { bottom: '8px', right: '14px', size: '14px' }
    ]
  },

  // ── 21 a 28: CONFIGURAÇÕES MONUMENTAIS / GIGANTES (BRASÕES EXTRA GRANDES) ──
  {
    id: 'centro_monumental_maxi',
    nome: 'Centro Monumental Gigante',
    categoria: 'Monumental',
    tipoDesign: 'Chancela Suprema',
    descricao: 'Brasão central em escala monumental (940px), preenchendo o fundo de ponta a ponta com majestade.',
    icon: '🏛️',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '940px', maxWidth: '92vw', maxHeight: '92vh', opacityMult: 0.95 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '56px' }
    ]
  },
  {
    id: 'marca_dagua_panoramica_total',
    nome: 'Marca d’Água Panorâmica Total',
    categoria: 'Monumental',
    tipoDesign: 'Fundo Integral',
    descricao: 'Emblema gigante em escala total (1120px) abrangendo a tela inteira como papel de parede de segurança.',
    icon: '🛡️',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '1120px', maxWidth: '98vw', maxHeight: '98vh', opacityMult: 0.88 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '64px' }
    ]
  },
  {
    id: 'duplo_gigante_flutuante',
    nome: 'Duplo Gigante Flutuante',
    categoria: 'Monumental',
    tipoDesign: 'Colossos Laterais',
    descricao: 'Dois brasões gigantescos (620px cada) nas margens esquerda e direita abraçando o espaço de trabalho.',
    icon: '⚖️',
    emblems: [
      { top: '50%', left: '20px', transform: 'translateY(-50%)', size: '620px', opacityMult: 0.85 },
      { top: '50%', right: '20px', transform: 'translateY(-50%)', size: '620px', opacityMult: 0.85 }
    ],
    previewEmblems: [
      { top: '50%', left: '8px', transform: 'translateY(-50%)', size: '32px' },
      { top: '50%', right: '8px', transform: 'translateY(-50%)', size: '32px' }
    ]
  },
  {
    id: 'triplo_monumental_trigono',
    nome: 'Triplo Monumental Trígono',
    categoria: 'Monumental',
    tipoDesign: 'Tríade Magna',
    descricao: 'Três brasões de grande escala (520px e 450px) em disposição triangular de comando e autoridade.',
    icon: '🔺',
    emblems: [
      { top: '75px', left: '50%', transform: 'translateX(-50%)', size: '520px', opacityMult: 0.85 },
      { bottom: '25px', left: '25px', size: '450px', opacityMult: 0.8 },
      { bottom: '25px', right: '25px', size: '450px', opacityMult: 0.8 }
    ],
    previewEmblems: [
      { top: '6px', left: '50%', transform: 'translateX(-50%)', size: '28px' },
      { bottom: '6px', left: '10px', size: '24px' },
      { bottom: '6px', right: '10px', size: '24px' }
    ]
  },
  {
    id: 'quintuplo_monumental_supremo',
    nome: 'Quíntuplo Monumental Supremo',
    categoria: 'Monumental',
    tipoDesign: 'Pentagrama de Força',
    descricao: 'Super composição de alto prestígio: brasão central de 600px cercado por quatro brasões de 340px.',
    icon: '⭐',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '600px', opacityMult: 0.95 },
      { top: '75px', left: '25px', size: '340px', opacityMult: 0.75 },
      { top: '75px', right: '25px', size: '340px', opacityMult: 0.75 },
      { bottom: '25px', left: '25px', size: '340px', opacityMult: 0.75 },
      { bottom: '25px', right: '25px', size: '340px', opacityMult: 0.75 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '34px' },
      { top: '6px', left: '10px', size: '16px' },
      { top: '6px', right: '10px', size: '16px' },
      { bottom: '6px', left: '10px', size: '16px' },
      { bottom: '6px', right: '10px', size: '16px' }
    ]
  },
  {
    id: 'lateral_gigante_direita',
    nome: 'Lateral Direita Monumental',
    categoria: 'Monumental',
    tipoDesign: 'Flanco Gigante',
    descricao: 'Um brasão colossal de 820px ancorado na lateral direita, contornando elegantemente as tabelas.',
    icon: '▶️',
    emblems: [
      { top: '50%', right: '20px', transform: 'translateY(-50%)', size: '820px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '50%', right: '6px', transform: 'translateY(-50%)', size: '48px' }
    ]
  },
  {
    id: 'lateral_gigante_esquerda',
    nome: 'Lateral Esquerda Monumental',
    categoria: 'Monumental',
    tipoDesign: 'Flanco Gigante',
    descricao: 'Um brasão colossal de 820px ancorado na margem esquerda do espaço de trabalho.',
    icon: '◀️',
    emblems: [
      { top: '50%', left: '20px', transform: 'translateY(-50%)', size: '820px', opacityMult: 0.9 }
    ],
    previewEmblems: [
      { top: '50%', left: '6px', transform: 'translateY(-50%)', size: '48px' }
    ]
  },
  {
    id: 'login_heroico_central',
    nome: 'Login Heróico Central',
    categoria: 'Monumental',
    tipoDesign: 'Aura Central de Acesso',
    descricao: 'Especialmente concebido para a tela de Login: brasão solene de 880px centrado no card de credenciais.',
    icon: '🔐',
    emblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '880px', maxWidth: '90vw', maxHeight: '90vh', opacityMult: 1.05 }
    ],
    previewEmblems: [
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', size: '52px' }
    ]
  }
];

export const getBackgroundPosition = (positionId) => {
  return BACKGROUND_POSITIONS.find(p => p.id === positionId) || BACKGROUND_POSITIONS[0];
};
