import { useState, useMemo } from 'react';
import { ClipboardList, Clock, FileCheck, FileMinus, RefreshCw, AlertCircle, RotateCcw, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import { useTimesheetData } from '../hooks/useTimesheetData.js';
import { useTimesheetFilters } from '../hooks/useTimesheetFilters.js';
import { useTimesheetMetrics } from '../hooks/useTimesheetMetrics.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import TimesheetFilterBar from '../components/filters/TimesheetFilterBar.jsx';
import StatusDonutChart from '../components/charts/StatusDonutChart.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import RequisitoChart from '../components/charts/RequisitoChart.jsx';
import TimesheetTable from '../components/table/TimesheetTable.jsx';
import './UseCasePage.css';

export default function TimesheetPage({ theme, setTheme }) {
  const { data: rawData, loading, error, retry } = useTimesheetData();
  const { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount } = useTimesheetFilters(rawData);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pinnedCards, setPinnedCards] = useState([]);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const term = search.toLowerCase();
    return filteredData.filter((d) => d.title.toLowerCase().includes(term));
  }, [filteredData, search]);

  const metrics = useTimesheetMetrics(displayData);

  const porResponsavelHoras = useMemo(() => {
    const map = new Map();
    for (const [key, val] of metrics.porResponsavel.entries()) {
      map.set(key, { total: parseFloat(val.totalEffort.toFixed(1)) });
    }
    return map;
  }, [metrics.porResponsavel]);

  const porAtividadeHoras = useMemo(() => {
    const map = new Map();
    for (const [key, val] of metrics.porAtividade.entries()) {
      map.set(key, { total: parseFloat(val.totalEffort.toFixed(1)) });
    }
    return map;
  }, [metrics.porAtividade]);

  const togglePin = (id) =>
    setPinnedCards((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const cardDefs = [
    { id: 'total',    icon: ClipboardList, label: 'Total de Timesheets', value: metrics.totalTimesheets, detail: null,                                    accent: 'neutral' },
    { id: 'effort',   icon: Clock,         label: 'Total de Horas',      value: parseFloat(metrics.totalEffort.toFixed(1)), detail: 'horas registradas', accent: 'muted' },
    { id: 'comAtiv',  icon: FileCheck,     label: 'Com Atividade',       value: metrics.comAtividade,    detail: `${metrics.pctComAtividade}% do total`, accent: 'success' },
    { id: 'semAtiv',  icon: FileMinus,     label: 'Sem Atividade',       value: metrics.semAtividade,    detail: `${metrics.pctSemAtividade}% do total`, accent: 'warning' },
  ];

  const pinnedDefs   = cardDefs.filter((c) => pinnedCards.includes(c.id));
  const unpinnedDefs = cardDefs.filter((c) => !pinnedCards.includes(c.id));

  return (
    <div className="dashboard">
      <div className="dashboard-sticky-top">
        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Timesheet</h1>
            <p className="dashboard-subtitle">Acompanhamento de Registros de Horas</p>
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
            {filtersOpen && (
              <TimesheetFilterBar
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
            <div style={{ gridColumn: '1 / -1' }}>
              <ColumnChart data={porResponsavelHoras} forceCollapsed={chartsCollapsed} title="Analistas" tooltipLabel="Total de horas" />
            </div>
            <StatusDonutChart data={metrics.porStatus} forceCollapsed={chartsCollapsed} />
            <RequisitoChart data={porAtividadeHoras} forceCollapsed={chartsCollapsed} title="Horas por Atividade" tooltipLabel="Total de horas" />
          </section>

          <section aria-label="Tabela de Timesheets">
            <TimesheetTable data={displayData} />
          </section>
        </main>
      )}
    </div>
  );
}
