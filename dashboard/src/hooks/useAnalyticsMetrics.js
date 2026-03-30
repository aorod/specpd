import { useMemo } from 'react';
import { classifyFluxo, FLUXO_NORMAL } from '../utils/classifyFluxo.js';

export function useAnalyticsMetrics(data) {
  return useMemo(() => {
    const totalUCs = data.length;
    let fluxoNormal = 0;
    let fluxoER = 0;
    let comRequisito = 0;
    let semRequisito = 0;

    const porResponsavelMap = new Map();    // assignedTo → {total, fluxoNormal, fluxoER}
    const porDesignerFluxoMap = new Map();  // designer → {total, fluxoNormal, fluxoER}
    const porEstadoMap = new Map();         // state → {total}
    const porRequisitoFluxoMap = new Map(); // requisito → {total, fluxoNormal, fluxoER}
    const porProdutoMap = new Map();        // produto → {total, fluxoNormal, fluxoER}
    const porMesMap = new Map();            // YYYY-MM → {total, fluxoNormal, fluxoER}

    for (const item of data) {
      const fluxo = classifyFluxo(item);
      const isNormal = fluxo === FLUXO_NORMAL;
      const hasReq = !!(item.requisito && item.requisito.trim());

      if (isNormal) fluxoNormal++; else fluxoER++;
      if (hasReq) comRequisito++; else semRequisito++;

      // por responsável (dono do work item)
      const owner = item.assignedTo || 'Sem Responsável';
      if (!porResponsavelMap.has(owner)) porResponsavelMap.set(owner, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      const r = porResponsavelMap.get(owner);
      r.total++;
      if (isNormal) r.fluxoNormal++; else r.fluxoER++;

      // por designer
      const designer = item.designer || 'Sem Designer';
      if (!porDesignerFluxoMap.has(designer)) porDesignerFluxoMap.set(designer, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      const df = porDesignerFluxoMap.get(designer);
      df.total++;
      if (isNormal) df.fluxoNormal++; else df.fluxoER++;

      // por estado
      const state = item.state || 'Sem Status';
      if (!porEstadoMap.has(state)) porEstadoMap.set(state, { total: 0 });
      porEstadoMap.get(state).total++;

      // por requisito
      const reqKey = item.requisito && item.requisito.trim() ? item.requisito : 'Sem Requisito';
      if (!porRequisitoFluxoMap.has(reqKey)) porRequisitoFluxoMap.set(reqKey, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      const rq = porRequisitoFluxoMap.get(reqKey);
      rq.total++;
      if (isNormal) rq.fluxoNormal++; else rq.fluxoER++;

      // por produto
      const produto = item.produto || 'Sem Produto';
      if (!porProdutoMap.has(produto)) porProdutoMap.set(produto, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      const p = porProdutoMap.get(produto);
      p.total++;
      if (isNormal) p.fluxoNormal++; else p.fluxoER++;

      // por mês
      const mesKey = item.ano && item.mes ? `${item.ano}-${item.mes}` : (item.mes || '');
      if (mesKey) {
        if (!porMesMap.has(mesKey)) porMesMap.set(mesKey, { total: 0, fluxoNormal: 0, fluxoER: 0 });
        const m = porMesMap.get(mesKey);
        m.total++;
        if (isNormal) m.fluxoNormal++; else m.fluxoER++;
      }
    }

    const pctNormal = totalUCs > 0 ? parseFloat(((fluxoNormal / totalUCs) * 100).toFixed(1)) : 0;
    const pctER = totalUCs > 0 ? parseFloat(((fluxoER / totalUCs) * 100).toFixed(1)) : 0;

    const porMes = new Map([...porMesMap.entries()].sort(([a], [b]) => a.localeCompare(b)));

    return {
      totalUCs, fluxoNormal, fluxoER, pctNormal, pctER,
      comRequisito, semRequisito,
      porResponsavel: porResponsavelMap,
      porDesignerFluxo: porDesignerFluxoMap,
      porEstado: porEstadoMap,
      porRequisitoFluxo: porRequisitoFluxoMap,
      porProduto: porProdutoMap,
      porMes,
    };
  }, [data]);
}
