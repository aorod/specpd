import { useState, useMemo } from 'react';
import { Layers, AlertTriangle, FileCheck, RefreshCw, AlertCircle, RotateCcw, SlidersHorizontal, Sun, Moon, Package, Truck, Users } from 'lucide-react';
import { useUCData } from '../hooks/useUCData.js';
import { useFilters } from '../hooks/useFilters.js';
import { useUCMetrics } from '../hooks/useUCMetrics.js';
import { useEmbarcadorFilters } from '../hooks/useEmbarcadorFilters.js';
import { useEmbarcadorMetrics } from '../hooks/useEmbarcadorMetrics.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import FilterBar from '../components/filters/FilterBar.jsx';
import EmbarcadorFilterBar from '../components/filters/EmbarcadorFilterBar.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import HorizontalBarChart from '../components/charts/HorizontalBarChart.jsx';
import VerticalBarChart from '../components/charts/VerticalBarChart.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import RequisitoChart from '../components/charts/RequisitoChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import UCTable from '../components/table/UCTable.jsx';
import EmbarcadorTable from '../components/table/EmbarcadorTable.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './UseCasePage.css';

export default function UseCasePage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { data: rawData, loading, error, retry } = useUCData();

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('produto'); // 'produto' | 'embarcador'

  // ─── Aba PRODUTO ──────────────────────────────────────────────────────────
  const { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount } = useFilters(rawData);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState('');
  const [pinnedCards, setPinnedCards] = useState([]);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const term = search.toLowerCase();
    return filteredData.filter((d) => d.title.toLowerCase().includes(term));
  }, [filteredData, search]);

  const metrics = useUCMetrics(displayData);

  const togglePin = (id) =>
    setPinnedCards((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const cardDefs = [
    { id: 'total',  icon: Layers,        label: 'Total de Caso de Uso', value: metrics.totalUCs,    detail: null,                             accent: 'neutral' },
    { id: 'normal', icon: FileCheck,     label: 'Fluxo Normal',         value: metrics.fluxoNormal, detail: `${metrics.pctNormal}% do total`, accent: 'success' },
    { id: 'er',     icon: AlertTriangle, label: 'Engenharia Reversa',   value: metrics.fluxoER,     detail: `${metrics.pctER}% do total`,     accent: 'er'      },
  ];

  const pinnedDefs   = cardDefs.filter((c) => pinnedCards.includes(c.id));
  const unpinnedDefs = cardDefs.filter((c) => !pinnedCards.includes(c.id));

  // ─── Aba EMBARCADOR ───────────────────────────────────────────────────────
  const { filters: embFilters, filteredData: embFilteredData, toggleFilter: embToggleFilter, clearFilters: embClearFilters, isActive: embIsActive, activeCount: embActiveCount } = useEmbarcadorFilters(rawData);
  const [embFiltersOpen, setEmbFiltersOpen] = useState(true);
  const [embSearch, setEmbSearch] = useState('');
  const [embPinnedCards, setEmbPinnedCards] = useState([]);
  const [embChartsCollapsed, setEmbChartsCollapsed] = useState(false);

  const embDisplayData = useMemo(() => {
    if (!embSearch.trim()) return embFilteredData;
    const term = embSearch.toLowerCase();
    return embFilteredData.filter((d) => d.title.toLowerCase().includes(term));
  }, [embFilteredData, embSearch]);

  const embMetrics = useEmbarcadorMetrics(embDisplayData);

  const embTogglePin = (id) =>
    setEmbPinnedCards((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const embCardDefs = [
    { id: 'emb-total', icon: Layers, label: 'Total de Caso de Uso', value: embMetrics.totalUCs,        detail: null,                                    accent: 'neutral' },
    { id: 'emb-count', icon: Truck,  label: 'Com Embarcador',       value: embMetrics.comEmbarcador,   detail: `${embMetrics.pctComEmb}% do total`,     accent: 'success' },
    { id: 'emb-uniq',  icon: Users,  label: 'Embarcadores Únicos',  value: embMetrics.totalEmbarcadores, detail: null,                                  accent: 'neutral' },
  ];

  const embPinnedDefs   = embCardDefs.filter((c) => embPinnedCards.includes(c.id));
  const embUnpinnedDefs = embCardDefs.filter((c) => !embPinnedCards.includes(c.id));

  return (
    <div className="dashboard">
      <div className="dashboard-sticky-top">
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
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Casos de Uso</h1>
            <p className="dashboard-subtitle">Acompanhamento de Casos de Uso</p>
          </div>
          <div className="dashboard-header-right">
            {/* ── Tab switcher ── */}
            {!loading && !error && (
              <div className="uc-tab-switcher">
                <button
                  className={`uc-tab-btn${activeTab === 'produto' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('produto')}
                >
                  <Package size={13} />
                  Produto
                </button>
                <button
                  className={`uc-tab-btn${activeTab === 'embarcador' ? ' is-active' : ''}`}
                  onClick={() => setActiveTab('embarcador')}
                >
                  <Truck size={13} />
                  Embarcador
                </button>
              </div>
            )}

            {!loading && (
              <button
                className={`refresh-btn${loading ? ' is-loading' : ''}`}
                onClick={retry}
                disabled={loading}
                aria-label="Atualizar dados"
                title="Buscar dados atualizados do Azure DevOps"
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                Atualizar
              </button>
            )}

            {!loading && !error && activeTab === 'produto' && (
              <button
                className={`filters-toggle-btn${filtersOpen ? ' is-active' : ''}`}
                onClick={() => setFiltersOpen((o) => !o)}
                aria-pressed={filtersOpen}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {(activeCount > 0 || search) && (
                  <span className="filters-toggle-badge">{activeCount + (search ? 1 : 0)}</span>
                )}
              </button>
            )}

            {!loading && !error && activeTab === 'embarcador' && (
              <button
                className={`filters-toggle-btn${embFiltersOpen ? ' is-active' : ''}`}
                onClick={() => setEmbFiltersOpen((o) => !o)}
                aria-pressed={embFiltersOpen}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {(embActiveCount > 0 || embSearch) && (
                  <span className="filters-toggle-badge">{embActiveCount + (embSearch ? 1 : 0)}</span>
                )}
              </button>
            )}

            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
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

        {/* ── Pinned cards + FilterBar para aba PRODUTO ── */}
        {!loading && !error && activeTab === 'produto' && (
          <>
            {filtersOpen && (
              <FilterBar
                data={rawData}
                filters={filters}
                toggleFilter={toggleFilter}
                clearFilters={clearFilters}
                isActive={isActive}
                search={search}
                onSearchChange={setSearch}
                chartsCollapsed={chartsCollapsed}
                onToggleCharts={() => setChartsCollapsed((v) => !v)}
              />
            )}
            {pinnedDefs.length > 0 && (
              <div className="pinned-cards-row">
                {pinnedDefs.map((card) => (
                  <MetricCard
                    key={card.id}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    detail={card.detail}
                    accent={card.accent}
                    pinned
                    onTogglePin={() => togglePin(card.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Pinned cards + FilterBar para aba EMBARCADOR ── */}
        {!loading && !error && activeTab === 'embarcador' && (
          <>
            {embFiltersOpen && (
              <EmbarcadorFilterBar
                data={rawData}
                filters={embFilters}
                toggleFilter={embToggleFilter}
                clearFilters={embClearFilters}
                isActive={embIsActive}
                search={embSearch}
                onSearchChange={setEmbSearch}
                chartsCollapsed={embChartsCollapsed}
                onToggleCharts={() => setEmbChartsCollapsed((v) => !v)}
              />
            )}
            {embPinnedDefs.length > 0 && (
              <div className="pinned-cards-row">
                {embPinnedDefs.map((card) => (
                  <MetricCard
                    key={card.id}
                    icon={card.icon}
                    label={card.label}
                    value={card.value}
                    detail={card.detail}
                    accent={card.accent}
                    pinned
                    onTogglePin={() => embTogglePin(card.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

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

      {/* ══ Aba: PRODUTO ══════════════════════════════════════════════════════ */}
      {!loading && !error && activeTab === 'produto' && (
        <main className="dashboard-main">
          {unpinnedDefs.length > 0 && (
            <section className="metrics-grid metrics-grid--3" aria-label="Métricas principais">
              {unpinnedDefs.map((card) => (
                <MetricCard
                  key={card.id}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  detail={card.detail}
                  accent={card.accent}
                  pinned={false}
                  onTogglePin={() => togglePin(card.id)}
                />
              ))}
            </section>
          )}

          <section className="charts-grid" aria-label="Gráficos">
            <DonutChart normal={metrics.fluxoNormal} er={metrics.fluxoER} forceCollapsed={chartsCollapsed} />
            <HorizontalBarChart data={metrics.porProduto} forceCollapsed={chartsCollapsed} />
            <div style={{ gridColumn: '1 / -1' }}>
              <LineChart data={metrics.porMes} anos={filters.anos} dotRadius={2.5} forceCollapsed={chartsCollapsed} />
            </div>
            <VerticalBarChart data={metrics.porDesigner} forceCollapsed={chartsCollapsed} />
            <RequisitoChart data={metrics.porRequisito} forceCollapsed={chartsCollapsed} />
          </section>

          <section aria-label="Tabela de UCs">
            <UCTable data={displayData} />
          </section>
        </main>
      )}

      {/* ══ Aba: EMBARCADOR ═══════════════════════════════════════════════════ */}
      {!loading && !error && activeTab === 'embarcador' && (
        <main className="dashboard-main">
          {embUnpinnedDefs.length > 0 && (
            <section className="metrics-grid metrics-grid--3" aria-label="Métricas de Embarcadores">
              {embUnpinnedDefs.map((card) => (
                <MetricCard
                  key={card.id}
                  icon={card.icon}
                  label={card.label}
                  value={card.value}
                  detail={card.detail}
                  accent={card.accent}
                  pinned={false}
                  onTogglePin={() => embTogglePin(card.id)}
                />
              ))}
            </section>
          )}

          <section className="charts-grid" aria-label="Gráficos de Embarcadores">
            <div style={{ gridColumn: '1 / -1' }}>
              <ColumnChart
                data={embMetrics.porEmbarcador}
                title="Por Embarcador"
                tooltipLabel="Total de UCs"
                forceCollapsed={embChartsCollapsed}
                showMiniCards={false}
                formatValue={(v) => String(Math.round(v))}
              />
            </div>
          </section>

          <section aria-label="Tabela de UCs — Embarcadores">
            <EmbarcadorTable data={embDisplayData} />
          </section>
        </main>
      )}
    </div>
  );
}
