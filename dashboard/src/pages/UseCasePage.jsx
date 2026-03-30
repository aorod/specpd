import { useState, useMemo } from 'react';
import { Layers, AlertTriangle, FileCheck, FileMinus, RefreshCw, AlertCircle, RotateCcw, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import { useUCData } from '../hooks/useUCData.js';
import { useFilters } from '../hooks/useFilters.js';
import { useUCMetrics } from '../hooks/useUCMetrics.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import FilterBar from '../components/filters/FilterBar.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import HorizontalBarChart from '../components/charts/HorizontalBarChart.jsx';
import VerticalBarChart from '../components/charts/VerticalBarChart.jsx';
import RequisitoChart from '../components/charts/RequisitoChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import UCTable from '../components/table/UCTable.jsx';
import './UseCasePage.css';

export default function UseCasePage({ theme, setTheme }) {
  const { data: rawData, loading, error, retry } = useUCData();
  const { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount } = useFilters(rawData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    { id: 'total',  icon: Layers,        label: 'Total de Caso de Uso',      value: metrics.totalUCs,     detail: null,                             accent: 'neutral' },
    { id: 'normal', icon: FileCheck,     label: 'Fluxo Normal',       value: metrics.fluxoNormal,  detail: `${metrics.pctNormal}% do total`, accent: 'success' },
    { id: 'er',     icon: AlertTriangle, label: 'Engenharia Reversa', value: metrics.fluxoER,      detail: `${metrics.pctER}% do total`,     accent: 'er'      },
    { id: 'semReq', icon: FileMinus,     label: 'Sem Documentação',   value: metrics.semRequisito, detail: null,                             accent: 'warning' },
  ];

  const pinnedDefs   = cardDefs.filter((c) => pinnedCards.includes(c.id));
  const unpinnedDefs = cardDefs.filter((c) => !pinnedCards.includes(c.id));

  return (
    <div className="dashboard">
      <div className="dashboard-sticky-top">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Casos de Uso</h1>
            <p className="dashboard-subtitle">Acompanhamento de Casos de Uso</p>
          </div>
          <div className="dashboard-header-right">
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
            {!loading && !error && (
              <button
                className={`filters-toggle-btn${sidebarOpen ? ' is-active' : ''}`}
                onClick={() => setSidebarOpen((o) => !o)}
                aria-pressed={sidebarOpen}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {(activeCount > 0 || search) && (
                  <span className="filters-toggle-badge">{activeCount + (search ? 1 : 0)}</span>
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
          </div>
        </header>

        {!loading && !error && (
          <>
            <FilterBar
              data={rawData}
              filters={filters}
              toggleFilter={toggleFilter}
              clearFilters={clearFilters}
              isActive={isActive}
              open={sidebarOpen}
              search={search}
              onSearchChange={setSearch}
              chartsCollapsed={chartsCollapsed}
              onToggleCharts={() => setChartsCollapsed((v) => !v)}
            />
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

      {!loading && !error && (
        <main className="dashboard-main">
          {unpinnedDefs.length > 0 && (
            <section className="metrics-grid" aria-label="Métricas principais">
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
              <LineChart data={metrics.porMes} anos={filters.anos} forceCollapsed={chartsCollapsed} />
            </div>
            <VerticalBarChart data={metrics.porDesigner} forceCollapsed={chartsCollapsed} />
            <RequisitoChart data={metrics.porRequisito} forceCollapsed={chartsCollapsed} />
          </section>

          <section aria-label="Tabela de UCs">
            <UCTable data={displayData} />
          </section>
        </main>
      )}
    </div>
  );
}
