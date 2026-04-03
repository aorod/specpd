import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Sun, Moon, Trash2, Pencil, X, Settings2,
  RotateCcw, ChevronLeft, ChevronRight, CalendarDays, Info, Check,
} from 'lucide-react';
import { ANALISTAS } from '../utils/nameAliases.js';
import { EQUIPE_MAP } from '../utils/equipeList.js';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import { useFerias } from '../hooks/useFerias.js';
import './DayOffPage.css';
import './FeriasPage.css';

// ── Constants ──────────────────────────────────────────────────────────────────
const TOTAL_FERIAS_DIAS = 30;

const FERIADOS = new Set([
  '2025-01-01','2025-04-18','2025-04-21','2025-05-01','2025-06-19',
  '2025-09-07','2025-10-12','2025-11-02','2025-11-15','2025-11-20','2025-12-25',
  '2026-01-01','2026-04-03','2026-04-21','2026-05-01','2026-06-04',
  '2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25',
]);

const MESES_PT = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

const MESES_PT_ABREV = [
  'JAN','FEV','MAR','ABR','MAI','JUN',
  'JUL','AGO','SET','OUT','NOV','DEZ',
];

const DIAS_SEMANA = ['DOM.','SEG.','TER.','QUA.','QUI.','SEX.','SÁB.'];

const STATUS_FERIAS = [
  'Em Aprovação Gestor',
  'Em Aprovação RH',
  'Em Aprovação Financeiro',
  'Aprovado',
  'Recusado pelo Gestor',
  'Recusado pelo RH',
  'Recusado pelo Financeiro',
];

const STATUS_VARIANT = {
  'Em Aprovação Gestor':      'status-pending-gestor',
  'Em Aprovação RH':          'status-pending-rh',
  'Em Aprovação Financeiro':  'status-pending-fin',
  'Aprovado':                 'status-aprovado',
  'Recusado pelo Gestor':     'status-recusado',
  'Recusado pelo RH':         'status-recusado',
  'Recusado pelo Financeiro': 'status-recusado',
};

// ── Helpers ────────────────────────────────────────────────────────────────────
function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function calcDiasCorridos(isoInicio, isoFim) {
  if (!isoInicio || !isoFim) return 0;
  const [yi,mi,di] = isoInicio.split('-').map(Number);
  const [yf,mf,df] = isoFim.split('-').map(Number);
  const start = new Date(yi, mi-1, di);
  const end   = new Date(yf, mf-1, df);
  if (end < start) return 0;
  return Math.floor((end - start) / 86400000) + 1;
}


function formatDate(iso) {
  if (!iso) return '';
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── GearMenu ───────────────────────────────────────────────────────────────────
function GearMenu({ onEditar, onRemover }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
    setOpen(o => !o);
  }

  return (
    <div className="gear-root">
      <button ref={btnRef} className={`gear-btn${open ? ' is-open' : ''}`} onClick={handleOpen} title="Ações">
        <Settings2 size={15} />
      </button>
      {open && (
        <div ref={dropRef} className="gear-dropdown" style={{ top: pos.top, left: pos.left }}>
          <button className="gear-item gear-item--edit" onClick={() => { onEditar(); setOpen(false); }}>
            <Pencil size={13} />Editar
          </button>
          <button className="gear-item gear-item--remove" onClick={() => { onRemover(); setOpen(false); }}>
            <Trash2 size={13} />Remover
          </button>
        </div>
      )}
    </div>
  );
}

// ── ReqItem ────────────────────────────────────────────────────────────────────
function ReqItem({ ok, text }) {
  return (
    <div className={`fmodal-req-item${ok === true ? ' fmodal-req-item--ok' : ok === false ? ' fmodal-req-item--err' : ''}`}>
      <span className="fmodal-req-icon">
        {ok === true  ? <Check size={13} /> :
         ok === false ? <X size={13} /> :
         <span className="fmodal-req-bullet" />}
      </span>
      <span className="fmodal-req-text">{text}</span>
    </div>
  );
}

