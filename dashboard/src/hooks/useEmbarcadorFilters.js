import { useMemo, useState } from 'react';

const DEFAULT_ANO = String(new Date().getFullYear());

export const INITIAL_EMBARCADOR_FILTERS = {
  anos: [DEFAULT_ANO],
  meses: [],
  states: [],
  subStatuses: [],
  produtos: [],
  embarcadores: [],
};

export function useEmbarcadorFilters(data) {
  const [filters, setFilters] = useState(INITIAL_EMBARCADOR_FILTERS);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.anos.length > 0 && !filters.anos.includes(item.ano)) return false;
      if (filters.meses.length > 0 && !filters.meses.includes(item.mes)) return false;
      if (filters.states.length > 0 && !filters.states.includes(item.state)) return false;
      if (filters.subStatuses.length > 0 && !filters.subStatuses.includes(item.subStatus)) return false;
      if (filters.produtos.length > 0 && !filters.produtos.includes(item.produto)) return false;
      if (filters.embarcadores.length > 0) {
        const val = item.embarcador || 'Sem Embarcador';
        if (!filters.embarcadores.includes(val)) return false;
      }
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

  const clearFilters = () => setFilters(INITIAL_EMBARCADOR_FILTERS);

  const isActive = Object.values(filters).some((arr) => arr.length > 0);
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount };
}
