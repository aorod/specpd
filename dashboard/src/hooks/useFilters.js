import { useMemo, useState } from 'react';
import { classifyFluxo } from '../utils/classifyFluxo.js';

export const INITIAL_FILTERS = {
  meses: [],
  designers: [],
  produtos: [],
  states: [],
  fluxos: [],
};

/**
 * Gerencia os filtros e retorna o array filtrado.
 * @param {Array} data - array completo de UCs (não filtrado)
 */
export function useFilters(data) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.meses.length > 0 && !filters.meses.includes(item.mes)) return false;
      if (filters.designers.length > 0 && !filters.designers.includes(item.designer)) return false;
      if (filters.produtos.length > 0 && !filters.produtos.includes(item.produto)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.fluxos.length > 0 && !filters.fluxos.includes(classifyFluxo(item))) return false;
      return true;
    });
  }, [data, filters]);

  const toggleFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }));
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const isActive =
    filters.meses.length > 0 ||
    filters.designers.length > 0 ||
    filters.produtos.length > 0 ||
    filters.states.length > 0 ||
    filters.fluxos.length > 0;

  return { filters, filteredData, toggleFilter, clearFilters, isActive };
}
