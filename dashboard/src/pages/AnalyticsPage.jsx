import { useState } from 'react';
import { RefreshCw, AlertCircle, RotateCcw, Sun, Moon, Layers, FileCheck, AlertTriangle, FileMinus, Users, UserCheck, BookOpen } from 'lucide-react';
import { useUCData } from '../hooks/useUCData.js';
import { useAnalyticsMetrics } from '../hooks/useAnalyticsMetrics.js';
import { aliasName } from '../utils/nameAliases.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import FluxoBarChart from '../components/analytics/FluxoBarChart.jsx';
import StatusChart from '../components/analytics/StatusChart.jsx';
import DonutChart from '../components/charts/DonutChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import './AnalyticsPage.css';

export default function AnalyticsPage({ theme, setTheme }) {
  const { data: rawData, loading, error, retry } = useUCData();
  const metrics = useAnalyticsMetrics(rawData);
  const [chartsCollapsed] = useState(false);

  const cardDefs = [
    { id: 'total',  icon: Layers,        label: 'Total de Casos de Uso', value: metrics.totalUCs,     detail: null,                              accent: 'neutral' },
    { id: 'normal', icon: FileCheck,     label: 'Fluxo Normal',          value: metrics.fluxoNormal,  detail: `${metrics.pctNormal}% do total`,  accent: 'success' },
    { id: 'er',     icon: AlertTriangle, label: 'Engenharia Reversa',    value: metrics.fluxoER,      detail: `${metrics.pctER}% do total`,      accent: 'er'      },
    { id: 'semReq', icon: FileMinus,     label: 'Sem Documentação',      value: metrics.semRequisito, detail: null,                              accent: 'warning' },
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-sticky-top">
        <header className="analytics-header">
          <div>
            <h1 className="analytics-title">Analytics</h1>
            <p className="analytics-subtitle">Visão estratégica dos Casos de Uso</p>
          </div>
          <div className="analytics-header-right">
            {!loading && (
              <button className="refresh-btn" onClick={retry} disabled={loading} title="Atualizar dados">
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                Atualizar
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
        <main className="analytics-main">
          {/* Métricas */}
          <section className="metrics-grid" aria-label="Métricas">
            {cardDefs.map((card) => (
              <MetricCard
                key={card.id}
                icon={card.icon}
                label={card.label}
                value={card.value}
                detail={card.detail}
                accent={card.accent}
                pinned={false}
                onTogglePin={() => {}}
              />
            ))}
          </section>

          {/* Fluxo geral + Status */}
          <section className="analytics-2col">
            <DonutChart normal={metrics.fluxoNormal} er={metrics.fluxoER} forceCollapsed={chartsCollapsed} />
            <StatusChart data={metrics.porEstado} forceCollapsed={chartsCollapsed} />
          </section>

          {/* Responsável × Fluxo */}
          <FluxoBarChart
            title="Fluxo por Responsável (Dono do Work Item)"
            icon={UserCheck}
            data={metrics.porResponsavel}
            formatLabel={aliasName}
            forceCollapsed={chartsCollapsed}
          />

          {/* Designer × Fluxo */}
          <FluxoBarChart
            title="Fluxo por Designer"
            icon={Users}
            data={metrics.porDesignerFluxo}
            formatLabel={aliasName}
            forceCollapsed={chartsCollapsed}
          />

          {/* Requisito × Fluxo */}
          <FluxoBarChart
            title="Fluxo por Requisito"
            icon={BookOpen}
            data={metrics.porRequisitoFluxo}
            formatLabel={aliasName}
            forceCollapsed={chartsCollapsed}
          />

          {/* Produto × Fluxo */}
          <FluxoBarChart
            title="Fluxo por Produto"
            icon={Layers}
            data={metrics.porProduto}
            forceCollapsed={chartsCollapsed}
          />

          {/* Evolução temporal */}
          <LineChart data={metrics.porMes} anos={[]} forceCollapsed={chartsCollapsed} />
        </main>
      )}
    </div>
  );
}
