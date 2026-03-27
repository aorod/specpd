import { useMemo, useState } from 'react';
import { classifyFluxo } from '../utils/classifyFluxo.js';

/**
 * Gerencia a ordenação de um array de UCs.
 * @param {Array} data
 */
export function useSort(data) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    const getValue = (item) => {
      if (sortConfig.key === 'classificacao') return classifyFluxo(item);
      return item[sortConfig.key] ?? '';
    };

    return [...data].sort((a, b) => {
      const cmp = getValue(a).localeCompare(getValue(b), 'pt-BR');
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
  }, [data, sortConfig]);

  const requestSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return { sortedData, sortConfig, requestSort };
}
