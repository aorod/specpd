import { useMemo } from 'react';

export function useEmbarcadorMetrics(filteredData) {
  return useMemo(() => {
    const totalUCs = filteredData.length;
    const embarcadorSet = new Set();
    let comEmbarcador = 0;
    let semEmbarcador = 0;
    const porEmbarcadorMap = new Map();
    const porProdutoMap = new Map();
    const porMesMap = new Map();
    const porAssignedToMap = new Map();

    for (const item of filteredData) {
      const emb = item.embarcador || '';
      const hasEmb = !!emb.trim();

      if (hasEmb) {
        comEmbarcador++;
        embarcadorSet.add(emb);
      } else {
        semEmbarcador++;
      }

      // porEmbarcador
      const embKey = emb || 'Sem Embarcador';
      if (!porEmbarcadorMap.has(embKey)) porEmbarcadorMap.set(embKey, { total: 0 });
      porEmbarcadorMap.get(embKey).total++;

      // porProduto
      const prodKey = item.produto || 'Sem Produto';
      if (!porProdutoMap.has(prodKey)) porProdutoMap.set(prodKey, { total: 0 });
      porProdutoMap.get(prodKey).total++;

      // porMes
      const mesKey = item.ano && item.mes ? `${item.ano}-${item.mes}` : (item.mes || '');
      if (mesKey) {
        if (!porMesMap.has(mesKey)) porMesMap.set(mesKey, { total: 0 });
        porMesMap.get(mesKey).total++;
      }

      // porAssignedTo
      const atKey = item.assignedTo || 'Não Atribuído';
      if (!porAssignedToMap.has(atKey)) porAssignedToMap.set(atKey, { total: 0 });
      porAssignedToMap.get(atKey).total++;
    }

    const porMes = new Map(
      [...porMesMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    );

    const totalEmbarcadores = embarcadorSet.size;
    const pctComEmb = totalUCs > 0 ? parseFloat(((comEmbarcador / totalUCs) * 100).toFixed(1)) : 0;

    return {
      totalUCs,
      totalEmbarcadores,
      comEmbarcador,
      semEmbarcador,
      pctComEmb,
      porEmbarcador: porEmbarcadorMap,
      porProduto: porProdutoMap,
      porMes,
      porAssignedTo: porAssignedToMap,
    };
  }, [filteredData]);
}
