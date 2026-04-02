import { useState } from 'react';
import {
  RefreshCw, AlertCircle, RotateCcw, Sun, Moon,
  Layers, FileCheck, AlertTriangle, FileMinus,
  UserCheck, Pin, PinOff,
  Lightbulb, ShieldAlert, CalendarClock,
  Activity, Clock3, BellRing, Repeat2, Radar,
} from 'lucide-react';
import { useUCData } from '../hooks/useUCData.js';
import { useAnalyticsMetrics } from '../hooks/useAnalyticsMetrics.js';
import { aliasName } from '../utils/nameAliases.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import FluxoBarChart from '../components/analytics/FluxoBarChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './AnalyticsPage.css';

const MES_ABBR = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const RECOMENDACOES = [
  { priority: 'alta',  label: 'Alta',  acao: 'Criar checklist de validação pré-entrega',             produto: 'Nova Web, App Vector',   impacto: 'Redução de 30–40% em Eng. Reversa' },
  { priority: 'alta',  label: 'Alta',  acao: 'Revisar critérios de aceite em Q1 (Jan–Mar)',          produto: 'Todos',                  impacto: 'Prevenção do pico sazonal' },
  { priority: 'media', label: 'Média', acao: 'Implementar alerta automático ao atingir 2% mensal',   produto: 'Todos',                  impacto: 'Detecção precoce' },
  { priority: 'media', label: 'Média', acao: 'Mapear causas-raiz das 9 ocorrências atuais',          produto: 'Cargo Match, Nova Web',  impacto: 'Base para ação corretiva' },
  { priority: 'baixa', label: 'Baixa', acao: 'Criar dashboard de acompanhamento semanal',            produto: 'GR Vector, Vector Pay',  impacto: 'Visibilidade contínua' },
];

