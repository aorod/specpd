const MES_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MES_NOMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

/**
 * Formata uma string "YYYY-MM" para "Mmm YYYY". Ex.: "2026-03" → "Mar 2026".
 * Usado nos eixos dos gráficos de linha.
 * @param {string} mesKey - "YYYY-MM"
 * @returns {string}
 */
export function formatMes(mesKey) {
  const [year, month] = mesKey.split('-');
  return `${MES_LABELS[parseInt(month, 10) - 1]} ${year}`;
}

/**
 * Formata um número de mês (zero-padded) para "N - NomeMes". Ex.: "03" → "3 - Março".
 * Usado na tabela, filtros e tooltips.
 * @param {string} mes - "01" a "12"
 * @returns {string}
 */
export function formatMesLabel(mes) {
  const n = parseInt(mes, 10);
  if (!n || n < 1 || n > 12) return mes || '';
  return `${n} - ${MES_NOMES[n - 1]}`;
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
 * Formata horas no padrão brasileiro (ponto como milhar, vírgula como decimal).
 * Ex.: 3392.1  → "3.392,1"
 *      179.3   → "179,3"
 *      2269    → "2.269"
 *      8       → "8"
 * @param {number|null} value
 * @returns {string}
 */
export function formatHoras(value) {
  if (value == null || isNaN(value)) return '—';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
