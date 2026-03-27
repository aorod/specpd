// Sub-statuses reais extraídos do Azure DevOps Analytics (WorkItemType = "Caso de Uso")
// Itens neste conjunto SEM requisito vinculado são classificados como Engenharia Reversa.
export const SUBSTATUS_CRITICOS = [
  // Fase: Desenvolvendo
  'Desenvolvendo: Aguardando Build',
  'Desenvolvendo: Backlog',
  'Desenvolvendo: Desenvolvendo',
  'Desenvolvendo: Devolvido',
  'Desenvolvendo: Stand By',
  // Fase: Testando
  'Testando: Fila de Testes',
  'Testando: Testando',
  'Testando: Validado',
  'Testando: Stand By',
  // Fase: Finalizado
  'Finalizado: Beta [restrito]',
  'Finalizado: Entregue',
];

export const FLUXO_NORMAL = 'Fluxo Normal Completo';
export const FLUXO_ER = 'Engenharia Reversa';

/**
 * Classifica o fluxo de um item como "Engenharia Reversa" ou "Fluxo Normal Completo".
 * Lógica baseada exclusivamente em subStatus e requisito.
 * @param {{ subStatus: string, requisito: string|null|undefined }} item
 * @returns {string}
 */
export function classifyFluxo(item) {
  if (!SUBSTATUS_CRITICOS.includes(item.subStatus)) {
    return FLUXO_NORMAL;
  }
  if (!item.requisito || item.requisito.trim() === '') {
    return FLUXO_ER;
  }
  return FLUXO_NORMAL;
}
