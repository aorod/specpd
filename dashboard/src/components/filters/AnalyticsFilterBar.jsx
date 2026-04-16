import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import { formatMesLabel } from '../../utils/formatters.js';
import './FilterBar.css';

// ── Filtro dependente: exclui a chave atual para calcular as opções ──────────
function filterExcluding(data, filters, excludeKey, search) {
  return data.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.id?.toLowerCase().includes(q)) return false;
    }
    if (excludeKey !== 'produtos'     && filters.produtos.length > 0     && !filters.produtos.includes(item.produto))       return false;
    if (excludeKey !== 'estados'      && filters.estados.length > 0      && !filters.estados.includes(item.state))          return false;
    if (excludeKey !== 'responsaveis' && filters.responsaveis.length > 0 && !filters.responsaveis.includes(item.assignedTo)) return false;
    if (excludeKey !== 'meses'        && filters.meses.length > 0        && !filters.meses.includes(item.mes))              return false;
    if (excludeKey !== 'anos'         && filters.anos.length > 0         && !filters.anos.includes(item.ano))               return false;
    return true;
  });
}

// ── Dropdown reutilizável ─────────────────────────────────────────────────────
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

// ── AnalyticsFilterBar ────────────────────────────────────────────────────────
export default function AnalyticsFilterBar({ data, filters, toggleFilter, clearFilters, isActive, search, onSearchChange }) {
  const options = useMemo(() => {
    const produtos     = [...new Set(filterExcluding(data, filters, 'produtos',     search).map(d => d.produto).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const estados      = [...new Set(filterExcluding(data, filters, 'estados',      search).map(d => d.state).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const responsaveis = [...new Set(filterExcluding(data, filters, 'responsaveis', search).map(d => d.assignedTo).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const meses        = [...new Set(filterExcluding(data, filters, 'meses',        search).map(d => d.mes).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const anos         = [...new Set(filterExcluding(data, filters, 'anos',         search).map(d => d.ano).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return { produtos, estados, responsaveis, meses, anos };
  }, [data, filters, search]);

  const hasAnyFilter = isActive || !!search.trim();

  return (
    <div className="filter-bar">
      <div className="filter-bar-body">
        <div className="filter-search">
          <Search size={13} className="filter-search-icon" />
          <input
            type="text"
            className="filter-search-input"
            placeholder="Buscar por título ou ID..."
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
          label="Estado"
          options={options.estados}
          selected={filters.estados}
          onToggle={(v) => toggleFilter('estados', v)}
        />
        <FilterDropdown
          label="Responsável"
          options={options.responsaveis}
          selected={filters.responsaveis}
          onToggle={(v) => toggleFilter('responsaveis', v)}
          formatLabel={aliasName}
        />
        <FilterDropdown
          label="Mês"
          options={options.meses}
          selected={filters.meses}
          onToggle={(v) => toggleFilter('meses', v)}
          formatLabel={formatMesLabel}
        />
        <FilterDropdown
          label="Ano"
          options={options.anos}
          selected={filters.anos}
          onToggle={(v) => toggleFilter('anos', v)}
        />

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
