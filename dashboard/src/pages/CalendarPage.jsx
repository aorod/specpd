import { useState, useEffect } from 'react';
import { Sun, Moon, ChevronDown } from 'lucide-react';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './CalendarPage.css';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const ANO_ATUAL = new Date().getFullYear();
const ANOS = Array.from({ length: 20 }, (_, i) => ANO_ATUAL - 5 + i); // -5 a +14

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function MonthGrid({ year, month, holidays }) {
  const daysInMonth  = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const today = new Date();

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
          const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const holiday = holidays.find((h) => h.date === iso);
          const isToday =
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day;
          const isWeekend = (() => {
            const dow = new Date(year, month, day).getDay();
            return dow === 0 || dow === 6;
          })();

          return (
            <div
              key={i}
              className={[
                'cal-day',
                isToday    ? 'cal-day--today'   : '',
                holiday    ? 'cal-day--holiday' : '',
                isWeekend  ? 'cal-day--weekend' : '',
              ].join(' ')}
              title={holiday ? holiday.name : undefined}
            >
              <span className="cal-day-num">{day}</span>
              {holiday && <span className="cal-day-holiday-dot" title={holiday.name} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const [ano, setAno]           = useState(ANO_ATUAL);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

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
            <p className="calendar-subtitle">Visualização de feriados nacionais · {ano}</p>
          </div>
          <div className="calendar-header-right">
            {/* Dropdown Ano */}
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

      {/* ── Legenda ────────────────────────────────────────────────── */}
      <div className="cal-legend">
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--holiday" />
          Feriado nacional
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--today" />
          Hoje
        </span>
        <span className="cal-legend-item">
          <span className="cal-legend-dot cal-legend-dot--weekend" />
          Final de semana
        </span>
        {loading && <span className="cal-legend-loading">Carregando feriados…</span>}
        {error   && <span className="cal-legend-error">Erro ao carregar feriados</span>}
      </div>

      {/* ── Grade de meses ─────────────────────────────────────────── */}
      <div className="cal-months-grid">
        {MESES.map((_, monthIdx) => (
          <MonthGrid
            key={monthIdx}
            year={ano}
            month={monthIdx}
            holidays={holidays}
          />
        ))}
      </div>

    </div>
  );
}
