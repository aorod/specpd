
export const FLUXO_NORMAL = 'Fluxo Normal Completo';
export const FLUXO_ER = 'Engenharia Reversa';

/**
 * Classifica o fluxo de um item como "Engenharia Reversa" ou "Fluxo Normal Completo".
 * Lógica baseada na tag "EF: Eng. Reversa" presente no campo TagNames.
 * @param {{ tags: string }} item
 * @returns {string}
 */
export function classifyFluxo(item) {
  const tags = item.tags || '';
  if (tags.split(';').map((t) => t.trim()).includes('EF: Eng. Reversa')) {
    return FLUXO_ER;
  }
  return FLUXO_NORMAL;
}
