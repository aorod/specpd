import { useMemo, useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { FLUXO_NORMAL, FLUXO_ER } from '../../utils/classifyFluxo.js';
import { formatMesLabel } from '../../utils/formatters.js';
import { aliasName } from '../../utils/nameAliases.js';
import './FilterBar.css';

const FLUXO_OPTIONS = [FLUXO_NORMAL, FLUXO_ER];

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

export default function FilterBar({ data, filters, toggleFilter, clearFilters, isActive, open, onClose }) {
  const options = useMemo(() => {
    const anos     = [...new Set(data.map((d) => d.ano).filter(Boolean))].sort((a, b) => b.localeCompare(a));
    const meses    = [...new Set(data.map((d) => d.mes).filter(Boolean))].sort();
    const states   = [...new Set(data.map((d) => d.state).filter(Boolean))].sort();
    const produtos = [...new Set(data.map((d) => d.produto).filter(Boolean))].sort();
    const designers = [...new Set(data.map((d) => d.designer || 'Sem Designer'))].sort();
    const requisitos = [...new Set(data.map((d) => {
      if (!d.requisito) return 'Sem Requisito';
      if (d.requisito === 'linked') return 'Com Requisito';
      return d.requisito;
    }))].sort();
    return { anos, meses, states, produtos, designers, requisitos };
  }, [data]);

  if (!open) return null;

  return (
    <aside className="filter-sidebar">
      <div className="filter-sidebar-header">
        <span className="filter-sidebar-title">Filtros</span>
        <div className="filter-sidebar-actions">
          {isActive && (
            <button className="filter-clear-btn" onClick={clearFilters}>
              <X size={11} /> Limpar
            </button>
          )}
          <button className="filter-close-btn" onClick={onClose} aria-label="Fechar filtros">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="filter-sidebar-body">
        <FilterDropdown
          label="Ano"
          options={options.anos}
          selected={filters.anos}
          onToggle={(v) => toggleFilter('anos', v)}
        />
        <FilterDropdown
          label="Mês"
          options={options.meses}
          selected={filters.meses}
          onToggle={(v) => toggleFilter('meses', v)}
          formatLabel={formatMesLabel}
        />
        <FilterDropdown
          label="State"
          options={options.states}
          selected={filters.states}
          onToggle={(v) => toggleFilter('states', v)}
        />
        <FilterDropdown
          label="Produto"
          options={options.produtos}
          selected={filters.produtos}
          onToggle={(v) => toggleFilter('produtos', v)}
        />
        <FilterDropdown
          label="Requisito"
          options={options.requisitos}
          selected={filters.requisitos}
          onToggle={(v) => toggleFilter('requisitos', v)}
          formatLabel={aliasName}
        />
        <FilterDropdown
          label="Designer"
          options={options.designers}
          selected={filters.designers}
          onToggle={(v) => toggleFilter('designers', v)}
          formatLabel={aliasName}
        />
        <FilterDropdown
          label="Fluxo"
          options={FLUXO_OPTIONS}
          selected={filters.fluxos}
          onToggle={(v) => toggleFilter('fluxos', v)}
        />
      </div>
    </aside>
  );
}