// ── MonthCalendar ──────────────────────────────────────────────────────────────
function MonthCalendar({ year, month, displayStart, displayEnd, onDayClick, onDayHover, minDate }) {
  const todayStr = toISODate(new Date());

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function getDayStr(d) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  const effectiveEnd = displayEnd && displayEnd > displayStart ? displayEnd : null;

  return (
    <div className="fcal-month">
      <div className="fcal-weekdays">
        {DIAS_SEMANA.map(d => <span key={d} className="fcal-weekday">{d}</span>)}
      </div>
      <div className="fcal-grid">
        {cells.map((d, i) => {
          if (!d) return <span key={`e${i}`} className="fcal-cell fcal-cell--empty" />;
          const ds        = getDayStr(d);
          const isDisabled = minDate && ds < minDate;
          const isHoliday = FERIADOS.has(ds);
          const isStart   = ds === displayStart;
          const isEnd     = ds === effectiveEnd;
          const inRange   = displayStart && effectiveEnd && ds > displayStart && ds < effectiveEnd;
          const isEdge    = isStart || isEnd;
          const isToday   = ds === todayStr && !isEdge;

          if (isDisabled) {
            return (
              <span key={d} className="fcal-cell fcal-cell--disabled">
                {d}
              </span>
            );
          }

          let cls = 'fcal-cell';
          if (inRange)   cls += ' fcal-cell--range';
          if (isStart && effectiveEnd) cls += ' fcal-cell--range-start';
          if (isEnd   && displayStart) cls += ' fcal-cell--range-end';
          if (isEdge)    cls += ' fcal-cell--selected';
          else if (isToday) cls += ' fcal-cell--today';

          return (
            <span
              key={d}
              className={cls}
              onClick={() => onDayClick(ds)}
              onMouseEnter={() => onDayHover && onDayHover(ds)}
            >
              {d}
              {isHoliday && <span className="fcal-holiday-dot" />}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── SolicitarFeriasModal ───────────────────────────────────────────────────────
function SolicitarFeriasModal({ analistaAlias, saldo, registros, onSolicitar, onClose, initialData, excludeId }) {
  const today    = new Date();
  const todayStr = toISODate(today);
  const isEditing = !!initialData;

  const minAllowedDate = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 35);
    return toISODate(d);
  }, []);

  const initCalendar = useMemo(() => {
    if (initialData?.dataInicio) {
      const [y, m] = initialData.dataInicio.split('-').map(Number);
      return { year: y, month: m - 1 };
    }
    const d = new Date(today); d.setDate(d.getDate() + 35);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, []);

  const [calYear,  setCalYear]  = useState(initCalendar.year);
  const [calMonth, setCalMonth] = useState(initCalendar.month);
  const [rangeStart,   setRangeStart]   = useState(initialData?.dataInicio ?? null);
  const [rangeEnd,     setRangeEnd]     = useState(initialData?.dataFim    ?? null);
  const [hoverDate,    setHoverDate]    = useState(null);
  const [vendaFerias,  setVendaFerias]  = useState(false);
  const [antecipar13,  setAntecipar13]  = useState(false);
  const [justificativa, setJustificativa] = useState(initialData?.justificativa ?? '');

  const rightMonth    = calMonth === 11 ? 0  : calMonth + 1;
  const rightYear     = calMonth === 11 ? calYear + 1 : calYear;
  const prevMonth     = calMonth === 0  ? 11 : calMonth - 1;
  const nextNextMonth = rightMonth === 11 ? 0  : rightMonth + 1;

  const diasCorridosSelecionados = useMemo(() => calcDiasCorridos(rangeStart, rangeEnd), [rangeStart, rangeEnd]);
  const saldoDisponivel          = vendaFerias ? Math.max(0, saldo - 10) : saldo;
  const diasRestantes            = saldoDisponivel - diasCorridosSelecionados;

  const displayStart = rangeStart;
  const displayEnd   = rangeEnd
    ? rangeEnd
    : (rangeStart && hoverDate && hoverDate > rangeStart ? hoverDate : null);

  const requirements = useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;

    const startDate = new Date(rangeStart + 'T00:00:00');
    const endDate   = new Date(rangeEnd   + 'T00:00:00');
    const todayDate = new Date(todayStr   + 'T00:00:00');

    const d1 = new Date(startDate); d1.setDate(d1.getDate() + 1);
    const d2 = new Date(startDate); d2.setDate(d2.getDate() + 2);
    const notAntesDeHoliday = !FERIADOS.has(toISODate(d1)) && !FERIADOS.has(toISODate(d2));

    const existingMax = registros
      .filter(r => r.analista === analistaAlias && r.id !== excludeId)
      .reduce((max, r) => Math.max(max, calcDiasCorridos(r.dataInicio, r.dataFim)), 0);

    const hasOverlap = registros
      .filter(r => r.analista === analistaAlias && r.id !== excludeId)
      .some(r => {
        const rStart = new Date(r.dataInicio + 'T00:00:00');
        const rEnd   = new Date(r.dataFim   + 'T00:00:00');
        return startDate <= rEnd && endDate >= rStart;
      });

    const startDay = startDate.getDay();
    const diffDays = Math.floor((startDate - todayDate) / 86400000);
    const sobra    = saldoDisponivel - diasCorridosSelecionados;

    return {
      notExceedSaldo:     diasCorridosSelecionados <= saldoDisponivel,
      minimo5dias:        diasCorridosSelecionados >= 5,
      sobraMaior5:        sobra === 0 || sobra >= 5,
      notAntesDeHoliday,
      periodo14dias:      diasCorridosSelecionados >= 14 || existingMax >= 14,
      diaPermitido:       startDay >= 1 && startDay <= 3,
      notIntercede:       !hasOverlap,
      antecedencia35dias: diffDays >= 35,
    };
  }, [rangeStart, rangeEnd, diasCorridosSelecionados, saldo, saldoDisponivel, vendaFerias, registros, analistaAlias, todayStr]);

  function handleDayClick(dateStr) {
    if (dateStr < minAllowedDate) return;
    if (!rangeStart || rangeEnd) {
      setRangeStart(dateStr);
      setRangeEnd(null);
      setHoverDate(null);
    } else {
      if (dateStr <= rangeStart) {
        setRangeStart(dateStr);
        setRangeEnd(null);
      } else {
        setRangeEnd(dateStr);
        setHoverDate(null);
      }
    }
  }

  function handlePrevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }

  function handleNextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  async function handleSolicitar() {
    if (!rangeStart || !rangeEnd || diasCorridosSelecionados === 0) return;
    await onSolicitar({ dataInicio: rangeStart, dataFim: rangeEnd, vendaFerias, antecipar13, justificativa });
  }

  const canSubmit = rangeStart && rangeEnd && diasCorridosSelecionados > 0;

  return (
    <div className="fmodal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fmodal-panel">

        {/* Header */}
        <div className="fmodal-header">
          <div className="fmodal-header-title">
            <h2 className="fmodal-title">{isEditing ? 'Editar férias' : 'Solicitar férias'}</h2>
            <div className="fmodal-title-bar" />
          </div>
          <button className="fmodal-close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Stats */}
        <div className="fmodal-stats">
          <div className="fmodal-stat">
            <CalendarDays size={16} className="fmodal-stat-icon" />
            <div>
              <div className="fmodal-stat-label">SALDO{vendaFerias ? ' (−10 vendidos)' : ''}</div>
              <div className="fmodal-stat-value">{saldoDisponivel} dias</div>
            </div>
          </div>
          <div className="fmodal-stat-sep" />
          <div className="fmodal-stat">
            <CalendarDays size={16} className="fmodal-stat-icon" />
            <div>
              <div className="fmodal-stat-label">DIAS SELECIONADOS</div>
              <div className="fmodal-stat-value">{diasCorridosSelecionados} dias</div>
            </div>
          </div>
          <div className="fmodal-stat-sep" />
          <div className="fmodal-stat">
            <CalendarDays size={16} className="fmodal-stat-icon" />
            <div>
              <div className="fmodal-stat-label">DIAS RESTANTES</div>
              <div className="fmodal-stat-value">{diasRestantes} dias</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="fmodal-body">

          {/* Left column */}
          <div className="fmodal-col-left">

            {/* Options — VENDA e ANTECIPAR 13 */}
            <div className="fmodal-options-bar">
              <div className="fmodal-field-row">
                <span className="fmodal-field-label">VENDA DE FÉRIAS</span>
                <div className="fmodal-radio-group">
                  <label className="fmodal-radio-label" onClick={() => setVendaFerias(true)}>
                    <span className={`fmodal-radio-circle${vendaFerias ? ' fmodal-radio-circle--light' : ''}`} />
                    Sim
                  </label>
                  <label className="fmodal-radio-label" onClick={() => setVendaFerias(false)}>
                    <span className={`fmodal-radio-circle${!vendaFerias ? ' fmodal-radio-circle--dark' : ''}`} />
                    Não
                  </label>
                </div>
              </div>

              <div className="fmodal-options-sep" />

              <div className="fmodal-field-row">
                <span className="fmodal-field-label">ANTECIPAR 1ª PARCELA DO 13º?</span>
                <div className="fmodal-radio-group">
                  <label className="fmodal-radio-label" onClick={() => setAntecipar13(true)}>
                    <span className={`fmodal-radio-circle${antecipar13 ? ' fmodal-radio-circle--light' : ''}`} />
                    Sim
                  </label>
                  <label className="fmodal-radio-label" onClick={() => setAntecipar13(false)}>
                    <span className={`fmodal-radio-circle${!antecipar13 ? ' fmodal-radio-circle--dark' : ''}`} />
                    Não
                  </label>
                </div>
              </div>
            </div>

            <div className="fmodal-periodo-header">
              <span className="fmodal-section-label">PERÍODO DAS FÉRIAS</span>
              <button
                className="fmodal-reset-btn"
                onClick={() => { setRangeStart(null); setRangeEnd(null); setHoverDate(null); }}
                title="Limpar seleção"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Dual calendar */}
            <div className="fcal-wrapper">
              <div className="fcal-dual">

                {/* Left month */}
                <div className="fcal-panel">
                  <div className="fcal-panel-header">
                    <button className="fcal-nav-btn" onClick={handlePrevMonth}>
                      <ChevronLeft size={13} />
                      <span className="fcal-nav-label">{MESES_PT_ABREV[prevMonth]}</span>
                    </button>
                    <span className="fcal-panel-title">
                      {MESES_PT[calMonth].toUpperCase()} {calYear}
                    </span>
                    <span className="fcal-panel-header-spacer" />
                  </div>
                  <MonthCalendar
                    year={calYear} month={calMonth}
                    displayStart={displayStart} displayEnd={displayEnd}
                    onDayClick={handleDayClick}
                    onDayHover={d => { if (rangeStart && !rangeEnd) setHoverDate(d); }}
                    minDate={minAllowedDate}
                  />
                </div>

                {/* Right month */}
                <div className="fcal-panel">
                  <div className="fcal-panel-header">
                    <span className="fcal-panel-header-spacer" />
                    <span className="fcal-panel-title">
                      {MESES_PT[rightMonth].toUpperCase()} {rightYear}
                    </span>
                    <button className="fcal-nav-btn" onClick={handleNextMonth}>
                      <span className="fcal-nav-label">{MESES_PT_ABREV[nextNextMonth]}</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>
                  <MonthCalendar
                    year={rightYear} month={rightMonth}
                    displayStart={displayStart} displayEnd={displayEnd}
                    onDayClick={handleDayClick}
                    onDayHover={d => { if (rangeStart && !rangeEnd) setHoverDate(d); }}
                    minDate={minAllowedDate}
                  />
                </div>

              </div>
            </div>

            {/* Form fields */}
            <div className="fmodal-form-fields">
              <div className="fmodal-field-col">
                <span className="fmodal-field-label">JUSTIFICATIVA</span>
                <textarea
                  className="fmodal-textarea"
                  placeholder="Justificativa"
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Right column — requirements */}
          <div className="fmodal-col-right">
            <p className="fmodal-req-title">
              O período de férias precisa atender aos seguintes requisitos:
            </p>
            <div className="fmodal-req-list">
              <ReqItem ok={requirements?.notExceedSaldo}
                text="Os dias selecionados não devem exceder o saldo disponível." />
              <ReqItem ok={requirements?.minimo5dias}
                text="É necessário solicitar no mínimo 5 dias." />
              <ReqItem ok={requirements?.sobraMaior5}
                text="Não pode ter sobra de saldo menor que 5 dias." />
              <ReqItem ok={requirements?.notAntesDeHoliday}
                text="O início do gozo das férias não pode ocorrer durante o período de dois dias que antecede um feriado." />
              <ReqItem ok={requirements?.periodo14dias}
                text="É necessário ter um período com pelo menos 14 dias." />
              <ReqItem ok={requirements?.diaPermitido}
                text="De acordo com a política da empresa, os dias permitidos para iniciar as férias são Segunda-feira, Terça-feira e Quarta-feira." />
              <ReqItem ok={requirements?.notIntercede}
                text="A data solicitada não pode interceder diferentes períodos concessivos." />
              <ReqItem ok={requirements?.antecedencia35dias}
                text="A solicitação de férias deve ser feita com pelo menos 35 dias de antecedência." />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="fmodal-footer">
          <button className="fmodal-btn fmodal-btn--cancel" onClick={onClose}>CANCELAR</button>
          <button
            className={`fmodal-btn fmodal-btn--submit${canSubmit ? ' is-active' : ''}`}
            onClick={handleSolicitar}
            disabled={!canSubmit}
          >
            {canSubmit
              ? (isEditing ? `SALVAR ${diasCorridosSelecionados} DIAS` : `SOLICITAR ${diasCorridosSelecionados} DIAS`)
              : (isEditing ? 'SALVAR ALTERAÇÕES' : 'SOLICITAR FÉRIAS')}
          </button>
        </div>

      </div>
    </div>
  );
}

