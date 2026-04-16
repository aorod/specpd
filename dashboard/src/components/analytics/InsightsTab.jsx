import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Loader2, AlertTriangle, RefreshCw, TrendingUp, Users,
  Activity, BarChart3, AlertCircle, Clock, Target,
  Zap, CheckCircle, XCircle, Info, Timer, Milestone,
  ArrowRight, Flag, ChevronDown, Check, X, Tag, Search,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { useInsightsHistory }   from '../../hooks/useInsightsHistory.js';
import { aliasName }            from '../../utils/nameAliases.js';
import DatePicker               from '../datepicker/DatePicker.jsx';
import '../../components/filters/FilterBar.css';
import '../../components/table/UCTable.css';
import './InsightsTab.css';

// ── Paleta de cores de status ────────────────────────────────────────────────
const STATE_COLORS = {
  'Novo':               '#818cf8',
  'Active':             '#60a5fa',
  'Em Design':          '#f59e0b',
  'Em Desenvolvimento': '#3b82f6',
  'Em teste':           '#22c55e',
  'Aguardando Deploy':  '#a78bfa',
  'Concluído':          '#34d399',
  'Fechado':            '#6b7280',
};
const DEFAULT_STATE_COLOR = '#55556a';
// Sub status usa paleta fixa em degradê azul-violeta
const SUB_COLORS = ['#818cf8','#60a5fa','#a78bfa','#2dd4bf','#f59e0b','#fb923c','#f472b6','#34d399'];

