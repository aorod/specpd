import { useState, useMemo } from 'react';
import { CalendarClock, Clock, TrendingDown, CalendarCheck, RefreshCw, AlertCircle, RotateCcw, SlidersHorizontal, Sun, Moon } from 'lucide-react';
import { formatHoras } from '../utils/formatters.js';
import { useTimesheetData } from '../hooks/useTimesheetData.js';
import { useTimesheetFilters } from '../hooks/useTimesheetFilters.js';
import { useTimesheetMetrics } from '../hooks/useTimesheetMetrics.js';
import { useWorkdaysCalc } from '../hooks/useWorkdaysCalc.js';
import { useDayOffs } from '../hooks/useDayOffs.js';
import { useFerias } from '../hooks/useFerias.js';
import { aliasName } from '../utils/nameAliases.js';
import { calcDiasUteisNoIntervalo } from '../utils/calcDiasUteis.js';
import MetricCard from '../components/cards/MetricCard.jsx';
import TimesheetFilterBar from '../components/filters/TimesheetFilterBar.jsx';
import StatusDonutChart from '../components/charts/StatusDonutChart.jsx';
import ColumnChart from '../components/charts/ColumnChart.jsx';
import RequisitoChart from '../components/charts/RequisitoChart.jsx';
import TimesheetTable from '../components/table/TimesheetTable.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './UseCasePage.css';