// ── FeriasPage ─────────────────────────────────────────────────────────────────
export default function FeriasPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const [analistaSelecionado, setAnalistaSelecionado] = useState('');
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const { registros, loading, error, incluir, editar, remover } = useFerias();

  const alias = ANALISTAS.find(a => a.fullName === analistaSelecionado)?.alias ?? '';

  const modalAlias = editingRecord ? editingRecord.analista : alias;

  const saldo = useMemo(() => {
    if (!modalAlias) return TOTAL_FERIAS_DIAS;
    const used = registros
      .filter(r => r.analista === modalAlias && r.id !== editingRecord?.id)
      .reduce((sum, r) => sum + calcDiasCorridos(r.dataInicio, r.dataFim), 0);
    return Math.max(0, TOTAL_FERIAS_DIAS - used);
  }, [modalAlias, registros, editingRecord]);

  async function handleSolicitar({ dataInicio, dataFim, justificativa }) {
    if (editingRecord) {
      await editar(editingRecord.id, {
        analista:  editingRecord.analista,
        equipe:    editingRecord.equipe,
        dataInicio, dataFim,
        tipo:      'Férias Programadas',
        observacao: justificativa || null,
        status:    editingRecord.status || STATUS_FERIAS[0],
      });
    } else {
      const equipe = EQUIPE_MAP[alias] || '—';
      await incluir({ analista: alias, equipe, dataInicio, dataFim, tipo: 'Férias Programadas', observacao: justificativa || null, status: STATUS_FERIAS[0] });
    }
    setModalOpen(false);
    setEditingRecord(null);
  }

  async function handleRemover(id) {
    await remover(id);
  }

  function handleEditar(r) {
    setEditingRecord(r);
    setModalOpen(true);
  }

  async function handleStatusChange(r, newStatus) {
    await editar(r.id, { ...r, status: newStatus });
  }

  function handleCloseModal() {
    setModalOpen(false);
    setEditingRecord(null);
  }

  return (
    <div className="dayoff-page">

      {/* Sticky top */}
      <div className="dayoff-sticky-top">
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
        <header className="dayoff-header">
          <div>
            <h1 className="dayoff-title">Férias</h1>
            <p className="dayoff-subtitle">Controle de férias e licenças da equipe</p>
          </div>
          <div className="dayoff-header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>
      </div>

      {/* Selector card */}
      <div className="dayoff-form-card">
        <div className="ferias-selector-row">
          <div className="dayoff-field ferias-analista-field">
            <div className="ferias-label-row">
              <label className="dayoff-label">Selecione o Analista</label>
              <span className="ferias-tooltip-wrap">
                <Info size={12} className="ferias-tooltip-icon" />
                <span className="ferias-tooltip-text">Selecione um analista e clique em Solicitar Férias</span>
              </span>
            </div>
            <select
              className="dayoff-select"
              value={analistaSelecionado}
              onChange={e => setAnalistaSelecionado(e.target.value)}
            >
              <option value="">Selecionar...</option>
              {ANALISTAS.map(a => (
                <option key={a.fullName} value={a.fullName}>{a.alias}</option>
              ))}
            </select>
          </div>

          <div className="dayoff-field dayoff-field--btn">
            <label className="dayoff-label">&nbsp;</label>
            <button
              className="ferias-solicitar-btn"
              onClick={() => setModalOpen(true)}
              disabled={!analistaSelecionado}
            >
              Solicitar Férias
            </button>
          </div>
        </div>
      </div>

      {/* Registro table */}
      <div className="dayoff-grid-card">
        <div className="dayoff-grid-header">
          <span className="dayoff-grid-title">Registros</span>
          <span className="dayoff-grid-count">
            {loading ? 'Carregando…' : `${registros.length} ${registros.length === 1 ? 'registro' : 'registros'}`}
          </span>
        </div>
        <div className="dayoff-table-wrapper">
          <table className="dayoff-table">
            <colgroup><col /><col /><col /><col /><col /><col /><col /><col /></colgroup>
            <thead>
              <tr>
                <th>Analista</th>
                <th>Equipe</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                <th>Qtde Dias Férias</th>
                <th>Status Férias</th>
                <th>Justificativa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr><td colSpan={8} className="dayoff-empty">Erro ao carregar registros: {error}</td></tr>
              ) : loading ? (
                <tr><td colSpan={8} className="dayoff-empty">Carregando…</td></tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dayoff-empty">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                registros.map(r => (
                  <tr key={r.id}>
                    <td className="dayoff-td--analista">{r.analista}</td>
                    <td>{r.equipe}</td>
                    <td>{formatDate(r.dataInicio)}</td>
                    <td>{formatDate(r.dataFim)}</td>
                    <td className="dayoff-td--dias">{calcDiasCorridos(r.dataInicio, r.dataFim)}</td>
                    <td>
                      <select
                        className={`ferias-status-select ferias-status-select--${STATUS_VARIANT[r.status] ?? 'status-pending-gestor'}`}
                        value={r.status || STATUS_FERIAS[0]}
                        onChange={e => handleStatusChange(r, e.target.value)}
                      >
                        {STATUS_FERIAS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="dayoff-td--muted">{r.observacao || '—'}</td>
                    <td>
                      <GearMenu onEditar={() => handleEditar(r)} onRemover={() => handleRemover(r.id)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <SolicitarFeriasModal
          analistaAlias={modalAlias}
          saldo={saldo}
          registros={registros}
          onSolicitar={handleSolicitar}
          onClose={handleCloseModal}
          initialData={editingRecord ? {
            dataInicio:    editingRecord.dataInicio,
            dataFim:       editingRecord.dataFim,
            justificativa: editingRecord.observacao ?? '',
          } : null}
          excludeId={editingRecord?.id}
        />
      )}

    </div>
  );
}
