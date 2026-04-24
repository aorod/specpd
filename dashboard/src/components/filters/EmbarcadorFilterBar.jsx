import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Eye, EyeOff } from 'lucide-react';
import { formatMesLabel } from '../../utils/formatters.js';
import './FilterBar.css';

function filterExcluding(data, filters, excludeKey) {
  return data.filter((item) => {
    if (excludeKey !== 'anos'        && filters.anos.length > 0        && !filters.anos.includes(item.ano)) return false;
    if (excludeKey !== 'meses'       && filters.meses.length > 0       && !filters.meses.includes(item.mes)) return false;
    if (excludeKey !== 'states'      && filters.states.length > 0      && !filters.states.includes(item.state)) return false;
    if (excludeKey !== 'subStatuses' && filters.subStatuses.length > 0 && !filters.subStatuses.includes(item.subStatus)) return false;
    if (excludeKey !== 'produtos'    && filters.produtos.length > 0    && !filters.produtos.includes(item.produto)) return false;
    if (excludeKey !== 'embarcadores' && filters.embarcadores.length > 0) {
      const val = item.embarcador || 'Sem Embarcador';
      if (!filters.embarcadores.includes(val)) return false;
    }
    return true;
  });
}

function FilterDropdown({ label, options, selected, onToggle, formatLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`filter-dropdown-trigger${selected.length > 0 ? ' is-active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="filter-dropdown-label">{label}</span>
        {selected.length > 0 && (
          <span className="filter-dropdown-badge">{selected.length}</span>
        )}
        <ChevronDown size={13} className={`filter-dropdown-chevron${open ? ' is-open' : ''}`} />
      </button>

      {open && (
        <div className="filter-dropdown-panel">
          {options.length === 0 && (
            <span className="filter-dropdown-empty">Sem opções</span>
          )}
          {options.map((opt) => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                className={`filter-option${checked ? ' is-checked' : ''}`}
                onClick={() => onToggle(opt)}
                role="checkbox"
                aria-checked={checked}
              >
                <span className="filter-option-box">
                  {checked && <Check size={9} strokeWidth={3} />}
                </span>
                <span className="filter-option-label">
                  {formatLabel ? formatLabel(opt) : opt}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function EmbarcadorFilterBar({ data, filters, toggleFilter, clearFilters, isActive, search, onSearchChange, chartsCollapsed, onToggleCharts }) {
  const options = useMemo(() => {
    const anos = [...new Set(filterExcluding(data, filters, 'anos').map((d) => d.ano).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const meses = [...new Set(filterExcluding(data, filters, 'meses').map((d) => d.mes).filter(Boolean))].sort();
    const states = [...new Set(filterExcluding(data, filters, 'states').map((d) => d.state).filter(Boolean))].sort();
    const subStatuses = [...new Set(filterExcluding(data, filters, 'subStatuses').map((d) => d.subStatus).filter(Boolean))].sort();
    const produtos = [...new Set(filterExcluding(data, filters, 'produtos').map((d) => d.produto).filter(Boolean))].sort();
    const embarcadores = [...new Set(filterExcluding(data, filters, 'embarcadores').map((d) => d.embarcador || 'Sem Embarcador'))].sort();
    return { anos, meses, states, subStatuses, produtos, embarcadores };
  }, [data, filters]);

  const hasAnyFilter = isActive || !!search.trim();

  return (
    <div className="filter-bar">
      <div className="filter-bar-body">
        <div className="filter-search">
          <Search size={13} className="filter-search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {search && (
            <button
              className="filter-search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
            >
              <X size={11} />
            </button>
          )}
        </div>

        <FilterDropdown
          label="Produto"
          options={options.produtos}
          selected={filters.produtos}
          onToggle={(v) => toggleFilter('produtos', v)}
        />
        <FilterDropdown
          label="Status"
          options={options.states}
          selected={filters.states}
          onToggle={(v) => toggleFilter('states', v)}
        />
        <FilterDropdown
          label="Sub Status"
          options={options.subStatuses}
          selected={filters.subStatuses}
          onToggle={(v) => toggleFilter('subStatuses', v)}
        />
        <FilterDropdown
          label="Mês"
          options={options.meses}
          selected={filters.meses}
          onToggle={(v) => toggleFilter('meses', v)}
          formatLabel={formatMesLabel}
        />
        <FilterDropdown
          label="Embarcador"
          options={options.embarcadores}
          selected={filters.embarcadores}
          onToggle={(v) => toggleFilter('embarcadores', v)}
        />
        <FilterDropdown
          label="Ano"
          options={options.anos}
          selected={filters.anos}
          onToggle={(v) => toggleFilter('anos', v)}
        />

        <button className="filter-visibility-btn" onClick={onToggleCharts}>
          {chartsCollapsed ? <Eye size={12} /> : <EyeOff size={12} />}
          {chartsCollapsed ? 'Exibir Gráficos' : 'Ocultar Gráficos'}
        </button>

        {hasAnyFilter && (
          <button
            className="filter-clear-btn"
            onClick={() => { clearFilters(); onSearchChange(''); }}
          >
            <X size={11} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}
