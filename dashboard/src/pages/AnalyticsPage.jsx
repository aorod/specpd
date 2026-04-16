import { useState, useMemo, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, RotateCcw, Sun, Moon,
  Layers, Pin, PinOff, SlidersHorizontal, History, ChevronLeft, ChevronRight,
  ShieldAlert, ChevronsUpDown, ChevronUp, ChevronDown, BarChart2, Table2,
} from 'lucide-react';
import { useUCData }              from '../hooks/useUCData.js';
import { useSort }                from '../hooks/useSort.js';
import { aliasName }              from '../utils/nameAliases.js';
import MetricCard                 from '../components/cards/MetricCard.jsx';
import ProfileMenu                from '../components/profile/ProfileMenu.jsx';
import HistoricoModal             from '../components/analytics/HistoricoModal.jsx';
import AnalyticsFilterBar         from '../components/filters/AnalyticsFilterBar.jsx';
import InsightsTab                from '../components/analytics/InsightsTab.jsx';
import '../components/table/UCTable.css';
import './AnalyticsPage.css';

const PAGE_SIZES    = [10, 25, 50, 100];
const MAX_PAGE_BTNS = 10;
const ADO_BASE      = 'https://dev.azure.com/Vector-Brasil/Roadmap%202025/_workitems/edit/';

const SORTABLE_COLS = [
  { key: 'state',      label: 'Estado'      },
  { key: 'produto',    label: 'Produto'     },
  { key: 'assignedTo', label: 'Responsável' },
];

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown size={13} className="sort-icon" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp   size={13} className="sort-icon sort-icon--active" />
    : <ChevronDown size={13} className="sort-icon sort-icon--active" />;
}

function PageWindow({ safePage, totalPages, onPageChange }) {
  const half = Math.floor(MAX_PAGE_BTNS / 2);
  let winStart = Math.max(1, safePage - half);
  let winEnd   = Math.min(totalPages, winStart + MAX_PAGE_BTNS - 1);
  if (winEnd - winStart + 1 < MAX_PAGE_BTNS) winStart = Math.max(1, winEnd - MAX_PAGE_BTNS + 1);
  return Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i).map(p => (
    <button
      key={p}
      className={`pagination-btn pagination-page-btn${p === safePage ? ' pagination-page-btn--active' : ''}`}
      onClick={() => onPageChange(p)}
    >{p}</button>
  ));
}

