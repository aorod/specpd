import { useMemo } from 'react';
import { X } from 'lucide-react';
import { FLUXO_NORMAL, FLUXO_ER } from '../../utils/classifyFluxo.js';
import { formatMes } from '../../utils/formatters.js';
import './FilterBar.css';

const FLUXO_OPTIONS = [FLUXO_NORMAL, FLUXO_ER];

function Chip({ label, active, onClick }) {
  return (
    <button
      className={`filter-chip${active ? ' filter-chip--active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={`Filtrar por ${label}`}
    >
      {label}
    </button>
  );
}

export default function FilterBar({ data, filters, toggleFilter, clearFilters, isActive }) {
  const options = useMemo(() => {
    const meses = [...new Set(data.map((d) => d.mes))].sort();
    const designers = [...new Set(data.map((d) => d.designer))].sort();
    const produtos = [...new Set(data.map((d) => d.produto))].sort();
    const states = [...new Set(data.map((d) => d.state))].sort();
    return { meses, designers, produtos, states };
  }, [data]);

  return (
    <div className="filter-bar">
      <div className="filter-section">
        <span className="filter-label">Mês</span>
        <div className="filter-chips">
          {options.meses.map((m) => (
            <Chip
              key={m}
              label={formatMes(m)}
              active={filters.meses.includes(m)}
              onClick={() => toggleFilter('meses', m)}
            />
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">State</span>
        <div className="filter-chips">
          {options.states.map((s) => (
            <Chip
              key={s}
              label={s}
              active={filters.states.includes(s)}
              onClick={() => toggleFilter('states', s)}
            />
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Designer</span>
        <div className="filter-chips">
          {options.designers.map((d) => (
            <Chip
              key={d}
              label={d}
              active={filters.designers.includes(d)}
              onClick={() => toggleFilter('designers', d)}
            />
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Produto</span>
        <div className="filter-chips">
          {options.produtos.map((p) => (
            <Chip
              key={p}
              label={p}
              active={filters.produtos.includes(p)}
              onClick={() => toggleFilter('produtos', p)}
            />
          ))}
        </div>
      </div>

      <div className="filter-section">
        <span className="filter-label">Fluxo</span>
        <div className="filter-chips">
          {FLUXO_OPTIONS.map((f) => (
            <Chip
              key={f}
              label={f}
              active={filters.fluxos.includes(f)}
              onClick={() => toggleFilter('fluxos', f)}
            />
          ))}
        </div>
      </div>

      {isActive && (
        <button
          className="filter-clear"
          onClick={clearFilters}
          aria-label="Limpar todos os filtros"
        >
          <X size={14} />
          Limpar
        </button>
      )}
    </div>
  );
}