// ── Helpers ──────────────────────────────────────────────────────────────────
function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function formatMonthLabel(key) {
  const [year, month] = key.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${months[parseInt(month, 10) - 1]} ${year.slice(2)}`;
}

function fmtDays(d) {
  if (d === null || d === undefined) return '—';
  if (d < 1) return `${Math.round(d * 24)}h`;
  if (d === 1) return '1 dia';
  return `${d} dias`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtShortDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDateRange(startDate, endDate) {
  const start = fmtShortDate(startDate);
  const end   = endDate ? fmtShortDate(endDate) : 'hoje';
  return `${start} → ${end}`;
}

// ── Mini-componentes reutilizáveis ───────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`insight-stat-card insight-stat-card--${accent || 'neutral'}`}>
      <div className="insight-stat-icon"><Icon size={16} /></div>
      <div className="insight-stat-body">
        <span className="insight-stat-value">{value}</span>
        <span className="insight-stat-label">{label}</span>
        {sub && <span className="insight-stat-sub">{sub}</span>}
      </div>
    </div>
  );
}

function AlertBadge({ level, children }) {
  const icons = { warning: AlertTriangle, error: XCircle, info: Info, success: CheckCircle };
  const Icon  = icons[level] || Info;
  return (
    <div className={`insight-alert insight-alert--${level}`}>
      <Icon size={13} />
      <span>{children}</span>
    </div>
  );
}


function SectionTitle({ icon: Icon, title, badge }) {
  return (
    <div className="insight-section-title">
      <Icon size={15} />
      <span>{title}</span>
      {badge !== undefined && <span className="insight-section-badge">{badge}</span>}
    </div>
  );
}

function InsightCard({ children, className }) {
  return <div className={`insight-card ${className || ''}`}>{children}</div>;
}

// ── Dropdown reutilizável (mesma estrutura do FilterBar) ─────────────────────
function FilterDropdown({ label, options, selected, onToggle, formatLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="filter-dropdown" ref={ref}>
      <button
        className={`filter-dropdown-trigger${selected.length > 0 ? ' is-active' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="filter-dropdown-label">{label}</span>
        {selected.length > 0 && <span className="filter-dropdown-badge">{selected.length}</span>}
        <ChevronDown size={13} className={`filter-dropdown-chevron${open ? ' is-open' : ''}`} />
      </button>
      {open && (
        <div className="filter-dropdown-panel">
          {options.length === 0 && <span className="filter-dropdown-empty">Sem opções</span>}
          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <button
                key={opt}
                className={`filter-option${checked ? ' is-checked' : ''}`}
                onClick={() => onToggle(opt)}
              >
                <span className="filter-option-box">
                  {checked && <Check size={9} strokeWidth={3} />}
                </span>
                <span className="filter-option-label">{formatLabel ? formatLabel(opt) : opt}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Barra de filtros da aba Insights ─────────────────────────────────────────
function InsightsFilterBar({ rawData, filters, onFilterChange, onClear }) {
  const { dateFrom, dateTo, produtos, estados, responsaveis } = filters;

  const opts = useMemo(() => ({
    produtos:     [...new Set(rawData.map(d => d.produto).filter(Boolean))].sort(),
    estados:      [...new Set(rawData.map(d => d.state).filter(Boolean))].sort(),
    responsaveis: [...new Set(rawData.map(d => d.assignedTo).filter(Boolean))].sort(),
  }), [rawData]);

  const hasFilter = dateFrom || dateTo || produtos.length || estados.length || responsaveis.length;

  return (
    <div className="insights-filter-bar filter-bar">
      <div className="filter-bar-body">

        {/* Data início → fim */}
        <div className="insights-date-group">
          <DatePicker
            value={dateFrom}
            onChange={v => onFilterChange('dateFrom', v)}
            placeholder=""
          />
          <span className="insights-date-sep">—</span>
          <DatePicker
            value={dateTo}
            onChange={v => onFilterChange('dateTo', v)}
            placeholder=""
            minDate={dateFrom || undefined}
          />
        </div>

        <div className="insights-filter-sep" />

        <FilterDropdown
          label="Produto"
          options={opts.produtos}
          selected={produtos}
          onToggle={v => onFilterChange('produtos', v)}
        />
        <FilterDropdown
          label="Estado"
          options={opts.estados}
          selected={estados}
          onToggle={v => onFilterChange('estados', v)}
        />
        <FilterDropdown
          label="Responsável"
          options={opts.responsaveis}
          selected={responsaveis}
          onToggle={v => onFilterChange('responsaveis', v)}
          formatLabel={aliasName}
        />

        {hasFilter && (
          <button className="filter-clear-btn" onClick={onClear}>
            <X size={11} /> Limpar
          </button>
        )}
      </div>
    </div>
  );
}


// ── Casos de Uso — Histórico de Nomes / Substatus ───────────────────────────
const TITLE_PAGE_SIZE = 10;

function SortBtn({ label, field, sortBy, sortDir, onToggle }) {
  const active = sortBy === field;
  const Icon   = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <button
      className={`th-sort-btn${active ? ' is-active' : ''}`}
      onClick={() => onToggle(field)}
      title={active ? (sortDir === 'desc' ? 'Decrescente — clique para inverter' : 'Crescente — clique para inverter') : `Ordenar por ${label}`}
    >
      <Icon size={11} />
      {label}
    </button>
  );
}

// Componente interno reutilizável (sem InsightCard)
function HistoryTableInner({ historyMap, colLabel, searchPlaceholder, titleLookup }) {
  const [expandedId, setExpandedId] = useState(null);
  const [page,       setPage]       = useState(1);
  const [search,     setSearch]     = useState('');
  const [sortBy,     setSortBy]     = useState(null);
  const [sortDir,    setSortDir]    = useState('desc');

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortDir(field === 'nome' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  const allEntries = useMemo(() => {
    if (!historyMap?.size) return [];
    return [...historyMap.entries()]
      .filter(([, h]) => h.length > 1)
      .sort((a, b) => b[1].length - a[1].length);
  }, [historyMap]);

  const entries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allEntries;
    return allEntries.filter(([id, h]) => {
      const current = h[h.length - 1]?.title || '';
      return id.toLowerCase().includes(q) || current.toLowerCase().includes(q);
    });
  }, [allEntries, search]);

  function sortAccordion(history) {
    if (!sortBy) return history;
    const sorted = [...history];
    if (sortBy === 'tempo') {
      sorted.sort((a, b) => sortDir === 'desc' ? b.days - a.days : a.days - b.days);
    } else {
      sorted.sort((a, b) => {
        const cmp = (a.title || '').localeCompare(b.title || '', 'pt-BR', { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return sorted;
  }

  const totalPages = Math.max(1, Math.ceil(entries.length / TITLE_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * TITLE_PAGE_SIZE;
  const paged      = entries.slice(start, start + TITLE_PAGE_SIZE);
  const from       = entries.length === 0 ? 0 : start + 1;
  const to         = Math.min(start + TITLE_PAGE_SIZE, entries.length);

  if (allEntries.length === 0) {
    return (
      <span className="insight-empty" style={{ padding: '12px 0', display: 'block' }}>
        Nenhum caso de uso com alteração de {colLabel.toLowerCase()} no período selecionado.
      </span>
    );
  }

  return (
    <>
      {/* ── Barra de filtros ── */}
      <div className="th-filter-bar">
        <div className="th-search-wrap">
          <Search size={13} className="th-search-icon" />
          <input
            className="th-search-input"
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button className="th-search-clear" onClick={() => { setSearch(''); setPage(1); }} aria-label="Limpar busca">
              <X size={11} />
            </button>
          )}
        </div>

        <div className="th-filter-sep" />

        <span className="th-sort-label">Ordenar nomes por:</span>
        <SortBtn label="Tempo" field="tempo" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
        <SortBtn label="Nome"  field="nome"  sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort} />
        {sortBy && (
          <button className="th-sort-clear" onClick={() => { setSortBy(null); setPage(1); }}>
            <X size={10} /> Padrão
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <div className="uc-table-scroll">
        <table className="uc-table" role="table">
          <thead>
            <tr>
              <th scope="col" style={{ width: '80px' }}>ID</th>
              {titleLookup && <th scope="col">Título</th>}
              <th scope="col">{colLabel}</th>
              <th scope="col" style={{ width: '165px' }}>Range de Data</th>
              <th scope="col" style={{ width: '130px', textAlign: 'right' }}>Dias com {colLabel}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={titleLookup ? 5 : 4} className="uc-table-empty">Nenhum resultado para "{search}"</td></tr>
            ) : paged.map(([id, rawHistory], rowIdx) => {
              const currentEntry  = rawHistory[rawHistory.length - 1];
              const currentValue  = currentEntry?.title || id;
              const currentDays   = currentEntry?.days  ?? 0;
              const currentRange  = fmtDateRange(currentEntry?.startDate, currentEntry?.endDate);
              const ucTitle       = titleLookup?.get(id) || id;
              const isExpanded    = expandedId === id;
              const sortedHistory = sortAccordion(rawHistory);
              const colSpan       = titleLookup ? 5 : 4;

              return (
                <>
                  <tr
                    key={id}
                    className={`uc-table-row title-history-main-row${isExpanded ? ' is-expanded' : ''}`}
                    style={{ animationDelay: `${rowIdx * 12}ms` }}
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && setExpandedId(isExpanded ? null : id)}
                    aria-expanded={isExpanded}
                  >
                    <td className="cell-id"><span className="sdmodal-id">{id}</span></td>

                    {titleLookup && (
                      <td className="cell-title">
                        <span className="title-text" title={ucTitle}>{ucTitle}</span>
                      </td>
                    )}

                    <td className={titleLookup ? 'cell-value' : 'cell-title'}>
                      <div className="title-history-cell">
                        <ChevronDown size={12} className={`title-history-chevron${isExpanded ? ' is-open' : ''}`} />
                        <span className={titleLookup ? 'value-text' : 'title-text'} title={currentValue}>{currentValue}</span>
                      </div>
                    </td>

                    <td className="title-history-range-cell">{currentRange}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                      {fmtDays(currentDays)}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${id}-accordion`} className="title-history-accordion-row">
                      <td colSpan={colSpan} className="title-history-accordion-cell">

                        <div
                          className={`title-history-accordion-header${titleLookup ? ' has-title-col' : ''}`}
                        >
                          <span>#</span>
                          {titleLookup && <span>Título</span>}
                          <span>{colLabel}</span>
                          <span>Range de Data</span>
                          <span style={{ textAlign: 'right' }}>Dias</span>
                        </div>
                        <div className="title-history-accordion-body">
                          {sortedHistory.map((entry, i) => {
                            const isCurrent   = entry.endDate === null;
                            const entryTitle  = entry.titleAtTime ?? titleLookup?.get(id) ?? null;
                            return (
                              <div
                                key={i}
                                className={`title-history-entry${isCurrent ? ' is-current' : ''}${titleLookup ? ' has-title-col' : ''}`}
                              >
                                <span className="title-history-entry-num">
                                  {isCurrent ? <span className="th-current-dot" /> : i + 1}
                                </span>
                                {titleLookup && (
                                  <span className="title-history-entry-uc-title" title={entryTitle || ''}>
                                    {entryTitle || '—'}
                                  </span>
                                )}
                                <span className="title-history-entry-name" title={entry.title}>
                                  {entry.title || '—'}
                                </span>
                                <span className="title-history-entry-range">
                                  {fmtDateRange(entry.startDate, entry.endDate)}
                                </span>
                                <span className="title-history-entry-days">{fmtDays(entry.days)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Paginação ── */}
      {totalPages > 1 && (
        <div className="uc-pagination">
          <span className="pagination-info">
            {from}–{to} de {entries.length}{search.trim() ? ` (filtrado de ${allEntries.length})` : ''} itens
          </span>
          <div className="pagination-center">
            <button className="pagination-btn" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`pagination-btn pagination-page-btn${p === safePage ? ' pagination-page-btn--active' : ''}`}
                onClick={() => setPage(p)}
              >{p}</button>
            ))}
            <button className="pagination-btn" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
          </div>
          <div />
        </div>
      )}

      <p className="insight-footnote">
        Clique em um caso de uso para expandir o histórico completo.
        {sortBy && <span> · Ordenado por {sortBy === 'tempo' ? 'duração' : 'nome'} ({sortDir === 'desc' ? 'decrescente' : 'crescente'}).</span>}
      </p>
    </>
  );
}

// Card com abas: Histórico de Nomes | Histórico de Substatus
function HistoryNamesCard({ titleHistoryMap, subStatusHistoryMap, itemTitleMap }) {
  const [activeTab, setActiveTab] = useState('nomes');

  const titleCount    = useMemo(() =>
    [...(titleHistoryMap?.entries() || [])].filter(([, h]) => h.length > 1).length,
  [titleHistoryMap]);

  const subStatusCount = useMemo(() =>
    [...(subStatusHistoryMap?.entries() || [])].filter(([, h]) => h.length > 1).length,
  [subStatusHistoryMap]);

  const badge = activeTab === 'nomes' ? titleCount : subStatusCount;

  return (
    <InsightCard>
      {/* ── Header com abas ── */}
      <div className="hn-header">
        <div className="hn-title-row">
          <SectionTitle
            icon={Tag}
            title={activeTab === 'nomes' ? 'Casos de Uso — Histórico de Nomes' : 'Casos de Uso — Histórico de Substatus'}
            badge={badge}
          />
        </div>
        <div className="hn-tabs">
          <button
            className={`hn-tab${activeTab === 'nomes' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('nomes')}
          >
            Nomes
            {titleCount > 0 && <span className="hn-tab-badge">{titleCount}</span>}
          </button>
          <button
            className={`hn-tab${activeTab === 'substatus' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('substatus')}
          >
            Substatus
            {subStatusCount > 0 && <span className="hn-tab-badge">{subStatusCount}</span>}
          </button>
        </div>
      </div>

      {/* ── Conteúdo da aba ── */}
      {activeTab === 'nomes' && (
        <HistoryTableInner
          historyMap={titleHistoryMap}
          colLabel="Título"
          searchPlaceholder="Buscar por título ou ID…"
        />
      )}
      {activeTab === 'substatus' && (
        <HistoryTableInner
          historyMap={subStatusHistoryMap}
          colLabel="Substatus"
          searchPlaceholder="Buscar por substatus ou ID…"
          titleLookup={itemTitleMap}
        />
      )}
    </InsightCard>
  );
}

// ── Modal: lista de UCs por estado/substatus ─────────────────────────────────
const MODAL_PAGE_SIZE = 5;

function StateItemsModal({ label, items, color, onClose }) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / MODAL_PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * MODAL_PAGE_SIZE;
  const paged      = items.slice(start, start + MODAL_PAGE_SIZE);
  const from       = items.length === 0 ? 0 : start + 1;
  const to         = Math.min(start + MODAL_PAGE_SIZE, items.length);

  // Fecha com Esc
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="sdmodal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sdmodal-dialog">

        {/* Header */}
        <div className="sdmodal-header">
          <span className="sdmodal-badge" style={{ background: color }}>{label}</span>
          <span className="sdmodal-title">Casos de Uso neste estado</span>
          <button className="sdmodal-close" onClick={onClose} aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        {/* Table */}
        <div className="sdmodal-body">
          {items.length === 0 ? (
            <p className="sdmodal-empty">Nenhum item encontrado.</p>
          ) : (
            <div className="uc-table-scroll">
              <table className="uc-table" role="table">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: '80px' }}>ID</th>
                    <th scope="col">Título</th>
                    <th scope="col" style={{ width: '100px', textAlign: 'right' }}>Máx. (dias)</th>
                    <th scope="col" style={{ width: '100px', textAlign: 'right' }}>Médio (dias)</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((item, idx) => (
                    <tr key={item.id} className="uc-table-row" style={{ animationDelay: `${idx * 12}ms` }}>
                      <td className="cell-id">
                        <span className="sdmodal-id">{item.id}</span>
                      </td>
                      <td className="cell-title">
                        <span className="title-text" title={item.title}>{item.title}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: item.max > 14 ? 'var(--color-er)' : item.max > 7 ? '#f59e0b' : 'var(--color-normal)' }}>
                        {fmtDays(item.max)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {fmtDays(item.avg)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="sdmodal-footer">
            <span className="sdmodal-count">{from}–{to} de {items.length} itens</span>
            <div className="sdmodal-pages">
              <button
                className="pagination-btn"
                disabled={safePage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >‹</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`pagination-btn pagination-page-btn${p === safePage ? ' pagination-page-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >{p}</button>
              ))}
              <button
                className="pagination-btn"
                disabled={safePage === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Análise Estratégica de Substatus ────────────────────────────────────────

const SUBSTATUS_CAT = {
  rework:  { label: 'Retrabalho', color: 'var(--color-er)',    bg: 'var(--color-er-bg)',         patterns: ['devolvido','retorno','reprovado','revisão','corrigir','rejected','recusado'] },
  waiting: { label: 'Espera',     color: '#f59e0b',            bg: 'rgba(245,158,11,0.1)',        patterns: ['backlog','fila','aguardando','queue','waiting','pendente','bloqueado'] },
  active:  { label: 'Ativo',      color: '#60a5fa',            bg: 'rgba(96,165,250,0.1)',        patterns: ['desenvolvendo','testando','em desenvolvimento','em teste','implementando','codificando'] },
  done:    { label: 'Finalizado', color: '#34d399',            bg: 'rgba(52,211,153,0.1)',        patterns: ['finalizado','entregue','concluído','done','completed','aprovado','publicado'] },
};

function classifySubStatus(s) {
  const lower = (s || '').toLowerCase();
  for (const [cat, def] of Object.entries(SUBSTATUS_CAT)) {
    if (def.patterns.some(p => lower.includes(p))) return cat;
  }
  return 'unknown';
}

function computeSubStatusAnalytics(subStatusHistoryMap, itemTitleMap) {
  if (!subStatusHistoryMap?.size) return null;

  const agg        = new Map(); // substatus → stats
  const reworkMap  = new Map(); // id → total rework days
  let totalTrans   = 0;
  let totalDays    = 0;
  let totalActDays = 0;

  for (const [id, history] of subStatusHistoryMap) {
    for (const entry of history) {
      const key = entry.title || '(sem substatus)';
      if (!agg.has(key)) {
        agg.set(key, { totalDays: 0, count: 0, ucSet: new Set(), maxDays: 0, allDays: [], category: classifySubStatus(key) });
      }
      const s = agg.get(key);
      s.totalDays += entry.days; s.count++; s.ucSet.add(id);
      if (entry.days > s.maxDays) s.maxDays = entry.days;
      s.allDays.push(entry.days);
      totalTrans++; totalDays += entry.days;
      if (s.category === 'active')  totalActDays += entry.days;
      if (s.category === 'rework')  reworkMap.set(id, (reworkMap.get(id) || 0) + entry.days);
    }
  }

  const substatusEntries = [...agg.entries()].map(([label, v]) => {
    const sorted = [...v.allDays].sort((a, b) => a - b);
    const mid    = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    return {
      label,
      avg:      Math.round(v.totalDays / v.count * 10) / 10,
      median:   Math.round(median * 10) / 10,
      max:      Math.round(v.maxDays * 10) / 10,
      count:    v.count,
      ucCount:  v.ucSet.size,
      category: v.category,
    };
  }).sort((a, b) => b.avg - a.avg);

  const flowEfficiency = totalDays > 0 ? Math.round((totalActDays / totalDays) * 100) : 0;
  const avgPerTrans    = totalTrans > 0 ? Math.round(totalDays / totalTrans * 10) / 10 : 0;
  const bottleneck     = substatusEntries[0];

  const reworkUCs = [...reworkMap.entries()]
    .map(([id, days]) => ({ id, days: Math.round(days * 10) / 10, title: itemTitleMap?.get(id) || id }))
    .sort((a, b) => b.days - a.days);
  const reworkRate = subStatusHistoryMap.size > 0
    ? Math.round(reworkMap.size / subStatusHistoryMap.size * 100) : 0;

  const criticalItems = [];
  for (const [id, history] of subStatusHistoryMap) {
    const last = history[history.length - 1];
    if (last?.endDate === null && last.days > 14) {
      criticalItems.push({ id, title: itemTitleMap?.get(id) || id, substatus: last.title || '—', days: last.days, category: classifySubStatus(last.title) });
    }
  }
  criticalItems.sort((a, b) => b.days - a.days);

  return { substatusEntries, reworkUCs, flowEfficiency, totalTrans, avgPerTrans, bottleneck, reworkRate, criticalItems };
}

function SubStatusAnalyticsPanel({ subStatusHistoryMap, itemTitleMap }) {
  const analytics = useMemo(
    () => computeSubStatusAnalytics(subStatusHistoryMap, itemTitleMap),
    [subStatusHistoryMap, itemTitleMap]
  );

  if (!analytics) return null;

  const { substatusEntries, reworkUCs, flowEfficiency, totalTrans, avgPerTrans, bottleneck, reworkRate, criticalItems } = analytics;

  const top10           = substatusEntries.slice(0, 10);
  const maxAvg          = top10[0]?.avg || 1;
  const effAccent       = flowEfficiency >= 60 ? 'success' : flowEfficiency >= 40 ? 'warning' : 'error';
  const reworkAccent    = reworkRate >= 30 ? 'error' : reworkRate >= 15 ? 'warning' : 'success';
  const criticalCount   = substatusEntries.filter(s => s.avg > 30).length;
  const alertCount      = substatusEntries.filter(s => s.avg > 14 && s.avg <= 30).length;

  // Alertas estratégicos baseados em boas práticas
  const alerts = [];
  if (criticalCount > 0)   alerts.push({ level: 'error',   text: `${criticalCount} substatus com média acima de 30 dias — custo acumulado por sprint e risco direto ao time-to-market. Avaliar decomposição da demanda ou escalação imediata.` });
  if (alertCount > 0)      alerts.push({ level: 'warning', text: `${alertCount} substatus entre 14–30 dias — ultrapassa o boundary de 1 sprint (Scrum Guide). Boa prática: cada fase deve ser concluída dentro de um sprint (≤ 14 dias).` });
  if (reworkRate >= 15)    alerts.push({ level: reworkRate >= 30 ? 'error' : 'warning', text: `Taxa de retrabalho de ${reworkRate}% — itens "Devolvidos" geram custo 3–10× maior que entregas de primeira (IEEE/NIST Software Quality). Investigar causa-raiz: requisitos incompletos, critérios de aceite vagos ou falta de refinamento.` });
  if (criticalItems.length > 0) alerts.push({ level: 'error', text: `${criticalItems.length} UC${criticalItems.length > 1 ? 's' : ''} parado${criticalItems.length > 1 ? 's' : ''} há mais de 14 dias no substatus atual — bloqueio ativo no pipeline. Aplicar técnica de expedite (Kanban) ou revisar dependências.` });
  if (flowEfficiency < 40) alerts.push({ level: 'warning', text: `Eficiência de fluxo em ${flowEfficiency}% — abaixo do benchmark Lean/Kanban (40–60%). A maior parte do tempo é de espera, não de geração de valor. Priorizar redução de handoffs e filas.` });
  if (alerts.filter(a => a.level !== 'success').length === 0) {
    alerts.push({ level: 'success', text: 'Fluxo de substatus dentro dos parâmetros recomendados para desenvolvimento ágil — continuar monitorando tendências.' });
  }

  return (
    <div className="substatus-analytics">

      {/* ── KPIs ── */}
      <div className="insight-kpi-row">
        <StatCard icon={Activity}      label="Total de Transições"   value={totalTrans}               accent="neutral" />
        <StatCard icon={Timer}         label="Tempo Médio por Fase"  value={fmtDays(avgPerTrans)}
          sub="por transição de substatus"  accent="neutral" />
        <StatCard icon={Zap}           label="Eficiência de Fluxo"   value={`${flowEfficiency}%`}
          sub="tempo ativo vs total"        accent={effAccent} />
        <StatCard icon={AlertTriangle} label="Taxa de Retrabalho"    value={`${reworkRate}%`}
          sub={`${reworkUCs.length} UCs com "devolvido"`} accent={reworkAccent} />
      </div>

      {/* ── Alertas ── */}
      <InsightCard>
        <SectionTitle icon={Zap} title="Alertas Estratégicos · Boas Práticas de Mercado" />
        <div className="insight-alerts-grid">
          {alerts.map((a, i) => <AlertBadge key={i} level={a.level}>{a.text}</AlertBadge>)}
        </div>
        <p className="insight-footnote">
          Referências: Scrum Guide (sprint boundary 14 dias) · Lean/Kanban (flow efficiency 40–60%) ·
          IEEE/NIST (custo de retrabalho 3–10×) · DORA Metrics (lead time for changes)
        </p>
      </InsightCard>

      {/* ── Ranking de Ofensores ── */}
      <InsightCard>
        <SectionTitle icon={BarChart3} title="Ranking de Ofensores · Tempo Médio por Substatus" badge={`Top ${top10.length}`} />
        <div className="sa-substatus-list">
          {top10.map(s => {
            const cat   = SUBSTATUS_CAT[s.category];
            const barW  = maxAvg > 0 ? (s.avg / maxAvg) * 100 : 0;
            const dayC  = s.avg > 30 ? 'var(--color-er)' : s.avg > 14 ? '#f59e0b' : 'var(--color-normal)';
            return (
              <div key={s.label} className="sa-substatus-row">
                <div className="sa-substatus-top">
                  <div className="sa-substatus-info">
                    {cat && <span className="sa-category-dot" style={{ background: cat.color }} title={cat.label} />}
                    <span className="sa-substatus-label" title={s.label}>{s.label}</span>
                    {cat
                      ? <span className="sa-category-badge" style={{ color: cat.color, background: cat.bg }}>{cat.label}</span>
                      : <span className="sa-category-badge" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>Outro</span>
                    }
                  </div>
                  <div className="sa-substatus-stats">
                    <span title="Mediana">{fmtDays(s.median)} mediana</span>
                    <span title="Máximo">{fmtDays(s.max)} máx</span>
                    <span>{s.ucCount} UCs · {s.count} transições</span>
                  </div>
                </div>
                <div className="sa-bar-row">
                  <div className="insight-hbar-track sa-bar-track">
                    <div className="insight-hbar-fill" style={{ width: `${barW}%`, background: dayC }} />
                  </div>
                  <span className="sa-avg-value" style={{ color: dayC }}>{fmtDays(s.avg)}</span>
                </div>
                {s.avg > 14 && (
                  <div className={`sa-benchmark-hint${s.avg > 30 ? ' is-critical' : ''}`}>
                    {s.avg > 30
                      ? `⚠ ${Math.round(s.avg / 14)}× acima do sprint boundary — avaliar decomposição ou escalação prioritária`
                      : '↑ Acima de 1 sprint — monitorar SLA desta fase e identificar bloqueios'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="sa-legend">
          {Object.values(SUBSTATUS_CAT).map(v => (
            <span key={v.label} className="sa-legend-item">
              <span className="sa-legend-dot" style={{ background: v.color }} />
              {v.label}
            </span>
          ))}
          <span className="sa-legend-sep">·</span>
          <span className="sa-legend-ref">14 dias = 1 sprint (Scrum Guide)</span>
        </div>
      </InsightCard>

      {/* ── Dois cards ── */}
      <div className="insight-two-col">

        <InsightCard>
          <SectionTitle icon={Users} title="Maior Impacto de Retrabalho"
            badge={reworkUCs.length > 0 ? `Top ${Math.min(5, reworkUCs.length)}` : undefined} />
          {reworkUCs.length === 0
            ? <AlertBadge level="success">Nenhum UC com retrabalho detectado — excelente indicador de qualidade</AlertBadge>
            : <>
                <div className="sa-item-list">
                  {reworkUCs.slice(0, 5).map((uc, i) => (
                    <div key={uc.id} className="sa-item-row">
                      <span className="sa-item-rank">{i + 1}</span>
                      <div className="sa-item-info">
                        <span className="sa-item-id">{uc.id}</span>
                        <span className="sa-item-title" title={uc.title}>{uc.title}</span>
                      </div>
                      <span className={`sa-item-days${uc.days > 30 ? ' is-critical' : uc.days > 14 ? ' is-warn' : ''}`}>
                        {fmtDays(uc.days)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="insight-footnote">
                  Dias em substatus de retrabalho. Custo estimado 3–10× o valor original da feature (IEEE).
                </p>
              </>
          }
        </InsightCard>

        <InsightCard>
          <SectionTitle icon={Clock} title="UCs Bloqueados Atualmente"
            badge={criticalItems.length > 0 ? criticalItems.length : undefined} />
          {criticalItems.length === 0
            ? <AlertBadge level="success">Nenhum UC parado há mais de 14 dias no substatus atual</AlertBadge>
            : <>
                <div className="sa-item-list">
                  {criticalItems.slice(0, 5).map((item, i) => {
                    const cat = SUBSTATUS_CAT[item.category];
                    return (
                      <div key={item.id} className="sa-item-row">
                        <span className="sa-item-rank">{i + 1}</span>
                        <div className="sa-item-info">
                          <span className="sa-item-id">{item.id}</span>
                          <span className="sa-item-title" title={item.title}>{item.title}</span>
                          <span className="sa-item-substatus" style={{ color: cat?.color || 'var(--color-text-muted)' }}>
                            {item.substatus}
                          </span>
                        </div>
                        <span className={`sa-item-days${item.days > 30 ? ' is-critical' : ' is-warn'}`}>
                          {fmtDays(item.days)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="insight-footnote">
                  UCs com substatus atual ativo há mais de 14 dias. Acima de 30 dias requer expedite (Kanban).
                </p>
              </>
          }
        </InsightCard>

      </div>
    </div>
  );
}

// ── Marco entre Status: Estado + Sub Status lado a lado ──────────────────────
function StateDurationPanel({ avgTimePerState, avgTimePerSubStatus, stateItemList, subStatusItemList }) {
  const [modalState, setModalState] = useState(null); // { label, items, color }

  const stateEntries     = avgTimePerState     ? [...avgTimePerState.entries()]     : [];
  const subStatusEntries = avgTimePerSubStatus ? [...avgTimePerSubStatus.entries()] : [];

  const maxStateAvg     = Math.max(...stateEntries.map(([, v]) => v.avg),     1);
  const maxSubStatusAvg = Math.max(...subStatusEntries.map(([, v]) => v.avg), 1);

  const gargaloState     = stateEntries.reduce((g, [s, v]) => v.median > (g?.[1]?.median ?? 0) ? [s, v] : g, null);
  const gargaloSubStatus = subStatusEntries.reduce((g, [s, v]) => v.median > (g?.[1]?.median ?? 0) ? [s, v] : g, null);

  const noStateData     = stateEntries.length === 0;
  const noSubStatusData = subStatusEntries.length === 0;

  if (noStateData && noSubStatusData) {
    return (
      <InsightCard>
        <SectionTitle icon={Timer} title="Marco entre Status · Tempo em Cada Fase" />
        <span className="insight-empty">Sem transições de estado suficientes no período selecionado.</span>
      </InsightCard>
    );
  }

  function StateRow({ label, stats, color }) {
    const barW   = maxStateAvg > 0 ? (stats.avg / maxStateAvg) * 100 : 0;
    const color2 = stats.avg > 14 ? 'var(--color-er)' : stats.avg > 7 ? '#f59e0b' : 'var(--color-normal)';
    const items  = stateItemList?.get(label) || [];
    return (
      <div
        className="insight-state-row insight-state-row--clickable"
        onClick={() => setModalState({ label, items, color })}
        title="Clique para ver os UCs neste estado"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModalState({ label, items, color })}
      >
        <div className="insight-state-row-header">
          <span className="insight-state-badge" style={{ background: color }}>{label}</span>
          <span className="insight-state-avg" style={{ color: color2 }}>
            {fmtDays(stats.avg)} <span className="insight-state-avg-label">média</span>
          </span>
        </div>
        <div className="insight-state-bar-wrap">
          <div className="insight-hbar-track" style={{ flex: 1 }}>
            <div className="insight-hbar-fill" style={{ width: `${barW}%`, background: color2 }} />
          </div>
        </div>
        <div className="insight-state-stats">
          <span>mediana <strong>{fmtDays(stats.median)}</strong></span>
          <span>máx <strong>{fmtDays(stats.max)}</strong></span>
          <span>p75 <strong>{fmtDays(stats.p75)}</strong></span>
          <span className="insight-state-count">{stats.count} ocorrências</span>
        </div>
      </div>
    );
  }

  function SubRow({ label, stats, colorIdx }) {
    const barW   = maxSubStatusAvg > 0 ? (stats.avg / maxSubStatusAvg) * 100 : 0;
    const color2 = stats.avg > 14 ? 'var(--color-er)' : stats.avg > 7 ? '#f59e0b' : 'var(--color-normal)';
    const dot    = SUB_COLORS[colorIdx % SUB_COLORS.length];
    const items  = subStatusItemList?.get(label) || [];
    return (
      <div
        className="insight-state-row insight-state-row--clickable"
        onClick={() => setModalState({ label, items, color: dot })}
        title="Clique para ver os UCs neste sub status"
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setModalState({ label, items, color: dot })}
      >
        <div className="insight-state-row-header">
          <span className="insight-state-badge" style={{ background: dot }}>{label}</span>
          <span className="insight-state-avg" style={{ color: color2 }}>
            {fmtDays(stats.avg)} <span className="insight-state-avg-label">média</span>
          </span>
        </div>
        <div className="insight-state-bar-wrap">
          <div className="insight-hbar-track" style={{ flex: 1 }}>
            <div className="insight-hbar-fill" style={{ width: `${barW}%`, background: color2 }} />
          </div>
        </div>
        <div className="insight-state-stats">
          <span>mediana <strong>{fmtDays(stats.median)}</strong></span>
          <span>máx <strong>{fmtDays(stats.max)}</strong></span>
          <span>p75 <strong>{fmtDays(stats.p75)}</strong></span>
          <span className="insight-state-count">{stats.count} ocorrências</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {modalState && (
        <StateItemsModal
          label={modalState.label}
          items={modalState.items}
          color={modalState.color}
          onClose={() => setModalState(null)}
        />
      )}

      <div className="insight-two-col">
        {/* ── Status ───────────────────────────────────────────────────────── */}
        <InsightCard>
          <SectionTitle icon={Timer} title="Tempo por Status (dias)" />
          {gargaloState && (
            <div className="insight-alert insight-alert--warning" style={{ marginBottom: 4 }}>
              <AlertTriangle size={13} />
              <span>
                Gargalo: <strong>{gargaloState[0]}</strong> — mediana{' '}
                <strong>{fmtDays(gargaloState[1].median)}</strong>
                {' '}({gargaloState[1].count} ocorrências)
              </span>
            </div>
          )}
          {noStateData && <span className="insight-empty">Sem dados de estado no período.</span>}
          <div className="insight-state-duration-list">
            {stateEntries.map(([state, stats]) => (
              <StateRow
                key={state}
                label={state}
                stats={stats}
                color={STATE_COLORS[state] || DEFAULT_STATE_COLOR}
              />
            ))}
          </div>
          <p className="insight-footnote">
            Clique em um status para ver os UCs.
            Acima de 14 dias sinaliza gargalo.
          </p>
        </InsightCard>

        {/* ── Sub Status ───────────────────────────────────────────────────── */}
        <InsightCard>
          <SectionTitle icon={Timer} title="Tempo por Sub Status (dias)" />
          {gargaloSubStatus && (
            <div className="insight-alert insight-alert--warning" style={{ marginBottom: 4 }}>
              <AlertTriangle size={13} />
              <span>
                Gargalo: <strong>{gargaloSubStatus[0]}</strong> — mediana{' '}
                <strong>{fmtDays(gargaloSubStatus[1].median)}</strong>
                {' '}({gargaloSubStatus[1].count} ocorrências)
              </span>
            </div>
          )}
          {noSubStatusData && (
            <span className="insight-empty">
              Sem alterações de Sub Status registradas no período.
            </span>
          )}
          <div className="insight-state-duration-list">
            {subStatusEntries.map(([sub, stats], idx) => (
              <SubRow key={sub} label={sub} stats={stats} colorIdx={idx} />
            ))}
          </div>
          <p className="insight-footnote">
            Clique em um sub status para ver os UCs.
            Acima de 14 dias sinaliza gargalo.
          </p>
        </InsightCard>
      </div>
    </>
  );
}

// ── Lead Time ─────────────────────────────────────────────────────────────────
function LeadTimePanel({ leadTimes, leadTimeStats, leadTimeBuckets }) {
  if (!leadTimes?.length) return (
    <InsightCard>
      <SectionTitle icon={Milestone} title="Lead Time · Criação → Finalizado" />
      <span className="insight-empty">Nenhum UC finalizado encontrado no período selecionado.</span>
    </InsightCard>
  );

  const maxBucket    = Math.max(...leadTimeBuckets.map(b => b.count), 1);
  const top10slow    = leadTimes.slice(0, 10);
  const top5fast     = [...leadTimes].sort((a, b) => a.durationDays - b.durationDays).slice(0, 5);
  const slowItems    = leadTimes.filter(l => l.durationDays > 60);

  return (
    <div className="insight-leadtime-wrap">
      <div className="insight-kpi-row">
        <StatCard icon={Flag}          label="UCs Finalizados"  value={leadTimeStats.count}  accent="neutral" />
        <StatCard icon={Timer}         label="Lead Time Médio"  value={fmtDays(leadTimeStats.avg)}
          sub={`mediana ${fmtDays(leadTimeStats.median)}`} accent="neutral" />
        <StatCard icon={CheckCircle}   label="Mais Rápido"      value={fmtDays(leadTimeStats.min)} accent="success" />
        <StatCard icon={AlertTriangle} label="Mais Lento"       value={fmtDays(leadTimeStats.max)}
          accent={leadTimeStats.max > 90 ? 'error' : leadTimeStats.max > 60 ? 'warning' : 'neutral'} />
      </div>

      {slowItems.length > 0 && (
        <InsightCard>
          <AlertBadge level="warning">
            {slowItems.length} UC{slowItems.length > 1 ? 's levaram' : ' levou'} mais de 60 dias para
            ser{slowItems.length > 1 ? 'em' : ''} finalizado{slowItems.length > 1 ? 's' : ''} — revisar causas de atraso
          </AlertBadge>
        </InsightCard>
      )}

      <div className="insight-two-col">
        <InsightCard>
          <SectionTitle icon={BarChart3} title="Distribuição do Lead Time" />
          <div className="insight-lt-histogram">
            {leadTimeBuckets.map(b => {
              const barH   = maxBucket > 0 ? Math.round((b.count / maxBucket) * 80) : 0;
              const pctVal = leadTimeStats.count > 0 ? Math.round((b.count / leadTimeStats.count) * 100) : 0;
              const color  = b.label.includes('90') || b.label.includes('61')
                ? 'var(--color-er)' : b.label.includes('31')
                ? '#f59e0b' : b.label.includes('< 7')
                ? 'var(--color-normal)' : 'var(--color-accent)';
              return (
                <div key={b.label} className="insight-lt-col">
                  <span className="insight-lt-count">{b.count}</span>
                  <div className="insight-lt-bar" style={{ height: `${barH}px`, background: color }} />
                  <span className="insight-lt-label">{b.label}</span>
                  <span className="insight-lt-pct">{pctVal}%</span>
                </div>
              );
            })}
          </div>
          <p className="insight-footnote">
            Distribuição por faixa · {leadTimeStats.count} UCs finalizados
          </p>
        </InsightCard>

        <InsightCard>
          <SectionTitle icon={CheckCircle} title="Concluídos Mais Rápido" badge="Top 5" />
          <div className="insight-lt-list">
            {top5fast.map((lt, i) => (
              <div key={lt.workItemId} className="insight-lt-item insight-lt-item--fast">
                <span className="insight-lt-rank">{i + 1}</span>
                <div className="insight-lt-info">
                  <span className="insight-lt-title" title={lt.title}>{lt.title}</span>
                  <span className="insight-lt-meta">
                    {fmtDate(lt.createdAt)} <ArrowRight size={10} /> {fmtDate(lt.finalizedAt)}
                  </span>
                </div>
                <span className="insight-lt-days insight-lt-days--fast">{fmtDays(lt.durationDays)}</span>
              </div>
            ))}
          </div>
        </InsightCard>
      </div>

      <InsightCard>
        <SectionTitle icon={Clock} title="UCs com Maior Lead Time" badge="Top 10" />
        <div className="insight-lt-list">
          {top10slow.map((lt, i) => (
            <div key={lt.workItemId} className="insight-lt-item">
              <span className="insight-lt-rank">{i + 1}</span>
              <div className="insight-lt-info">
                <span className="insight-lt-title" title={lt.title}>{lt.title}</span>
                <span className="insight-lt-meta">
                  criado {fmtDate(lt.createdAt)}
                  <ArrowRight size={10} />
                  finalizado {fmtDate(lt.finalizedAt)}
                  · {lt.finalState}
                </span>
              </div>
              <span className={`insight-lt-days${lt.durationDays > 60 ? ' insight-lt-days--slow' : lt.durationDays > 30 ? ' insight-lt-days--warn' : ''}`}>
                {fmtDays(lt.durationDays)}
              </span>
            </div>
          ))}
        </div>
        <p className="insight-footnote">
          Da primeira revisão registrada no ADO até o primeiro estado de finalização
        </p>
      </InsightCard>
    </div>
  );
}

// ── Painel: análise histórica ────────────────────────────────────────────────
function HistoryPanel({ historyData }) {
  const {
    byItem,
    avgTimePerState, avgTimePerSubStatus, stateItemList, subStatusItemList,
    leadTimes, leadTimeStats, leadTimeBuckets,
    titleHistoryMap     = new Map(),
    subStatusHistoryMap = new Map(),
  } = historyData;

  // Mapa id → título atual para lookup nas tabelas
  const itemTitleMap = useMemo(() => {
    const m = new Map();
    if (byItem) for (const [id, v] of byItem) m.set(id, v.title || id);
    return m;
  }, [byItem]);

  return (
    <div className="insight-history">

      {/* ── Histórico de Nomes / Substatus ── */}
      <HistoryNamesCard
        titleHistoryMap={titleHistoryMap}
        subStatusHistoryMap={subStatusHistoryMap}
        itemTitleMap={itemTitleMap}
      />

      {/* ── Análise Estratégica ── */}
      <div className="er-section-divider" role="separator">
        <span className="er-section-divider-label">Análise Estratégica · Ofensores de Tempo por Substatus</span>
      </div>

      <SubStatusAnalyticsPanel
        subStatusHistoryMap={subStatusHistoryMap}
        itemTitleMap={itemTitleMap}
      />

      {/* ── Marco entre Status ── */}
      <div className="er-section-divider" role="separator">
        <span className="er-section-divider-label">Marco entre Status · Tempo em Cada Fase</span>
      </div>

      <StateDurationPanel
        avgTimePerState={avgTimePerState}
        avgTimePerSubStatus={avgTimePerSubStatus}
        stateItemList={stateItemList}
        subStatusItemList={subStatusItemList}
      />

      {/* ── Lead Time ── */}
      <div className="er-section-divider" role="separator">
        <span className="er-section-divider-label">Lead Time · Da Criação até a Finalização</span>
      </div>

      <LeadTimePanel
        leadTimes={leadTimes}
        leadTimeStats={leadTimeStats}
        leadTimeBuckets={leadTimeBuckets}
      />
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
const EMPTY_FILTERS = { dateFrom: '', dateTo: '', produtos: [], estados: [], responsaveis: [] };

export default function InsightsTab({ rawData, filtersOpen, onActiveCountChange }) {
  const { loaded, loading, error, progress, loadHistory, computeInsights } = useInsightsHistory();

  // ── Estado dos filtros ─────────────────────────────────────────────────────
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      if (Array.isArray(prev[key])) {
        const arr = prev[key];
        return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
      }
      return { ...prev, [key]: value };
    });
  };

  const handleClear = () => setFilters(EMPTY_FILTERS);

  // ── rawData filtrado para snapshot ────────────────────────────────────────
  const filteredRawData = useMemo(() => rawData.filter(item => {
    if (filters.produtos.length     && !filters.produtos.includes(item.produto))       return false;
    if (filters.estados.length      && !filters.estados.includes(item.state))          return false;
    if (filters.responsaveis.length && !filters.responsaveis.includes(item.assignedTo)) return false;
    return true;
  }), [rawData, filters.produtos, filters.estados, filters.responsaveis]);

  // ── IDs para filtrar histórico ─────────────────────────────────────────────
  const filteredItemIds = useMemo(
    () => (filters.produtos.length || filters.estados.length || filters.responsaveis.length)
      ? new Set(filteredRawData.map(i => i.id))
      : null,            // null = sem filtro de itens
    [filteredRawData, filters.produtos, filters.estados, filters.responsaveis]
  );

  // ── Agrega insights com filtros ───────────────────────────────────────────
  const historyData = useMemo(
    () => computeInsights(filteredItemIds, filters.dateFrom, filters.dateTo),
    [computeInsights, filteredItemIds, filters.dateFrom, filters.dateTo]
  );

  // ── Carrega ao montar ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!loaded && !loading && rawData?.length > 0) {
      loadHistory(rawData);
    }
  }, [rawData, loaded, loading, loadHistory]);

  const activeCount =
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0) +
    filters.produtos.length + filters.estados.length + filters.responsaveis.length;

  // Reporta contagem ao pai para exibir badge no botão do header
  useEffect(() => {
    onActiveCountChange?.(activeCount);
  }, [activeCount, onActiveCountChange]);

  return (
    <div className="insights-tab">

      {filtersOpen && (
        <InsightsFilterBar
          rawData={rawData}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClear={handleClear}
        />
      )}

      {loading && (
        <div className="insight-history-loading">
          <Loader2 size={18} className="spin" />
          <span>Carregando histórico de {rawData?.length || 0} UCs… {progress}%</span>
          <div className="insight-progress-bar">
            <div className="insight-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="insight-history-error">
          <AlertCircle size={15} />
          <span>{error.message}</span>
          <button className="retry-btn" onClick={() => loadHistory(rawData)}>
            <RefreshCw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && !loaded && (
        <div className="insight-history-empty">
          <Info size={15} />
          <span>Histórico ainda não carregado.</span>
          <button className="insight-load-btn" onClick={() => loadHistory(rawData)}>
            <Activity size={13} /> Carregar Análise Histórica
          </button>
        </div>
      )}

      {!loading && !error && loaded && !historyData && (
        <div className="insight-history-empty">
          <Info size={15} />
          <span>Nenhuma alteração encontrada para os filtros selecionados.</span>
        </div>
      )}

      {!loading && !error && historyData && (
        <HistoryPanel historyData={historyData} />
      )}
    </div>
  );
}
