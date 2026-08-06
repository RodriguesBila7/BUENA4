export const mozambiqueStructure = [
  {
    province: "Direcção Geral",
    districts: ["Direcção Geral"]
  },
  {
    province: "Direcção da Cidade de Maputo",
    districts: ["KaMpfumo", "Nlhamankulu", "KaMaxakeni", "KaMavota", "KaMubukwana", "KaTembe", "KaNyaka"]
  },
  {
    province: "Direcção Provincial de Maputo",
    districts: ["Boane", "Magude", "Manhiça", "Marracuene", "Matola", "Matutuíne", "Moamba", "Namaacha"]
  },
  {
    province: "Direcção Provincial de Gaza",
    districts: ["Bilene", "Chibuto", "Chicualacuala", "Chigubo", "Chókwè", "Guijá", "Limpopo", "Mabalane", "Macia", "Mandlakaze", "Mapai", "Massangena", "Massingir", "Xai-Xai"]
  },
  {
    province: "Direcção Provincial de Inhambane",
    districts: ["Funhalouro", "Govuro", "Homoíne", "Inhambane", "Inharrime", "Inhassoro", "Jangamo", "Mabote", "Massinga", "Maxixe", "Morrumbene", "Panda", "Vilankulo", "Zavala"]
  },
  {
    province: "Direcção Provincial de Sofala",
    districts: ["Beira", "Búzi", "Caia", "Chemba", "Cheringoma", "Chibabava", "Dondo", "Gorongosa", "Machanga", "Maringué", "Muanza", "Nhamatanda"]
  },
  {
    province: "Direcção Provincial de Manica",
    districts: ["Bárue", "Chimoio", "Gondola", "Guro", "Macate", "Machaze", "Macossa", "Manica", "Mossurize", "Sussundenga", "Tambara", "Vanduzi"]
  },
  {
    province: "Direcção Provincial de Tete",
    districts: ["Angónia", "Cahora-Bassa", "Changara", "Chifunde", "Chiúta", "Dôa", "Macanga", "Magoé", "Marávia", "Moatize", "Mutarara", "Tete", "Tsangano", "Zumbo"]
  },
  {
    province: "Direcção Provincial da Zambézia",
    districts: ["Alto Molócuè", "Chinde", "Derre", "Gilé", "Gurué", "Ile", "Inhassunge", "Lugela", "Maganja da Costa", "Milange", "Mocuba", "Mopeia", "Morrumbala", "Mulevala", "Namacurra", "Namarroi", "Nicoadala", "Pebane", "Quelimane"]
  },
  {
    province: "Direcção Provincial de Nampula",
    districts: ["Angoche", "Eráti", "Ilha de Moçambique", "Lalaua", "Larde", "Liúpo", "Malema", "Meconta", "Mecubúri", "Memba", "Mogincual", "Mogovolas", "Moma", "Monapo", "Mossuril", "Muecate", "Murrupula", "Nacala Porto", "Nacala-a-Velha", "Nampula", "Rapale", "Ribáuè"]
  },
  {
    province: "Direcção Provincial de Niassa",
    districts: ["Chimbonila", "Cuamba", "Lago", "Lichinga", "Majune", "Mandimba", "Marrupa", "Maúa", "Mavago", "Mecanhelas", "Mecula", "Metarica", "Muembe", "N'gauma", "Nipepe", "Sanga"]
  },
  {
    province: "Direcção Provincial de Cabo Delgado",
    districts: ["Ancuabe", "Balama", "Chiúre", "Ibo", "Macomia", "Mecúfi", "Meluco", "Metuge", "Mocímboa da Praia", "Montepuez", "Mueda", "Muidumbe", "Namuno", "Nangade", "Palma", "Pemba", "Quissanga"]
  }
];

export const getDistrictsByProvinceName = (provName) => {
  if (!provName) return [];
  const pLower = provName.toLowerCase();
  const found = mozambiqueStructure.find(p => 
    p.province.toLowerCase().includes(pLower) || pLower.includes(p.province.toLowerCase())
  );
  return found ? found.districts : [];
};

export const formatDistrictName = (rawName) => {
  if (!rawName) return '';
  let trimmed = rawName.trim();

  // Limpar repetições de prefixo (ex: "Direcção Distrital de Direção Distrital de Funhalouro")
  while (/^Direcçã?o\s+Distrital\s+(de|da|do)?\s+Direcçã?o\s+Distrital/i.test(trimmed)) {
    trimmed = trimmed.replace(/^Direcçã?o\s+Distrital\s+(de|da|do)?\s+/i, '');
  }

  // Se já começa com "Direcção Distrital" ou "Direção Distrital", apenas padronizar para duplo cc
  if (/^Direcçã?o\s+Distrital/i.test(trimmed)) {
    return trimmed.replace(/^Direção\b/i, 'Direcção');
  }

  // Se for apenas o nome puro do distrito (ex: "Funhalouro", "Jangamo")
  const lower = trimmed.toLowerCase();
  if (['matola', 'beira', 'manhiça', 'namaacha', 'mavia', 'maganja da costa'].includes(lower) || lower.startsWith('ilha ') || lower.startsWith('cidade ')) {
    return `Direcção Distrital da ${trimmed}`;
  }
  return `Direcção Distrital de ${trimmed}`;
};

