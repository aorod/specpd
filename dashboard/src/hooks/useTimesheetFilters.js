import { useMemo, useState } from 'react';

const DEFAULT_ANO  = String(new Date().getFullYear());
const DEFAULT_MES  = String(new Date().getMonth() + 1).padStart(2, '0');

export const INITIAL_FILTERS_TS = {
  anos: [DEFAULT_ANO],
  meses: [DEFAULT_MES],
  states: [],
  produtos: [],
  equipes: [],
  atividades: [],
  responsaveis: [],
};

export function useTimesheetFilters(data) {
  const [filters, setFilters] = useState(INITIAL_FILTERS_TS);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.anos.length > 0        && !filters.anos.includes(item.ano))         return false;
      if (filters.meses.length > 0       && !filters.meses.includes(item.mes))        return false;
      if (filters.states.length > 0      && !filters.states.includes(item.state))     return false;
      if (filters.produtos.length > 0    && !filters.produtos.includes(item.produto)) return false;
      if (filters.equipes.length > 0) {
        const val = item.equipe || 'Sem Equipe';
        if (!filters.equipes.includes(val)) return false;
      }
      if (filters.atividades.length > 0) {
        const val = item.atividade || 'Sem Atividade';
        if (!filters.atividades.includes(val)) return false;
      }
      if (filters.responsaveis.length > 0) {
        const val = item.assignedTo || 'Sem Analista';
        if (!filters.responsaveis.includes(val)) return false;
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

  const clearFilters = () => setFilters(INITIAL_FILTERS_TS);

  const isActive = Object.values(filters).some((arr) => arr.length > 0);
  const activeCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount };
}
