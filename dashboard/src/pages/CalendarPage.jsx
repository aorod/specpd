import { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Sun, Moon, ChevronDown } from 'lucide-react';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import { api } from '../api/localClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import './CalendarPage.css';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 16 }, (_, i) => ANO_ATUAL - 1 + i);

// ── Cálculo de Páscoa (algoritmo de Meeus/Jones/Butcher) ─────────────────────
function getEasterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Feriados Municipais do Rio de Janeiro ─────────────────────────────────────
function getRioMunicipalHolidays(year) {
  const easter = getEasterDate(year);
  const carnavalTerca   = new Date(easter); carnavalTerca.setDate(easter.getDate() - 47);
  const carnavalSegunda = new Date(easter); carnavalSegunda.setDate(easter.getDate() - 48);

  return [
    { date: `${year}-01-20`, name: 'São Sebastião — Padroeiro do Rio de Janeiro' },
    { date: toISO(carnavalSegunda), name: 'Segunda-feira de Carnaval' },
    { date: toISO(carnavalTerca),  name: 'Terça-feira de Carnaval' },
    { date: `${year}-04-23`, name: 'Dia de São Jorge' },
    { date: `${year}-12-08`, name: 'Nossa Senhora da Conceição' },
  ];
}

function getDaysInMonth(year, month)    { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfWeek(year, month) { return new Date(year, month, 1).getDay(); }

// ── MonthGrid ─────────────────────────────────────────────────────────────────
function MonthGrid({ year, month, holidays, municipalHolidays, pontoFacultativo, onToggle }) {
  const daysInMonth    = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const today          = new Date();

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="cal-month-card">
      <div className="cal-month-name">{MESES[month]}</div>
      <div className="cal-grid">
        {DIAS_SEMANA.map((d) => (
          <span key={d} className="cal-weekday">{d}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={i} className="cal-day cal-day--empty" />;

          const iso        = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const holiday    = holidays.find((h) => h.date === iso);
          const municipal  = !holiday && municipalHolidays.find((h) => h.date === iso);
          const facultativo = pontoFacultativo.has(iso);
          const isToday    =
            today.getFullYear() === year &&
            today.getMonth()    === month &&
            today.getDate()     === day;
          const isWeekend = (() => {
            const dow = new Date(year, month, day).getDay();
            return dow === 0 || dow === 6;
          })();

          return (
            <div
              key={i}
              className={[
                'cal-day',
                'cal-day--clickable',
                isToday     ? 'cal-day--today'      : '',
                facultativo ? 'cal-day--facultativo' : '',
                !facultativo && holiday   ? 'cal-day--holiday'  : '',
                !facultativo && municipal ? 'cal-day--municipal' : '',
                isWeekend   ? 'cal-day--weekend'     : '',
              ].filter(Boolean).join(' ')}
              title={
                facultativo
                  ? 'Feriado (Ponto Facultativo)'
                  : holiday?.name ?? municipal?.name ?? undefined
              }
              onClick={() => onToggle(iso)}
            >
              <span className="cal-day-num">{day}</span>
              {facultativo && <span className="cal-day-holiday-dot cal-day-holiday-dot--facultativo" />}
              {!facultativo && holiday   && <span className="cal-day-holiday-dot" />}
              {!facultativo && municipal && <span className="cal-day-holiday-dot cal-day-holiday-dot--municipal" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal de confirmação ──────────────────────────────────────────────────────
function SaveModal({ onCancel, onConfirm }) {
  return (
    <div className="cal-modal-backdrop" onClick={onCancel}>
      <div className="cal-modal" onClick={(e) => e.stopPropagation()}>
        <p className="cal-modal-message">
          Deseja salvar as alterações de Feriado por Ponto Facultativo?
        </p>
        <div className="cal-modal-actions">
          <button className="cal-modal-btn cal-modal-btn--cancel" onClick={onCancel}>
            Cancelar
          </button>
          <button className="cal-modal-btn cal-modal-btn--confirm" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CalendarContent: painel reutilizável (sem header de página) ───────────────
export const CalendarContent = forwardRef(function CalendarContent({ onSaved }, ref) {
  const { can } = useAuth();
  const canAdicionar = can('calendario', 'adicionar');

  const [ano, setAno]                   = useState(ANO_ATUAL);
  const [holidays, setHolidays]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [pontoFacultativo, setPontoFac] = useState(new Set());
  const [savedPontoFac, setSavedPontoFac] = useState(new Map());
  const [showModal, setShowModal]       = useState(false);
  const [toastMsg, setToastMsg]         = useState(null);

  const municipalHolidays = useMemo(() => getRioMunicipalHolidays(ano), [ano]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`https://brasilapi.com.br/api/feriados/v1/${ano}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setHolidays)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ano]);

  useEffect(() => {
    api.get(`/calendar/events?ano=${ano}`)
      .then((events) => {
        const facultativos = events.filter((e) => e.tipo === 'ponto_facultativo');
        const savedMap = new Map(facultativos.map((e) => [e.data, e.id]));
        setSavedPontoFac(savedMap);
        setPontoFac(new Set(savedMap.keys()));
      })
      .catch(() => {});
  }, [ano]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function togglePontoFac(iso) {
    if (!canAdicionar) return;
    setPontoFac((prev) => {
      const next = new Set(prev);
      if (next.has(iso)) next.delete(iso);
      else next.add(iso);
      return next;
    });
  }

  useImperativeHandle(ref, () => ({ save: handleSaveClick }));

  function handleSaveClick() {
    const toAdd    = [...pontoFacultativo].filter((iso) => !savedPontoFac.has(iso));
    const toRemove = [...savedPontoFac.keys()].filter((iso) => !pontoFacultativo.has(iso));
    if (toAdd.length === 0 && toRemove.length === 0) {
      showToast('Nenhuma alteração foi feita para salvar');
      return;
    }
    setShowModal(true);
  }

  async function handleConfirmSave() {
    const toAdd    = [...pontoFacultativo].filter((iso) => !savedPontoFac.has(iso));
    const toRemove = [...savedPontoFac.keys()].filter((iso) => !pontoFacultativo.has(iso));

    try {
      await Promise.all([
        ...toAdd.map((iso) =>
          api.post('/calendar/events', {
            data: iso,
            titulo: 'Feriado (Ponto Facultativo)',
            tipo: 'ponto_facultativo',
          })
        ),
        ...toRemove.map((iso) =>
          api.delete(`/calendar/events/${savedPontoFac.get(iso)}`)
        ),
      ]);

      const events = await api.get(`/calendar/events?ano=${ano}`);
      const facultativos = events.filter((e) => e.tipo === 'ponto_facultativo');
      const newSavedMap = new Map(facultativos.map((e) => [e.data, e.id]));
      setSavedPontoFac(newSavedMap);
      setPontoFac(new Set(newSavedMap.keys()));
      if (onSaved) onSaved();
      else showToast('Alterações salvas com sucesso');
    } catch (err) {
      showToast(`Erro ao salvar: ${err.message}`);
    } finally {
      setShowModal(false);
    }
  }

  return (
    <>
      {/* ── Controles do topo ──────────────────────────────────────── */}
      <div className="cal-content-toolbar">
        <div className="cal-year-select-wrap">
          <select
            className="cal-year-select"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
          >
            {ANOS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <ChevronDown size={13} className="cal-year-chevron" />
        </div>

      </div>

      {/* ── Legenda ────────────────────────────────────────────────── */}
      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--holiday" />
          Feriado nacional
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--municipal" />
          Feriado municipal (RJ)
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--facultativo" />
          Feriado (Ponto Facultativo)
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--today" />
          Hoje
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--weekend" />
          Final de semana
        </span>
        {loading && <span className="cal-legend-loading">Carregando feriados nacionais…</span>}
        {error   && <span className="cal-legend-error">Erro ao carregar feriados nacionais</span>}
      </div>

      {/* ── Grade de meses ─────────────────────────────────────────── */}
      <div className="cal-months-grid">
        {MESES.map((_, monthIdx) => (
          <MonthGrid
            key={monthIdx}
            year={ano}
            month={monthIdx}
            holidays={holidays}
            municipalHolidays={municipalHolidays}
            pontoFacultativo={pontoFacultativo}
            onToggle={togglePontoFac}
          />
        ))}
      </div>

      {/* ── Modal de confirmação ────────────────────────────────────── */}
      {showModal && (
        <SaveModal
          onCancel={() => setShowModal(false)}
          onConfirm={handleConfirmSave}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────── */}
      {toastMsg && (
        <div className="cal-toast">{toastMsg}</div>
      )}
    </>
  );
});

// ── CalendarPage: page completa (header + painel + botão Voltar) ──────────────
export default function CalendarPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  return (
    <div className="calendar-page">

      {/* ── Sticky top ─────────────────────────────────────────────── */}
      <div className="calendar-sticky-top">
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

        <header className="calendar-header">
          <div>
            <h1 className="calendar-title">Calendário</h1>
            <p className="calendar-subtitle">Feriados nacionais e municipais do Rio de Janeiro</p>
          </div>
          <div className="calendar-header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>
      </div>

      <CalendarContent />

      {/* ── Bottom bar fixa ────────────────────────────────────────── */}
      <div className="calendar-sticky-bottom">
        <button
          className="cal-bottom-btn cal-bottom-btn--back"
          onClick={() => onNavigate('home')}
        >
          Voltar
        </button>
      </div>

    </div>
  );
}
