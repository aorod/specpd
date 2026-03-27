// Mapeamento dos states reais do Azure DevOps para rótulos visuais simplificados
const STATE_LABELS = {
  'Construindo':        'Construindo',
  'Desenvolvimento':    'Em desenvolvimento',
  'Devolvidos':         'Devolvido',
  'Finalizado':         'Concluído',
  'Não Iniciado':       'Não iniciado',
  'Pronto para Deploy': 'Pronto p/ Deploy',
  'Removido':           'Removido',
  'Stand By':           'Em espera',
  'Stand By Externo':   'Stand By Externo',
  'Stand By Interno':   'Stand By Interno',
  'Testando':           'Em teste',
};

/**
 * Retorna o rótulo visual simplificado para o state de um item.
 * @param {{ state: string }} item
 * @returns {string}
 */
export function classifyState(item) {
  return STATE_LABELS[item.state] ?? item.state ?? 'Outro';
}
