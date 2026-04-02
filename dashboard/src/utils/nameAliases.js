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

/**
 * Retorna o alias do nome, ou o nome original se não houver mapeamento.
 * @param {string} name
 * @returns {string}
 */
export function aliasName(name) {
  if (!name) return name;
  return NAME_ALIASES[name.trim()] ?? name;
}
