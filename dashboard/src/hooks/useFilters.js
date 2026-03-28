import { useMemo, useState } from 'react';
import { classifyFluxo } from '../utils/classifyFluxo.js';

export const INITIAL_FILTERS = {
  meses: [],
  states: [],
  produtos: [],
  requisitos: [],
  designers: [],
  fluxos: [],
};

export function useFilters(data) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.meses.length > 0 && !filters.meses.includes(item.mes)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.produtos.length > 0 && !filters.produtos.includes(item.produto)) return false;
      if (filters.requisitos.length > 0) {
        const val = !item.requisito ? 'Sem Requisito' : item.requisito === 'linked' ? 'Com Requisito' : item.requisito;
        if (!filters.requisitos.includes(val)) return false;
      }
      if (filters.designers.length > 0 && !filters.designers.includes(item.designer)) return false;
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

  const isActive = Object.values(filters).some((arr) => arr.length > 0);
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount };
}
