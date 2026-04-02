import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import './DatePicker.css';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];

function isoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dateToIso(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isoToDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// Parse dd/mm/yyyy → ISO string, returns '' if invalid
function displayToIso(str) {
  const digits = str.replace(/\D/g, '');
  if (digits.length < 8) return null; // not complete yet
  const d = parseInt(digits.slice(0, 2), 10);
  const m = parseInt(digits.slice(2, 4), 10);
  const y = parseInt(digits.slice(4, 8), 10);
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  const date = new Date(y, m - 1, d);
  if (date.getMonth() !== m - 1 || date.getDate() !== d) return null; // invalid day
  return dateToIso(date);
}

// Apply dd/mm/yyyy mask to raw input
function applyMask(raw) {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  let out = digits;
  if (digits.length > 2) out = digits.slice(0, 2) + '/' + digits.slice(2);
  if (digits.length > 4) out = out.slice(0, 5) + '/' + digits.slice(4);
  return out;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

export default function DatePicker({ value, onChange, placeholder = 'dd/mm/aaaa', minDate }) {
  const [open, setOpen]           = useState(false);
  const [inputText, setInputText] = useState(isoToDisplay(value));
  const today = new Date();

  const selected = isoToDate(value);
  const minD     = isoToDate(minDate);

  const [viewYear, setViewYear]   = useState((selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState((selected ?? today).getMonth());

  const ref      = useRef(null);
  const inputRef = useRef(null);

  // Sync display when value changes externally (e.g. Limpar)
  useEffect(() => {
    setInputText(isoToDisplay(value));
    if (value) {
      const d = isoToDate(value);
      if (d) { setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); }
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleInputChange(e) {
    const masked = applyMask(e.target.value);
    setInputText(masked);
    const iso = displayToIso(masked);
    if (iso) {
      onChange(iso);
    } else if (masked === '') {
      onChange('');
    }
  }

  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      const iso = displayToIso(inputText);
      if (iso) { onChange(iso); setOpen(false); }
    }
    if (e.key === 'Escape') setOpen(false);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function isDisabled(day) {
    if (!minD) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d < minD;
  }

  function isSelected(day) {
    if (!selected) return false;
    return selected.getFullYear() === viewYear &&
           selected.getMonth()    === viewMonth &&
           selected.getDate()     === day;
  }

  function isToday(day) {
    return today.getFullYear() === viewYear &&
           today.getMonth()    === viewMonth &&
           today.getDate()     === day;
  }

  function selectDay(day) {
    if (isDisabled(day)) return;
    const iso = dateToIso(new Date(viewYear, viewMonth, day));
    onChange(iso);
    setInputText(isoToDisplay(iso));
    setOpen(false);
  }

  function handleClear() {
    onChange('');
    setInputText('');
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    const iso = dateToIso(today);
    onChange(iso);
    setInputText(isoToDisplay(iso));
    setOpen(false);
  }

  const daysInMonth    = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const inputValid = displayToIso(inputText) !== null || inputText === '';

  return (
    <div className="dp-root" ref={ref}>
      <div className={`dp-input${value ? ' has-value' : ''}${open ? ' is-open' : ''}${!inputValid ? ' is-invalid' : ''}`}>
        <input
          ref={inputRef}
          type="text"
          className="dp-text"
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          autoComplete="off"
        />
        <button
          type="button"
          className="dp-cal-btn"
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          tabIndex={-1}
          aria-label="Abrir calendário"
        >
          <CalendarDays size={14} />
        </button>
      </div>

      {open && (
        <div className="dp-popover">
          <div className="dp-nav">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>
              <ChevronLeft size={14} />
            </button>
            <span className="dp-nav-label">{MESES[viewMonth]} {viewYear}</span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="dp-grid">
            {DIAS_SEMANA.map((d, i) => (
              <span key={i} className="dp-weekday">{d}</span>
            ))}
            {cells.map((day, i) => (
              <button
                key={i}
                type="button"
                className={[
                  'dp-day',
                  day === null                             ? 'dp-day--empty'    : '',
                  day && isSelected(day)                  ? 'dp-day--selected' : '',
                  day && isToday(day) && !isSelected(day) ? 'dp-day--today'    : '',
                  day && isDisabled(day)                  ? 'dp-day--disabled' : '',
                ].join(' ')}
                onClick={() => day && selectDay(day)}
                disabled={!day || isDisabled(day)}
                tabIndex={day ? 0 : -1}
              >
                {day ?? ''}
              </button>
            ))}
          </div>

          <div className="dp-footer">
            <button type="button" className="dp-footer-btn" onClick={handleClear}>
              Limpar
            </button>
            <button type="button" className="dp-footer-btn dp-footer-btn--today" onClick={handleToday}>
              Hoje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
