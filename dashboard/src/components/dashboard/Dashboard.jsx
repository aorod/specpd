import { useState } from 'react';
import { Layers, AlertTriangle, FileCheck, FileMinus, RefreshCw, AlertCircle, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useUCData } from '../../hooks/useUCData.js';
import { useFilters } from '../../hooks/useFilters.js';
import { useUCMetrics } from '../../hooks/useUCMetrics.js';
import MetricCard from '../cards/MetricCard.jsx';
import FilterBar from '../filters/FilterBar.jsx';
import DonutChart from '../charts/DonutChart.jsx';
import HorizontalBarChart from '../charts/HorizontalBarChart.jsx';
import VerticalBarChart from '../charts/VerticalBarChart.jsx';
import LineChart from '../charts/LineChart.jsx';
import UCTable from '../table/UCTable.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const { data: rawData, loading, error, retry } = useUCData();
  const { filters, filteredData, toggleFilter, clearFilters, isActive, activeCount } = useFilters(rawData);
  const metrics = useUCMetrics(filteredData);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Dashboard UC</h1>
          <p className="dashboard-subtitle">Acompanhamento de Casos de Uso</p>
        </div>
        <div className="dashboard-header-right">
          {!loading && !error && (
            <button
              className={`filters-toggle-btn${sidebarOpen ? ' is-active' : ''}`}
              onClick={() => setSidebarOpen((o) => !o)}
              aria-pressed={sidebarOpen}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {activeCount > 0 && (
                <span className="filters-toggle-badge">{activeCount}</span>
              )}
            </button>
          )}
          <div className="dashboard-badge">
            <span className={`dashboard-badge-dot${loading ? ' is-loading' : ''}`} />
            {loading ? 'Carregando...' : error ? 'Erro na carga' : `${rawData.length} UCs`}
          </div>
        </div>
      </header>

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
        <div className="dashboard-body">
          <FilterBar
            data={rawData}
            filters={filters}
            toggleFilter={toggleFilter}
            clearFilters={clearFilters}
            isActive={isActive}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          <main className="dashboard-main">
            <section className="metrics-grid" aria-label="Métricas principais">
              <MetricCard icon={Layers}        label="Total de UCs"       value={metrics.totalUCs}     accent="neutral" />
              <MetricCard icon={AlertTriangle} label="Engenharia Reversa"  value={metrics.fluxoER}      detail={`${metrics.pctER}% do total`} accent="er" />
              <MetricCard icon={FileCheck}     label="Com requisito"       value={metrics.comRequisito} accent="success" />
              <MetricCard icon={FileMinus}     label="Sem requisito"       value={metrics.semRequisito} accent="warning" />
            </section>

            <section className="charts-grid" aria-label="Gráficos">
              <DonutChart normal={metrics.fluxoNormal} er={metrics.fluxoER} />
              <HorizontalBarChart data={metrics.porProduto} />
              <VerticalBarChart data={metrics.porDesigner} />
              <LineChart data={metrics.porMes} />
            </section>

            <section aria-label="Tabela de UCs">
              <UCTable data={filteredData} />
            </section>
          </main>
        </div>
      )}
    </div>
  );
}
