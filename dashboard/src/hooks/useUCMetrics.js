import { useMemo } from 'react';
import { classifyFluxo, FLUXO_ER, FLUXO_NORMAL } from '../utils/classifyFluxo.js';

/**
 * Calcula todas as métricas derivadas do array filtrado de UCs.
 * @param {Array} filteredData
 */
export function useUCMetrics(filteredData) {
  return useMemo(() => {
    const totalUCs = filteredData.length;
    let fluxoER = 0;
    let fluxoNormal = 0;
    let comRequisito = 0;
    let semRequisito = 0;
    const porDesignerMap = new Map();
    const porProdutoMap = new Map();
    const porMesMap = new Map();
    const porRequisitoMap = new Map();

    for (const item of filteredData) {
      const fluxo = classifyFluxo(item);
      const hasReq = !!(item.requisito && item.requisito.trim());

      if (fluxo === FLUXO_ER) fluxoER++;
      else fluxoNormal++;

      if (hasReq) comRequisito++;
      else semRequisito++;

      // porDesigner
      if (!porDesignerMap.has(item.designer)) {
        porDesignerMap.set(item.designer, { total: 0, comRequisito: 0, semRequisito: 0 });
      }
      const d = porDesignerMap.get(item.designer);
      d.total++;
      if (hasReq) d.comRequisito++;
      else d.semRequisito++;

      // porProduto
      if (!porProdutoMap.has(item.produto)) {
        porProdutoMap.set(item.produto, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      }
      const p = porProdutoMap.get(item.produto);
      p.total++;
      if (fluxo === FLUXO_NORMAL) p.fluxoNormal++;
      else p.fluxoER++;

      // porRequisito — somente itens com requisito vinculado
      if (hasReq) {
        if (!porRequisitoMap.has(item.requisito)) {
          porRequisitoMap.set(item.requisito, { total: 0 });
        }
        porRequisitoMap.get(item.requisito).total++;
      }

      // porMes — chave "YYYY-MM" para ordenação cronológica correta
      const mesKey = item.ano && item.mes ? `${item.ano}-${item.mes}` : (item.mes || '');
      if (!porMesMap.has(mesKey)) {
        porMesMap.set(mesKey, { total: 0, fluxoNormal: 0, fluxoER: 0 });
      }
      const m = porMesMap.get(mesKey);
      m.total++;
      if (fluxo === FLUXO_NORMAL) m.fluxoNormal++;
      else m.fluxoER++;
    }

    // Ordena porMes cronologicamente
    const porMes = new Map(
      [...porMesMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    );

    const pctER = totalUCs > 0 ? parseFloat(((fluxoER / totalUCs) * 100).toFixed(1)) : 0;
    const pctNormal = totalUCs > 0 ? parseFloat(((fluxoNormal / totalUCs) * 100).toFixed(1)) : 0;

    return {
      totalUCs,
      fluxoER,
      fluxoNormal,
      pctER,
      pctNormal,
      comRequisito,
      semRequisito,
      porDesigner: porDesignerMap,
      porProduto: porProdutoMap,
      porRequisito: porRequisitoMap,
      porMes,
    };
  }, [filteredData]);
}
