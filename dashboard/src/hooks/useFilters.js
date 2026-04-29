import { useMemo, useState } from 'react';
import { classifyFluxo } from '../utils/classifyFluxo.js';

const DEFAULT_ANO = String(new Date().getFullYear());

export const INITIAL_FILTERS = {
  anos: [DEFAULT_ANO],
  meses: [],
  states: [],
  subStatuses: [],
  produtos: [],
  requisitos: [],
  designers: [],
  fluxos: [],
};

export function useFilters(data) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.anos.length > 0 && !filters.anos.includes(item.ano)) return false;
      if (filters.meses.length > 0 && !filters.meses.includes(item.mes)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.subStatuses.length > 0 && !filters.subStatuses.includes(item.subStatus)) return false;
      if (filters.produtos.length > 0) {
        const val = item.produto || 'Sem Produto';
        if (!filters.produtos.includes(val)) return false;
      }
      if (filters.requisitos.length > 0) {
        const val = !item.requisito ? 'Sem Requisito' : item.requisito === 'linked' ? 'Com Requisito' : item.requisito;
        if (!filters.requisitos.includes(val)) return false;
      }
      if (filters.designers.length > 0) {
        const val = item.designer || 'Sem Designer';
        if (!filters.designers.includes(val)) return false;
      }
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

  const setFilter = (key, values) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  };

  const isActive = Object.values(filters).some((arr) => arr.length > 0);
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return { filters, filteredData, toggleFilter, setFilter, clearFilters, isActive, activeCount };
}
