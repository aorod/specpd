const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Formata uma string "YYYY-MM" para "Mmm YYYY". Ex.: "2026-03" → "Mar 2026".
 * @param {string} mes
 * @returns {string}
 */
export function formatMes(mes) {
  const [year, month] = mes.split('-');
  return `${MES_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

/**
 * Formata um percentual com 1 casa decimal. Ex.: pct(8, 24) → "33.3".
 * @param {number} value
 * @param {number} total
 * @returns {string}
 */
export function pct(value, total) {
  if (!total) return '0.0';
  return ((value / total) * 100).toFixed(1);
}

/**
 * Trunca uma string adicionando reticências se ultrapassar maxLen.
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 50) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}
