// ── Algoritmo de Páscoa (Meeus/Jones/Butcher) ────────────────────────────────
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// ── Feriados Municipais do Rio de Janeiro ─────────────────────────────────────
function getRioMunicipalHolidayDates(year) {
  const easter = getEasterDate(year);
  const carnavalTerca   = new Date(easter); carnavalTerca.setDate(easter.getDate() - 47);
  const carnavalSegunda = new Date(easter); carnavalSegunda.setDate(easter.getDate() - 48);

  function toISO(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return [
    `${year}-01-20`,
    toISO(carnavalSegunda),
    toISO(carnavalTerca),
    `${year}-04-23`,
    `${year}-12-08`,
  ];
}

/**
 * Conta dias úteis em um mês, excluindo:
 *   - Sábados e Domingos
 *   - Feriados nacionais  (datas ISO passadas via nationalHolidayDates)
 *   - Feriados municipais do Rio de Janeiro (calculados internamente)
 *   - Pontos facultativos (datas ISO passadas via pontoFacDates)
 *
 * @param {number}   ano
 * @param {number}   mes                 1-based (1=Jan … 12=Dez)
 * @param {string[]} nationalHolidayDates  Ex.: ['2026-01-01', '2026-04-21', …]
 * @param {string[]} pontoFacDates         Ex.: ['2026-04-24', …]
 * @returns {number}
 */
export function calcDiasUteis(ano, mes, nationalHolidayDates = [], pontoFacDates = []) {
  const nationalSet  = new Set(nationalHolidayDates);
  const municipalSet = new Set(getRioMunicipalHolidayDates(ano));
  const pontoFacSet  = new Set(pontoFacDates);

  const daysInMonth = new Date(ano, mes, 0).getDate(); // mes 1-based → new Date(ano, mes, 0) dá último dia
  let count = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(ano, mes - 1, d).getDay(); // 0=Dom, 6=Sáb
    if (dow === 0 || dow === 6) continue;

    const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (nationalSet.has(iso))  continue;
    if (municipalSet.has(iso)) continue;
    if (pontoFacSet.has(iso))  continue;

    count++;
  }

  return count;
}

/**
 * Conta dias úteis do dia 1 até `diaLimite` (inclusive) no mês/ano dados.
 * Dias não úteis em `diaLimite` simplesmente não são contados (mantém o valor do último dia útil anterior).
 *
 * @param {number}   ano
 * @param {number}   mes                 1-based
 * @param {number}   diaLimite           dia do mês até onde contar (1-based)
 * @param {string[]} nationalHolidayDates
 * @param {string[]} pontoFacDates
 * @returns {number}
 */
export function calcDiasUteisAteData(ano, mes, diaLimite, nationalHolidayDates = [], pontoFacDates = []) {
  const nationalSet  = new Set(nationalHolidayDates);
  const municipalSet = new Set(getRioMunicipalHolidayDates(ano));
  const pontoFacSet  = new Set(pontoFacDates);
  let count = 0;

  for (let d = 1; d <= diaLimite; d++) {
    const dow = new Date(ano, mes - 1, d).getDay();
    if (dow === 0 || dow === 6) continue;

    const iso = `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (nationalSet.has(iso) || municipalSet.has(iso) || pontoFacSet.has(iso)) continue;

    count++;
  }

  return count;
}

/**
 * Conta dias úteis de um intervalo [dataInicio, dataFim] que caem dentro do mês/ano dado.
 * Opcionalmente limita a contagem até o dia `diaLimite` do mês (para cálculos "até hoje").
 *
 * @param {string}      dataInicio            ISO date YYYY-MM-DD
 * @param {string}      dataFim               ISO date YYYY-MM-DD
 * @param {number}      ano
 * @param {number}      mes                   1-based
 * @param {string[]}    nationalHolidayDates
 * @param {string[]}    pontoFacDates
 * @param {number|null} diaLimite             dia do mês até onde contar (null = fim do mês)
 * @returns {number}
 */
export function calcDiasUteisNoIntervalo(
  dataInicio, dataFim, ano, mes,
  nationalHolidayDates = [], pontoFacDates = [],
  diaLimite = null,
) {
  const nationalSet  = new Set(nationalHolidayDates);
  const municipalSet = new Set(getRioMunicipalHolidayDates(ano));
  const pontoFacSet  = new Set(pontoFacDates);

  const d1 = new Date(`${dataInicio}T00:00:00`);
  const d2 = new Date(`${dataFim}T00:00:00`);

  // Limites do mês, opcionalmente cortados em diaLimite
  const mesStart = new Date(ano, mes - 1, 1);
  const lastDay  = diaLimite !== null
    ? Math.min(diaLimite, new Date(ano, mes, 0).getDate())
    : new Date(ano, mes, 0).getDate();
  const mesEnd = new Date(ano, mes - 1, lastDay);

  const start = d1 < mesStart ? mesStart : d1;
  const end   = d2 > mesEnd   ? mesEnd   : d2;

  if (start > end) return 0;

  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      if (!nationalSet.has(iso) && !municipalSet.has(iso) && !pontoFacSet.has(iso)) {
        count++;
      }
    }
    cur.setDate(cur.getDate() + 1);
  }

  return count;
}