export default function AnalyticsPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { data: rawData, loading, error, retry } = useUCData();
  const metrics = useAnalyticsMetrics(rawData);
  const [chartsCollapsed] = useState(false);
  const [pinnedCards, setPinnedCards] = useState([]);

  const togglePin = (id) =>
    setPinnedCards((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  // ─── Derivações estratégicas ───────────────────────────────────────────────
  const produtoMaiorRisco = metrics.porProduto.size
    ? ([...metrics.porProduto.entries()].sort(([, a], [, b]) => b.fluxoER - a.fluxoER)[0]?.[0] ?? 'N/D')
    : 'N/D';

  const mesCritico = (() => {
    if (!metrics.porMes.size) return 'N/D';
    const sorted = [...metrics.porMes.entries()].sort(([, a], [, b]) => b.fluxoER - a.fluxoER);
    const key = sorted[0]?.[0] ?? '';
    const [, m] = key.split('-');
    return MES_ABBR[parseInt(m, 10) - 1] ?? key;
  })();

  const produtosEmAlerta = [...metrics.porProduto.values()]
    .filter(v => v.total > 0 && (v.fluxoER / v.total) > 0.03).length;

  // ─── Definição unificada dos cards ────────────────────────────────────────
  const allCardDefs = [
    { id: 'total',  type: 'metric', icon: Layers,        label: 'Total de Casos de Uso', value: metrics.totalUCs,     detail: null,                              accent: 'neutral' },
    { id: 'normal', type: 'metric', icon: FileCheck,     label: 'Fluxo Normal',          value: metrics.fluxoNormal,  detail: `${metrics.pctNormal}% do total`,  accent: 'success' },
    { id: 'er',     type: 'metric', icon: AlertTriangle, label: 'Engenharia Reversa',    value: metrics.fluxoER,      detail: `${metrics.pctER}% do total`,      accent: 'er'      },
    { id: 'semReq', type: 'metric', icon: FileMinus,     label: 'Sem Documentação',      value: metrics.semRequisito, detail: null,                              accent: 'warning' },
    { id: 'risco',  type: 'text',   icon: ShieldAlert,   label: 'Produto de Maior Risco', textValue: produtoMaiorRisco, detail: 'maior nº de Eng. Reversa',       accent: 'er'      },
    { id: 'mes',    type: 'text',   icon: CalendarClock, label: 'Mês Crítico',            textValue: mesCritico,        detail: 'pico histórico de Eng. Reversa', accent: 'warning' },
  ];

  const pinnedDefs   = allCardDefs.filter((c) => pinnedCards.includes(c.id));
  const unpinnedDefs = allCardDefs.filter((c) => !pinnedCards.includes(c.id));

  // ─── Renderizador unificado de cards ──────────────────────────────────────
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
          aria-label={pinned ? 'Desafixar card' : 'Fixar card no topo'}
        >
          {pinned ? <PinOff size={13} /> : <Pin size={13} />}
        </button>
      </div>
    );
  };

  return (
    <div className="analytics-page">
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
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>

        {!loading && !error && pinnedDefs.length > 0 && (
          <div className="pinned-cards-row">
            {pinnedDefs.map((card) => renderCard(card, true))}
          </div>
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
        <main className="analytics-main">

          {/* ─── Métricas ──────────────────────────────────────────────────────── */}
          {unpinnedDefs.length > 0 && (
            <section className="metrics-grid" aria-label="Métricas">
              {unpinnedDefs.map((card) => renderCard(card, false))}
            </section>
          )}

          {/* ─── Responsável × Produto ────────────────────────────────────────── */}
          <section className="analytics-2col">
            <FluxoBarChart
              title="Fluxo por Responsável (Dono do Work Item)"
              icon={UserCheck}
              data={metrics.porResponsavel}
              formatLabel={aliasName}
              forceCollapsed={chartsCollapsed}
            />
            <FluxoBarChart
              title="Fluxo por Produto"
              icon={Layers}
              data={metrics.porProduto}
              forceCollapsed={chartsCollapsed}
            />
          </section>

          {/* ─── Evolução temporal ────────────────────────────────────────────── */}
          <LineChart data={metrics.porMes} anos={[]} title="Evolução por Fluxo" dotRadius={2.5} forceCollapsed={chartsCollapsed} />

          {/* ════════════════════════════════════════════════════════════════════
              ANÁLISE ESTRATÉGICA — ENGENHARIA REVERSA
          ════════════════════════════════════════════════════════════════════ */}
          <div className="er-section-divider" role="separator">
            <span className="er-section-divider-label">Análise Estratégica — Engenharia Reversa</span>
          </div>

          {/* ─── Insights analíticos ──────────────────────────────────────────── */}
          <section className="analytics-3col" aria-label="Insights Analíticos">

            <div className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-icon-wrap insight-card-icon-wrap--er">
                  <AlertTriangle size={15} />
                </span>
                <h3 className="insight-card-title">Diagnóstico</h3>
              </div>
              <p className="insight-card-body">
                O volume de <strong>1,9%</strong> de Eng. Reversa representa baixa incidência absoluta,
                mas alta criticidade operacional. Cada ocorrência implica retrabalho técnico não
                planejado, impactando diretamente a velocidade de entrega.
              </p>
            </div>

            <div className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-icon-wrap insight-card-icon-wrap--warning">
                  <ShieldAlert size={15} />
                </span>
                <h3 className="insight-card-title">Risco por Produto</h3>
              </div>
              <p className="insight-card-body">
                <strong>Nova Web</strong> concentra o maior risco relativo dado seu alto volume
                (144 demandas) combinado com complexidade de integração. <strong>App Vector</strong> lidera
                em volume total (175), tornando qualquer aumento percentual crítico em escala.
              </p>
            </div>

            <div className="insight-card">
              <div className="insight-card-header">
                <span className="insight-card-icon-wrap insight-card-icon-wrap--info">
                  <Lightbulb size={15} />
                </span>
                <h3 className="insight-card-title">Sazonalidade</h3>
              </div>
              <p className="insight-card-body">
                Pico em <strong>Março</strong> pode indicar acúmulo pós-onboarding de início de ano ou
                mudanças de requisitos em Q1. A queda consistente de <strong>Jun–Out</strong> sugere
                estabilidade operacional no mid-year. Monitorar <strong>Jan–Mar</strong> como janela
                de risco prioritária.
              </p>
            </div>

          </section>

          {/* ─── Recomendações estratégicas ───────────────────────────────────── */}
          <section className="er-section-card" aria-label="Recomendações Estratégicas">
            <h3 className="er-section-card-title">Recomendações Estratégicas</h3>
            <div className="recom-table-wrapper">
              <table className="recom-table">
                <thead>
                  <tr>
                    <th>Prioridade</th>
                    <th>Ação</th>
                    <th>Produto Alvo</th>
                    <th>Impacto Esperado</th>
                  </tr>
                </thead>
                <tbody>
                  {RECOMENDACOES.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <span className={`recom-priority recom-priority--${r.priority}`}>
                          {r.label}
                        </span>
                      </td>
                      <td>{r.acao}</td>
                      <td className="recom-td-produto">{r.produto}</td>
                      <td className="recom-td-impacto">{r.impacto}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ─── KPIs de monitoramento ────────────────────────────────────────── */}
          <section aria-label="KPIs de Monitoramento">
            <h3 className="er-section-card-title er-section-card-title--standalone">KPIs de Monitoramento</h3>
            <div className="monitoring-grid">

              <div className={`monitoring-kpi${parseFloat(metrics.pctER) > 1.5 ? ' monitoring-kpi--alert' : ' monitoring-kpi--ok'}`}>
                <div className="monitoring-kpi-icon"><Activity size={16} /></div>
                <span className="monitoring-kpi-label">Taxa Mensal de Eng. Reversa</span>
                <span className="monitoring-kpi-value">{metrics.pctER}%</span>
                <span className="monitoring-kpi-meta">Meta: &lt; 1,5%</span>
                {parseFloat(metrics.pctER) > 1.5 && (
                  <span className="monitoring-kpi-badge monitoring-kpi-badge--alert">Acima da meta</span>
                )}
              </div>

              <div className="monitoring-kpi monitoring-kpi--neutral">
                <div className="monitoring-kpi-icon"><Clock3 size={16} /></div>
                <span className="monitoring-kpi-label">Tempo Médio de Resolução</span>
                <span className="monitoring-kpi-value">N/D</span>
                <span className="monitoring-kpi-meta">Meta: definir baseline</span>
              </div>

              <div className={`monitoring-kpi${produtosEmAlerta > 0 ? ' monitoring-kpi--alert' : ' monitoring-kpi--ok'}`}>
                <div className="monitoring-kpi-icon"><BellRing size={16} /></div>
                <span className="monitoring-kpi-label">Produtos em Alerta</span>
                <span className="monitoring-kpi-value">{produtosEmAlerta}</span>
                <span className="monitoring-kpi-meta">Meta: 0 produtos &gt; 3%</span>
                {produtosEmAlerta > 0 && (
                  <span className="monitoring-kpi-badge monitoring-kpi-badge--alert">{produtosEmAlerta} em alerta</span>
                )}
              </div>

              <div className="monitoring-kpi monitoring-kpi--neutral">
                <div className="monitoring-kpi-icon"><Repeat2 size={16} /></div>
                <span className="monitoring-kpi-label">Reincidência por Produto</span>
                <span className="monitoring-kpi-value">N/D</span>
                <span className="monitoring-kpi-meta">Meta: 0% reincidência</span>
              </div>

              <div className="monitoring-kpi monitoring-kpi--neutral">
                <div className="monitoring-kpi-icon"><Radar size={16} /></div>
                <span className="monitoring-kpi-label">Índice de Detecção Precoce</span>
                <span className="monitoring-kpi-value">N/D</span>
                <span className="monitoring-kpi-meta">Meta: &gt; 80% antes do aceite</span>
              </div>

            </div>
          </section>

        </main>
      )}
    </div>
  );
}