export default function AnalyticsPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { data: rawData, loading, error, retry } = useUCData();

  // ─── Tab ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('tabela'); // 'tabela' | 'insights'

  // ─── Filtros da aba Insights ───────────────────────────────────────────────
  const [insightsFiltersOpen,  setInsightsFiltersOpen]  = useState(true);
  const [insightsActiveCount,  setInsightsActiveCount]  = useState(0);

  // ─── Pinned cards ───────────────────────────────────────────────────────────
  const [pinnedCards, setPinnedCards] = useState([]);
  const togglePin = (id) =>
    setPinnedCards(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

  const renderCard = (card, pinned) => {
    if (card.type === 'metric') {
      return (
        <MetricCard
          key={card.id}
          icon={card.icon}
          label={card.label}
          value={card.value}
          detail={card.detail}
          accent={card.accent}
          pinned={pinned}
          onTogglePin={() => togglePin(card.id)}
        />
      );
    }
    const Icon = card.icon;
    return (
      <div key={card.id} className={`metric-card metric-card--${card.accent} er-text-card`}>
        <div className="metric-card-icon"><Icon size={18} /></div>
        <div className="metric-card-body">
          <span className="metric-card-label">{card.label}</span>
          <span className="metric-card-value--text">{card.textValue}</span>
          {card.detail && <span className="metric-card-detail">{card.detail}</span>}
        </div>
        <button
          className={`metric-card-pin${pinned ? ' is-pinned' : ''}`}
          onClick={() => togglePin(card.id)}
          title={pinned ? 'Desafixar card' : 'Fixar card no topo'}
        >
          {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </div>
    );
  };

  // ─── Tabela: filtros ─────────────────────────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search,      setSearch]      = useState('');
  const [filters, setFilters]         = useState({ produtos: [], estados: [], responsaveis: [], meses: [], anos: [] });
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const toggleFilter = useCallback((key, value) => {
    setFilters(prev => {
      const current = prev[key];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilters({ produtos: [], estados: [], responsaveis: [], meses: [], anos: [] });
    setPage(1);
  }, []);

  const activeCount = Object.values(filters).reduce((sum, v) => sum + v.length, 0)
    + (search.trim() ? 1 : 0);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase();
    return rawData.filter(item => {
      if (q && !item.title?.toLowerCase().includes(q) && !item.id?.toLowerCase().includes(q)) return false;
      if (filters.produtos.length > 0     && !filters.produtos.includes(item.produto))        return false;
      if (filters.estados.length > 0      && !filters.estados.includes(item.state))           return false;
      if (filters.responsaveis.length > 0 && !filters.responsaveis.includes(item.assignedTo)) return false;
      if (filters.meses.length > 0        && !filters.meses.includes(item.mes))               return false;
      if (filters.anos.length > 0         && !filters.anos.includes(item.ano))                return false;
      return true;
    });
  }, [rawData, search, filters]);

  const { sortedData, sortConfig, requestSort } = useSort(filteredData);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * pageSize;
  const pagedData  = sortedData.slice(start, start + pageSize);

  const from = sortedData.length === 0 ? 0 : start + 1;
  const to   = Math.min(start + pageSize, sortedData.length);

  const handleSort = (key) => { requestSort(key); setPage(1); };

  // ─── Modal histórico ─────────────────────────────────────────────────────────
  const [selectedItem, setSelectedItem] = useState(null);

  // ─── Cards ──────────────────────────────────────────────────────────────────
  const produtoMaisAlterado = '—';

  const allCardDefs = [
    { id: 'total', type: 'metric', icon: Layers,     label: 'Total de Casos de Uso', value: rawData.length, detail: null, accent: 'neutral' },
    { id: 'risco', type: 'text',   icon: ShieldAlert, label: 'Produto Mais Alterado',
      textValue: produtoMaisAlterado,
      detail: 'em implementação futura',
      accent: 'er' },
  ];

  const pinnedDefs   = allCardDefs.filter(c => pinnedCards.includes(c.id));
  const unpinnedDefs = allCardDefs.filter(c => !pinnedCards.includes(c.id));

  return (
    <div className="analytics-page">
      {/* ── Sticky top ── */}
      <div className="analytics-sticky-top">
        <button
          className={`app-menu-btn${menuOpen ? ' is-open' : ''}`}
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className="hamburger">
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </span>
        </button>

        <header className="analytics-header">
          <div>
            <h1 className="analytics-title">Analytics</h1>
            <p className="analytics-subtitle">Visão estratégica dos Casos de Uso · Análise Estratégica 2026</p>
          </div>
          <div className="analytics-header-right">
            {/* ── Tab switcher ── */}
            {!loading && !error && (
              <div className="analytics-tab-switcher">
                <button
                  className={`analytics-tab-btn${activeTab === 'tabela' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('tabela')}
                >
                  <Table2 size={13} />
                  Tabela
                </button>
                <button
                  className={`analytics-tab-btn${activeTab === 'insights' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('insights')}
                >
                  <BarChart2 size={13} />
                  Insights Estratégicos
                </button>
              </div>
            )}

            {!loading && (
              <button className="refresh-btn" onClick={retry} disabled={loading} title="Atualizar dados">
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                Atualizar
              </button>
            )}
            {!loading && !error && activeTab === 'tabela' && (
              <button
                className={`filters-toggle-btn${filtersOpen ? ' is-active' : ''}`}
                aria-pressed={filtersOpen}
                onClick={() => setFiltersOpen(o => !o)}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {activeCount > 0 && (
                  <span className="filters-toggle-badge">{activeCount}</span>
                )}
              </button>
            )}
            {!loading && !error && activeTab === 'insights' && (
              <button
                className={`filters-toggle-btn${insightsFiltersOpen ? ' is-active' : ''}`}
                aria-pressed={insightsFiltersOpen}
                onClick={() => setInsightsFiltersOpen(o => !o)}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {insightsActiveCount > 0 && (
                  <span className="filters-toggle-badge">{insightsActiveCount}</span>
                )}
              </button>
            )}
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div className="dashboard-badge">
              <span className={`dashboard-badge-dot${loading ? ' is-loading' : error ? ' is-error' : ''}`} />
              {loading ? 'Carregando...' : error ? 'Offline' : 'Online'}
            </div>
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>

        {!loading && !error && pinnedDefs.length > 0 && (
          <div className="pinned-cards-row">
            {pinnedDefs.map(card => renderCard(card, true))}
          </div>
        )}

        {!loading && !error && activeTab === 'tabela' && filtersOpen && (
          <AnalyticsFilterBar
            data={rawData}
            filters={filters}
            toggleFilter={toggleFilter}
            clearFilters={clearFilters}
            isActive={activeCount > 0}
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
          />
        )}
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="dashboard-status">
          <RefreshCw size={16} className="spin" />
          <span>Buscando dados do Azure DevOps...</span>
        </div>
      )}

      {error && (
        <div className="dashboard-status dashboard-status--error">
          <AlertCircle size={16} />
          <span>{error.message}</span>
          <button onClick={retry} className="retry-btn">
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <main className="analytics-main">

          {/* ── Métricas ── */}
          {unpinnedDefs.length > 0 && activeTab !== 'insights' && (
            <section className="metrics-grid" aria-label="Métricas">
              {unpinnedDefs.map(card => renderCard(card, false))}
            </section>
          )}

          {/* ══ Aba: Insights Estratégicos ══ */}
          {activeTab === 'insights' && (
            <InsightsTab
              rawData={rawData}
              filtersOpen={insightsFiltersOpen}
              onActiveCountChange={setInsightsActiveCount}
            />
          )}

          {/* ══ Aba: Tabela ══════════════════════════════════════════════════════ */}
          {activeTab === 'tabela' && (<>
          <div className="er-section-divider" role="separator">
            <span className="er-section-divider-label">Casos de Uso — Histórico de Alterações</span>
          </div>

          {/* ── Tabela ── */}
          <div className="uc-table-wrap">
            <div className="uc-table-header">
              <h3 className="uc-table-title">Casos de Uso — Histórico de Alterações</h3>
              <span className="uc-table-count">
                {sortedData.length} {sortedData.length === 1 ? 'item' : 'itens'}
              </span>
            </div>

            <div className="uc-table-scroll">
              <table className="uc-table" role="table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Título</th>
                    {SORTABLE_COLS.map(({ key, label }) => (
                      <th
                        key={key}
                        scope="col"
                        className="sortable-th"
                        onClick={() => handleSort(key)}
                        aria-sort={sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <span className="th-inner">
                          {label}
                          <SortIcon col={key} sortConfig={sortConfig} />
                        </span>
                      </th>
                    ))}
                    <th scope="col">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedData.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="uc-table-empty">
                        Nenhum resultado encontrado.
                      </td>
                    </tr>
                  ) : pagedData.map((item, idx) => {
                    const idNum = item.id.replace(/\D/g, '');
                    return (
                      <tr key={item.id} className="uc-table-row" style={{ animationDelay: `${idx * 12}ms` }}>
                        <td className="cell-id">
                          <a href={`${ADO_BASE}${idNum}`} target="_blank" rel="noreferrer" className="cell-id-link">
                            {item.id}
                          </a>
                        </td>
                        <td className="cell-title">
                          <span title={item.title} className="title-text">{item.title}</span>
                        </td>
                        <td>
                          <span className={`state-badge state-badge--${item.state.toLowerCase().replace(/\s+/g, '-')}`}>
                            {item.state || '—'}
                          </span>
                        </td>
                        <td>{item.produto || '—'}</td>
                        <td>{aliasName(item.assignedTo) || '—'}</td>
                        <td>
                          <button
                            className="uc-historico-btn"
                            onClick={() => setSelectedItem(item)}
                            title="Ver histórico de alterações"
                          >
                            <History size={13} />
                            Histórico
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="uc-pagination">
              <span className="pagination-info">
                {sortedData.length > 0 ? `${from}–${to} de ${sortedData.length} itens` : '0 itens'}
              </span>
              <div className="pagination-center">
                <button
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={15} />
                </button>
                <PageWindow safePage={safePage} totalPages={totalPages} onPageChange={setPage} />
                <button
                  className="pagination-btn"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Próxima página"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
              <div className="pagination-right">
                <span className="page-size-label">Por página</span>
                <select
                  className="page-size-select"
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                  aria-label="Itens por página"
                >
                  {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
          </>)}

        </main>
      )}

      {/* ── Modal histórico individual ── */}
      {selectedItem && (
        <HistoricoModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
