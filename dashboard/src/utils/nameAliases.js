const NAME_ALIASES = {
  'Anderson do Rego Rodrigues de Oliveira': 'Anderson Oliveira',
  'Ana Carolina Ataliba do Nascimento':     'Ana Carolina',
  'Daniel Castro Joia':                    'Daniel Joia',
  'Daniel Marinho Huanchicay':              'Daniel Huanchicay',
  'Diego Ferreira da Silva':               'Diego Ferreira',
  'Etiene Barreto De Oliveira':            'Etiene Oliveira',
  'Leonardo Rego Morrot':                  'Leonardo Morrot',
  'Lorraine Beatriz dos Santos Sousa':     'Lorraine Santos',
  'Luana dos Santos da Silva':             'Luana da Silva',
  'Lucas Ceciliano Teixeira':              'Lucas Ceciliano',
  'Vando Rodrigues dos Santos':            'Vando Rodrigues',
  'Willian Alexandre Dutra Nunes':         'Willian Nunes',
  'Larissa Carvalho Rodrigues':           'Larissa Carvalho',
  'Jessica Cristina Abreu Costa':         'Jessica Costa',
  'Bruno Basini Camargo':                 'Bruno Bassini',
  'Rafaele Barbosa da Silva Serrano':         'Rafaele Barbosa',
  'Fabricia Alves da Silva Carneiro Souto':   'Fabricia Alves',
  'Leandro Campos Lima':                  'Leandro Campos',
  'Priscila Lopes Gonzaga':               'Priscila Lopes',
  'Leonardo Jorge Silva Rodriguez':         'Leonardo Silva',
};

function _normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function _allWordsMatch(registroNome, azureDevOpsName) {
  const words  = _normalize(registroNome).split(/\s+/).filter(Boolean);
  const target = _normalize(azureDevOpsName);
  return words.every(w => target.includes(w));
}

/**
 * Retorna o nome do analista no Registro de Analistas (se existir match por
 * palavras), ou o alias estático, ou o nome original.
 * @param {string} name  Nome vindo do Azure DevOps
 * @returns {string}
 */
export function aliasName(name) {
  if (!name) return name;
  const trimmed = name.trim();
  // 1. De/para dinâmico: busca nos analistas ativos do Registro de Analistas
  try {
    const analistas = JSON.parse(localStorage.getItem('config_analistas') || '[]');
    const match = analistas
      .filter(a => a.ativo !== false)
      .find(a => _allWordsMatch(a.nome, trimmed));
    if (match) return match.nome;
  } catch { /* localStorage indisponível */ }
  // 2. Mapa estático legado
  return NAME_ALIASES[trimmed] ?? trimmed;
}

/**
 * Lista de analistas: { fullName, alias } ordenada pelo alias.
 */
export const ANALISTAS = Object.entries(NAME_ALIASES)
  .map(([fullName, alias]) => ({ fullName, alias }))
  .sort((a, b) => a.alias.localeCompare(b.alias));
