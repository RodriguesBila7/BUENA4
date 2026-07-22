import React from 'react';

// Um logótipo institucional elegante (escudo policial/investigativo com balança da justiça e estrelas)
export const DefaultLogo = ({ className = "w-16 h-16" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Escudo de Fundo */}
      <path 
        d="M50 5C75 5 85 15 85 40C85 70 50 95 50 95C50 95 15 70 15 40C15 15 25 5 50 5Z" 
        fill="var(--color-primary)" 
        stroke="var(--color-accent)" 
        strokeWidth="3"
        strokeLinejoin="round"
      />
      
      {/* Linhas de Destaque Internas */}
      <path 
        d="M50 9C71 9 79 18 79 40C79 65 50 87 50 87C50 87 21 65 21 40C21 18 29 9 50 9Z" 
        stroke="rgba(255, 255, 255, 0.15)" 
        strokeWidth="1.5"
      />

      {/* Balança da Justiça (Simbolizando Investigação e Lei) */}
      {/* Haste Central */}
      <rect x="48" y="25" width="4" height="35" rx="1" fill="#E2E8F0" />
      <circle cx="50" cy="22" r="3" fill="#ECC94B" /> {/* Topo Dourado */}
      
      {/* Trave Horizontal */}
      <path d="M30 32H70" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Pratos e Correntes */}
      {/* Prato Esquerdo */}
      <path d="M30 32L24 45H36L30 32Z" stroke="#ECC94B" strokeWidth="1" fill="rgba(236, 201, 75, 0.2)" />
      <path d="M22 45C22 48 38 48 38 45" stroke="#ECC94B" strokeWidth="1.5" />
      
      {/* Prato Direito */}
      <path d="M70 32L64 45H76L70 32Z" stroke="#ECC94B" strokeWidth="1" fill="rgba(236, 201, 75, 0.2)" />
      <path d="M62 45C62 48 78 48 78 45" stroke="#ECC94B" strokeWidth="1.5" />

      {/* Base da Balança */}
      <path d="M40 60H60" stroke="#E2E8F0" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 63H65" stroke="#E2E8F0" strokeWidth="2.5" strokeLinecap="round" />

      {/* Estrelas do Topo (Douradas) */}
      <polygon points="50,11 51.5,14 55,14 52.5,16 53.5,19 50,17.5 46.5,19 47.5,16 45,14 48.5,14" fill="#ECC94B" />
      <polygon points="38,13 39.5,15.5 42,15.5 40,17 40.5,19.5 38,18.2 35.5,19.5 36,17 34,15.5 36.5,15.5" fill="#ECC94B" opacity="0.8" />
      <polygon points="62,13 63.5,15.5 66,15.5 64,17 64.5,19.5 62,18.2 59.5,19.5 60,17 58,15.5 60.5,15.5" fill="#ECC94B" opacity="0.8" />

      {/* Lupa (Simbolizando Investigação Criminal) no Canto */}
      <circle cx="50" cy="50" r="10" stroke="#10B981" strokeWidth="2" fill="rgba(16, 185, 129, 0.1)" />
      <line x1="57" y1="57" x2="68" y2="68" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
};
