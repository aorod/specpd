import { useMemo } from 'react';

/**
 * Calcula métricas derivadas do array filtrado de Timesheets.
 * @param {Array} filteredData
 */
export function useTimesheetMetrics(filteredData) {
  return useMemo(() => {
    const totalTimesheets = filteredData.length;
    let totalEffort = 0;
    let comAtividade = 0;
    let semAtividade = 0;

    const porProdutoMap     = new Map();
    const porAtividadeMap   = new Map();
    const porMesMap         = new Map();
    const porResponsavelMap = new Map();
    const porStatusMap      = new Map();

    for (const item of filteredData) {
      const effort = typeof item.effort === 'number' ? item.effort : 0;
      const hasAtividade = !!(item.atividade && item.atividade.trim());

      totalEffort += effort;
      if (hasAtividade) comAtividade++;
      else semAtividade++;

      // porStatus
      const statusKey = item.state || 'Sem Status';
      if (!porStatusMap.has(statusKey)) porStatusMap.set(statusKey, { total: 0 });
      porStatusMap.get(statusKey).total++;

      // porProduto — shape compatível com HorizontalBarChart
      if (!porProdutoMap.has(item.produto)) {
        porProdutoMap.set(item.produto, { total: 0, fluxoNormal: 0, fluxoER: 0, totalEffort: 0 });
      }
      const p = porProdutoMap.get(item.produto);
      p.total++;
      p.fluxoNormal++;
      p.totalEffort += effort;

      // porAtividade — total em horas (effort)
      const atividadeKey = item.atividade || 'Sem Atividade';
      if (!porAtividadeMap.has(atividadeKey)) {
        porAtividadeMap.set(atividadeKey, { total: 0, totalEffort: 0 });
      }
      const a = porAtividadeMap.get(atividadeKey);
      a.total++;
      a.totalEffort += effort;

      // porResponsavel — shape compatível com VerticalBarChart
      const responsavelKey = item.assignedTo || 'Sem Responsável';
      if (!porResponsavelMap.has(responsavelKey)) {
        porResponsavelMap.set(responsavelKey, { total: 0, totalEffort: 0 });
      }
      const r = porResponsavelMap.get(responsavelKey);
      r.total++;
      r.totalEffort += effort;

      // porMes — chave "YYYY-MM" para ordenação cronológica
      const mesKey = item.ano && item.mes ? `${item.ano}-${item.mes}` : (item.mes || '');
      if (!porMesMap.has(mesKey)) {
        porMesMap.set(mesKey, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      }
      const m = porMesMap.get(mesKey);
      m.total++;
      m.fluxoNormal++;
    }

    // Ordena porMes cronologicamente
    const porMes = new Map(
      [...porMesMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    );

    const pctComAtividade  = totalTimesheets > 0 ? parseFloat(((comAtividade  / totalTimesheets) * 100).toFixed(1)) : 0;
    const pctSemAtividade  = totalTimesheets > 0 ? parseFloat(((semAtividade  / totalTimesheets) * 100).toFixed(1)) : 0;

    return {
      totalTimesheets,
      totalEffort: parseFloat(totalEffort.toFixed(1)),
      comAtividade,
      semAtividade,
      pctComAtividade,
      pctSemAtividade,
      porProduto:    porProdutoMap,
      porAtividade:  porAtividadeMap,
      porStatus:     porStatusMap,
      porMes,
      porResponsavel: porResponsavelMap,
    };
  }, [filteredData]);
}