export default function TimesheetPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { data: rawData, loading, error, retry } = useTimesheetData();
  const { filters, filteredData, toggleFilter, setSingleFilter, clearFilters, clearFilter, isActive, activeCount } = useTimesheetFilters(rawData);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pinnedCards, setPinnedCards] = useState([]);
  const [chartsCollapsed, setChartsCollapsed] = useState(false);
  const [selectedAnalista, setSelectedAnalista] = useState(null);

  const displayData = useMemo(() => {
    if (!search.trim()) return filteredData;
    const term = search.toLowerCase();
    return filteredData.filter((d) => d.title.toLowerCase().includes(term));
  }, [filteredData, search]);

  const metrics = useTimesheetMetrics(displayData);
  const { horasPorDia, diasUteis, totalHorasMes, diasUteisAteHoje, nationalByAno, pontoFacDates, anosEfetivos, mesesEfetivos } = useWorkdaysCalc(filters);
  const { registros: dayoffs } = useDayOffs();
  const { registros: ferias }  = useFerias();

  const porResponsavelHoras = useMemo(() => {
    const map = new Map();
    for (const [key, val] of metrics.porResponsavel.entries()) {
      map.set(key, { total: parseFloat(val.totalEffort.toFixed(2)) });
    }
    return map;
  }, [metrics.porResponsavel]);

  const porAtividadeHoras = useMemo(() => {
    const map = new Map();
    for (const [key, val] of metrics.porAtividade.entries()) {
      map.set(key, { total: parseFloat(val.totalEffort.toFixed(2)) });
    }
    return map;
  }, [metrics.porAtividade]);

  // ── Meta por Analista (considerando DayOffs e Férias) ───────────────────────
  const metaAnalistaLines = useMemo(() => {
    const hoje        = new Date();
    const currentYear = hoje.getFullYear();
    const currentMes  = hoje.getMonth() + 1;
    const currentDay  = hoje.getDate();

    const metaMesMap = new Map(); // key (fullName) → metaHoras do mês
    const metaDiaMap = new Map(); // key (fullName) → metaHoras até hoje

    for (const [key] of porResponsavelHoras) {
      const alias = aliasName(key);
      let deductedMes    = 0;
      let deductedAteHoj = 0;

      for (const ano of anosEfetivos) {
        const anoNum       = parseInt(ano, 10);
        const nationalDates = nationalByAno[ano] ?? [];

        for (const mes of mesesEfetivos) {
          const mesNum  = parseInt(mes, 10);
          const isPast  = anoNum < currentYear || (anoNum === currentYear && mesNum < currentMes);
          const isCurr  = anoNum === currentYear && mesNum === currentMes;

          const deductRange = (inicio, fim) => {
            deductedMes += calcDiasUteisNoIntervalo(inicio, fim, anoNum, mesNum, nationalDates, pontoFacDates);
            if (isPast) {
              deductedAteHoj += calcDiasUteisNoIntervalo(inicio, fim, anoNum, mesNum, nationalDates, pontoFacDates);
            } else if (isCurr) {
              deductedAteHoj += calcDiasUteisNoIntervalo(inicio, fim, anoNum, mesNum, nationalDates, pontoFacDates, currentDay);
            }
          };

          for (const d of dayoffs) {
            if (d.analista !== alias) continue;
            deductRange(d.dataInicio, d.dataFim);
          }
          for (const f of ferias) {
            if (f.analista !== alias) continue;
            if (f.status?.startsWith('Recusado')) continue; // ignorar férias recusadas
            deductRange(f.dataInicio, f.dataFim);
          }
        }
      }

      const diasMes = Math.max(0, diasUteis - deductedMes);
      const diasHoj = Math.max(0, diasUteisAteHoje - deductedAteHoj);
      metaMesMap.set(key, parseFloat((diasMes * horasPorDia).toFixed(2)));
      metaDiaMap.set(key, parseFloat((diasHoj * horasPorDia).toFixed(2)));
    }

    return { metaMesMap, metaDiaMap };
  }, [porResponsavelHoras, dayoffs, ferias, anosEfetivos, mesesEfetivos, nationalByAno, pontoFacDates, diasUteis, diasUteisAteHoje, horasPorDia]);

  // ── Analistas ausentes hoje (férias / atestado / day off) — apenas no mês vigente ──
  const analistasAusentesNoPeriodo = useMemo(() => {
    const hoje = new Date();
    const anoAtual = String(hoje.getFullYear());
    const mesAtual = String(hoje.getMonth() + 1).padStart(2, '0');

    // Só aplica a coloração se o filtro incluir o mês/ano atual
    const filtrandoMesAtual =
      filters.anos.includes(anoAtual) && filters.meses.includes(mesAtual);

    if (!filtrandoMesAtual) return new Set();

    const hojeISO = `${anoAtual}-${mesAtual}-${String(hoje.getDate()).padStart(2, '0')}`;
    const ausentes = new Set();

    for (const [key] of porResponsavelHoras) {
      const alias = aliasName(key);

      const temFerias = ferias.some((f) =>
        f.analista === alias &&
        !f.status?.startsWith('Recusado') &&
        f.dataInicio <= hojeISO && f.dataFim >= hojeISO
      );
      const temDayoff = dayoffs.some((d) =>
        d.analista === alias &&
        d.dataInicio <= hojeISO && d.dataFim >= hojeISO
      );

      if (temFerias || temDayoff) ausentes.add(key);
    }

    return ausentes;
  }, [porResponsavelHoras, ferias, dayoffs, filters.anos, filters.meses]);

  // ── Dados de Férias/Atestado/DayOff para tooltip do gráfico de Analistas ───────
  const tooltipAnalistaData = useMemo(() => {
    const map = new Map();

    const calcDiasPeriodo = (dataInicio, dataFim) => {
      let total = 0;
      for (const ano of anosEfetivos) {
        const anoNum   = parseInt(ano, 10);
        const national = nationalByAno[ano] ?? [];
        for (const mes of mesesEfetivos) {
          total += calcDiasUteisNoIntervalo(dataInicio, dataFim, anoNum, parseInt(mes, 10), national, pontoFacDates);
        }
      }
      return total;
    };

    const processRecords = (records) =>
      records
        .map((r) => {
          const dias = calcDiasPeriodo(r.dataInicio, r.dataFim);
          return { dataInicio: r.dataInicio, dataFim: r.dataFim, dias, horas: parseFloat((dias * horasPorDia).toFixed(2)) };
        })
        .filter((r) => r.dias > 0);

    for (const [key] of porResponsavelHoras) {
      const alias = aliasName(key);

      const feriasList    = processRecords(ferias.filter((f) => f.analista === alias && !f.status?.startsWith('Recusado')));
      const atestadosList = processRecords(dayoffs.filter((d) => d.analista === alias && d.tipoAbono === 'Atestado'));
      const dayoffsList   = processRecords(dayoffs.filter((d) => d.analista === alias && d.tipoAbono === 'Day Off'));

      if (feriasList.length > 0 || atestadosList.length > 0 || dayoffsList.length > 0) {
        map.set(key, { ferias: feriasList, atestados: atestadosList, dayoffs: dayoffsList });
      }
    }

    return map;
  }, [porResponsavelHoras, ferias, dayoffs, anosEfetivos, mesesEfetivos, nationalByAno, pontoFacDates, horasPorDia]);

  const togglePin = (id) =>
    setPinnedCards((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);

  const handleSelectAnalista = (key) => {
    setSelectedAnalista(key);
    if (key) {
      setSingleFilter('responsaveis', key);
    } else {
      clearFilter('responsaveis');
    }
  };

  // ── Analistas ativos do Registro de Analistas (Configurações) ───────────────
  const analistasAtivos = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('config_analistas') || '[]');
      const ativos = list.filter((a) => a.ativo !== false);
      if (filters.equipes.length > 0) {
        return ativos.filter((a) => filters.equipes.includes(a.equipe));
      }
      return ativos;
    } catch {
      return [];
    }
  }, [filters.equipes]);

  const numAnalistas        = analistasAtivos.length || metrics.porResponsavel.size;
  const totalHorasMesEquipe = parseFloat((totalHorasMes * Math.max(numAnalistas, 1)).toFixed(2));
  const totalHorasRealizadas = parseFloat(metrics.totalEffort.toFixed(2));

  // Horas realizadas considerando apenas ANO, MÊS e EQUIPE (ignora PRODUTO, STATUS, ATIVIDADE, ANALISTA)
  const totalHorasRealizadasBase = useMemo(() => {
    const base = rawData.filter((item) => {
      if (filters.anos.length > 0   && !filters.anos.includes(item.ano))    return false;
      if (filters.meses.length > 0  && !filters.meses.includes(item.mes))   return false;
      if (filters.equipes.length > 0) {
        const val = item.equipe || 'Sem Equipe';
        if (!filters.equipes.includes(val)) return false;
      }
      return true;
    });
    return parseFloat(base.reduce((sum, item) => sum + (typeof item.effort === 'number' ? item.effort : 0), 0).toFixed(2));
  }, [rawData, filters.anos, filters.meses, filters.equipes]);

  const totalHorasFaltantes  = parseFloat((totalHorasMesEquipe - totalHorasRealizadasBase).toFixed(2));
  const pctConcluido = totalHorasMesEquipe > 0
    ? parseFloat(((totalHorasRealizadasBase / totalHorasMesEquipe) * 100).toFixed(2))
    : 0;

  const analLabel = filters.equipes.length === 1
    ? `${filters.equipes[0]} · ${numAnalistas} analista${numAnalistas !== 1 ? 's' : ''}`
    : filters.equipes.length > 1
    ? filters.equipes.join(' · ') + ` · ${numAnalistas} analista${numAnalistas !== 1 ? 's' : ''}`
    : numAnalistas === 1 ? '1 analista' : `${numAnalistas} analistas`;

  const totalHorasFechamento = parseFloat((diasUteisAteHoje * horasPorDia).toFixed(2));
  const hoje = new Date();
  const hojeFormatado = hoje.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  // ── Dados para tooltip do card Total Horas/Mês ──────────────────────────────
  const tooltipHorasMes = useMemo(() => {
    const calcDias = (dataInicio, dataFim) => {
      let total = 0;
      for (const ano of anosEfetivos) {
        const anoNum   = parseInt(ano, 10);
        const national = nationalByAno[ano] ?? [];
        for (const mes of mesesEfetivos) {
          total += calcDiasUteisNoIntervalo(dataInicio, dataFim, anoNum, parseInt(mes, 10), national, pontoFacDates);
        }
      }
      return total;
    };

    let feriasD = 0, atestadoD = 0, dayoffD = 0;

    for (const a of analistasAtivos) {
      const alias = a.nome;
      for (const f of ferias) {
        if (f.analista !== alias) continue;
        if (f.status?.startsWith('Recusado')) continue;
        feriasD += calcDias(f.dataInicio, f.dataFim);
      }
      for (const d of dayoffs) {
        if (d.analista !== alias) continue;
        if (d.tipoAbono === 'Atestado') atestadoD += calcDias(d.dataInicio, d.dataFim);
        else if (d.tipoAbono === 'Day Off') dayoffD += calcDias(d.dataInicio, d.dataFim);
      }
    }

    const feriasH    = parseFloat((feriasD    * horasPorDia).toFixed(2));
    const atestadoH  = parseFloat((atestadoD  * horasPorDia).toFixed(2));
    const dayoffH    = parseFloat((dayoffD    * horasPorDia).toFixed(2));

    // Pares lado a lado (2 colunas no tooltip)
    const rows = [
      [
        { label: 'Nº Analistas',       value: numAnalistas },
        { label: 'Horas Base',         value: `${horasPorDia}h` },
      ],
      [
        { label: 'Total Original (h)', value: formatHoras(parseFloat((diasUteis * numAnalistas * horasPorDia).toFixed(2))) },
        { label: 'Total Original (d)', value: diasUteis },
      ],
    ];

    if (feriasD > 0 || feriasH > 0) {
      rows.push([
        { label: 'Férias (h)', value: formatHoras(feriasH) },
        { label: 'Férias (d)', value: feriasD },
      ]);
    }
    if (atestadoD > 0 || atestadoH > 0) {
      rows.push([
        { label: 'Atestados (h)', value: formatHoras(atestadoH) },
        { label: 'Atestados (d)', value: atestadoD },
      ]);
    }
    if (dayoffD > 0 || dayoffH > 0) {
      rows.push([
        { label: 'Day Off (h)', value: formatHoras(dayoffH) },
        { label: 'Day Off (d)', value: dayoffD },
      ]);
    }

    return rows;
  }, [analistasAtivos, ferias, dayoffs, anosEfetivos, mesesEfetivos, nationalByAno, pontoFacDates, diasUteis, horasPorDia, numAnalistas]);

  const metaDiaCard = selectedAnalista
    ? metaAnalistaLines.metaDiaMap.get(selectedAnalista) ?? 0
    : totalHorasFechamento;

  const cardDefs = [
    {
      id:      'horasMes',
      icon:    CalendarClock,
      label:   'Total Horas/Mês',
      value:   formatHoras(totalHorasMesEquipe),
      detail:  diasUteis > 0 ? `${diasUteis} dias úteis · ${analLabel}` : 'calculando…',
      accent:  'neutral',
      tooltip: tooltipHorasMes,
    },
    {
      id:     'horasRealizadas',
      icon:   Clock,
      label:  'Total Horas Realizadas',
      value:  formatHoras(totalHorasRealizadas),
      detail: 'horas registradas',
      accent: 'success',
    },
    {
      id:     'horasFaltantes',
      icon:   TrendingDown,
      label:  'Total Horas Faltantes',
      value:  formatHoras(-totalHorasFaltantes),
      detail: totalHorasMesEquipe > 0 ? `${pctConcluido}% concluído · ${analLabel}` : null,
      accent: totalHorasFaltantes > 0 ? 'er' : 'success',
    },
    {
      id:     'fechamento',
      icon:   CalendarCheck,
      label:  selectedAnalista ? `Meta do Dia · ${aliasName(selectedAnalista)}` : 'Meta do Dia',
      value:  diasUteisAteHoje > 0 ? formatHoras(metaDiaCard) : '--',
      detail: `${hojeFormatado}${diasUteisAteHoje > 0 ? ` · ${diasUteisAteHoje} dias úteis` : ''}`,
      accent: 'info',
    },
  ];

  const pinnedDefs   = cardDefs.filter((c) => pinnedCards.includes(c.id));
  const unpinnedDefs = cardDefs.filter((c) => !pinnedCards.includes(c.id));

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
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>

        {!loading && !error && (
          <>
            {filtersOpen && (
              <TimesheetFilterBar
                data={rawData}
                filters={filters}
                toggleFilter={toggleFilter}
                setSingleFilter={setSingleFilter}
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
                    tooltip={card.tooltip}
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
                  tooltip={card.tooltip}
                  pinned={false}
                  onTogglePin={() => togglePin(card.id)}
                />
              ))}
            </section>
          )}

          <section className="charts-grid" aria-label="Gráficos">
            <div style={{ gridColumn: '1 / -1' }}>
              <ColumnChart
                data={porResponsavelHoras}
                forceCollapsed={chartsCollapsed}
                title="Analistas"
                tooltipLabel="Total de horas"
                tooltipData={tooltipAnalistaData}
                ausentesHoje={analistasAusentesNoPeriodo}
                onSelectKey={handleSelectAnalista}
                perColumnLines={[
                  {
                    // Meta do Mês individual: (diasUteis - dayoffs - férias) × horasPorDia
                    values: metaAnalistaLines.metaMesMap,
                    color: '#3b82f6',
                    label: 'Meta do Mês',
                  },
                  ...(diasUteisAteHoje > 0 ? [{
                    // Meta do Dia individual: (diasUteisAteHoje - dayoffs - férias até hoje) × horasPorDia
                    values: metaAnalistaLines.metaDiaMap,
                    color: '#22c55e',
                    label: 'Meta do Dia',
                    showLabels: false,
                  }] : []),
                ]}
              />
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
