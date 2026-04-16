import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X, Search, Settings2 } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import './FilterBar.css';

// ── Filtro dependente: exclui a chave atual para calcular as opções ─────────
function filterExcluding(data, filters, excludeKey, search) {
  return data.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (excludeKey !== 'anos'       && filters.anos.length > 0        && !filters.anos.includes(item.ano))              return false;
    if (excludeKey !== 'meses'      && filters.meses.length > 0       && !filters.meses.includes(item.mes))             return false;
    if (excludeKey !== 'statuses'   && filters.statuses.length > 0    && !filters.statuses.includes(item.status))       return false;
    if (excludeKey !== 'focusSquads'&& filters.focusSquads.length > 0 && !filters.focusSquads.includes(item.focusSquad)) return false;
    if (excludeKey !== 'produtos'   && filters.produtos.length > 0    && !filters.produtos.includes(item.produto))      return false;
    if (excludeKey !== 'focal'      && filters.focal.length > 0) {
      const vals = [item.focalDesign, item.focalRequisito].filter(Boolean);
      if (!vals.length || !filters.focal.some(f => vals.includes(f))) return false;
    }
    if (excludeKey !== 'apoio'      && filters.apoio.length > 0) {
      const vals = [item.pdApoio1, item.pdApoio2, item.reqApoio1].filter(Boolean);
      if (!vals.length || !filters.apoio.some(a => vals.includes(a))) return false;
    }
    return true;
  });
}

// ── Dropdown reutilizável ────────────────────────────────────────────────────
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

// ── EsteiraEDFilterBar ───────────────────────────────────────────────────────
export default function EsteiraEDFilterBar({ data, filters, toggleFilter, clearFilters, isActive, search, onSearchChange, onOpenCustomize }) {
  const options = useMemo(() => {
    const produtos    = [...new Set(filterExcluding(data, filters, 'produtos',    search).map(d => d.produto).filter(Boolean))].sort();
    const statuses    = [...new Set(filterExcluding(data, filters, 'statuses',    search).map(d => d.status).filter(Boolean))].sort();
    const focusSquads = [...new Set(filterExcluding(data, filters, 'focusSquads', search).map(d => d.focusSquad).filter(Boolean))].sort();
    const focal       = [...new Set(filterExcluding(data, filters, 'focal',       search).flatMap(d => [d.focalDesign, d.focalRequisito].filter(Boolean)))].sort();
    const apoio       = [...new Set(filterExcluding(data, filters, 'apoio',       search).flatMap(d => [d.pdApoio1, d.pdApoio2, d.reqApoio1].filter(Boolean)))].sort();
    const meses       = [...new Set(filterExcluding(data, filters, 'meses',       search).map(d => d.mes).filter(Boolean))].sort();
    const anos        = [...new Set(filterExcluding(data, filters, 'anos',        search).map(d => d.ano).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    return { produtos, statuses, focusSquads, focal, apoio, meses, anos };
  }, [data, filters, search]);

  const hasAnyFilter = isActive || !!search.trim();

  return (
    <div className="filter-bar">
      <div className="filter-bar-body">
        {/* Busca por título */}
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
          options={options.statuses}
          selected={filters.statuses}
          onToggle={(v) => toggleFilter('statuses', v)}
        />
        <FilterDropdown
          label="Squad"
          options={options.focusSquads}
          selected={filters.focusSquads}
          onToggle={(v) => toggleFilter('focusSquads', v)}
        />
        <FilterDropdown
          label="Focal"
          options={options.focal}
          selected={filters.focal}
          onToggle={(v) => toggleFilter('focal', v)}
          formatLabel={aliasName}
        />
        <FilterDropdown
          label="Apoio"
          options={options.apoio}
          selected={filters.apoio}
          onToggle={(v) => toggleFilter('apoio', v)}
          formatLabel={aliasName}
        />
        <FilterDropdown
          label="Mês"
          options={options.meses}
          selected={filters.meses}
          onToggle={(v) => toggleFilter('meses', v)}
        />
        <FilterDropdown
          label="Ano"
          options={options.anos}
          selected={filters.anos}
          onToggle={(v) => toggleFilter('anos', v)}
        />

        <button
          className="filter-customize-btn"
          onClick={onOpenCustomize}
          title="Personalizar cards exibidos"
        >
          <Settings2 size={13} />
          Personalizar Exibição
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
