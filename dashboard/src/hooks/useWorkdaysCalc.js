import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/localClient.js';
import { calcDiasUteis, calcDiasUteisAteData } from '../utils/calcDiasUteis.js';

/**
 * Calcula dias úteis e total de horas/mês para os filtros de ano/mês selecionados.
 *
 * Fontes usadas para excluir dias:
 *   1. Feriados nacionais  → brasilapi.com.br
 *   2. Feriados municipais do Rio → calculados em calcDiasUteis
 *   3. Pontos facultativos → /api/calendar/events (DB local)
 *
 * @param {{ anos: string[], meses: string[] }} filters
 */
export function useWorkdaysCalc(filters) {
  const horasPorDia = parseFloat(localStorage.getItem('config_horas_por_dia') ?? '8') || 8;

  // ── Determina anos/meses efetivos (fallback ao mês/ano atual) ───────────────
  const now = new Date();
  const anosEfetivos = filters.anos.length > 0
    ? filters.anos
    : [String(now.getFullYear())];
  const mesesEfetivos = filters.meses.length > 0
    ? filters.meses
    : [String(now.getMonth() + 1).padStart(2, '0')];

  // ── Estado: feriados nacionais por ano { '2026': ['2026-01-01', …] } ────────
  const [nationalByAno, setNationalByAno] = useState({});

  // ── Estado: datas de ponto_facultativo do DB ─────────────────────────────────
  const [pontoFacDates, setPontoFacDates] = useState([]);

  const anosKey = anosEfetivos.join(',');

  // Busca feriados nacionais para os anos selecionados
  useEffect(() => {
    anosEfetivos.forEach((ano) => {
      if (nationalByAno[ano] !== undefined) return; // já carregado
      fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((holidays) => {
          setNationalByAno((prev) => ({
            ...prev,
            [ano]: holidays.map((h) => h.date),
          }));
        })
        .catch(() => {
          setNationalByAno((prev) => ({ ...prev, [ano]: [] }));
        });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosKey]);

  // Busca pontos facultativos do DB para os anos selecionados
  useEffect(() => {
    Promise.all(anosEfetivos.map((ano) => api.get(`/calendar/events?ano=${ano}`)))
      .then((results) => {
        const datas = results
          .flat()
          .filter((e) => e.tipo === 'ponto_facultativo')
          .map((e) => e.data);
        setPontoFacDates(datas);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anosKey]);

  // ── Cálculo principal ────────────────────────────────────────────────────────
  const { diasUteis, totalHorasMes, diasUteisAteHoje } = useMemo(() => {
    const hoje = new Date();
    const currentYear  = hoje.getFullYear();
    const currentMonth = hoje.getMonth() + 1;
    const currentDay   = hoje.getDate();

    let totalDias = 0;
    let totalDiasAteHoje = 0;

    for (const ano of anosEfetivos) {
      const anoNum        = parseInt(ano, 10);
      const nationalDates = nationalByAno[ano] ?? [];

      for (const mes of mesesEfetivos) {
        const mesNum  = parseInt(mes, 10);
        const diasMes = calcDiasUteis(anoNum, mesNum, nationalDates, pontoFacDates);
        totalDias += diasMes;

        if (anoNum < currentYear || (anoNum === currentYear && mesNum < currentMonth)) {
          // Mês passado: conta todos os dias úteis
          totalDiasAteHoje += diasMes;
        } else if (anoNum === currentYear && mesNum === currentMonth) {
          // Mês atual: conta do dia 1 até hoje
          totalDiasAteHoje += calcDiasUteisAteData(anoNum, mesNum, currentDay, nationalDates, pontoFacDates);
        }
        // Mês futuro: não conta
      }
    }

    return {
      diasUteis:        totalDias,
      totalHorasMes:    parseFloat((totalDias * horasPorDia).toFixed(1)),
      diasUteisAteHoje: totalDiasAteHoje,
    };
  }, [anosEfetivos, mesesEfetivos, nationalByAno, pontoFacDates, horasPorDia]);

  return { horasPorDia, diasUteis, totalHorasMes, diasUteisAteHoje };
}
