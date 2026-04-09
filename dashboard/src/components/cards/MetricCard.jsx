import { useEffect, useState } from 'react';
import { Pin, PinOff } from 'lucide-react';
import './MetricCard.css';

function useCountUp(target, duration = 600) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let rafId;
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return count;
}

export default function MetricCard({ icon: Icon, label, value, detail, accent, pinned, onTogglePin, suffix, tooltip }) {
  const isString = typeof value === 'string';
  const animated = useCountUp(isString ? 0 : value);

  return (
    <div className={`metric-card metric-card--${accent}${tooltip ? ' metric-card--has-tooltip' : ''}`}>
      <div className="metric-card-icon">
        <Icon size={18} />
      </div>
      <div className="metric-card-body">
        <span className="metric-card-label">{label}</span>
        <span className="metric-card-value">
          {isString ? value : animated}
          {!isString && suffix && <span className="metric-card-suffix">{suffix}</span>}
        </span>
        {detail != null && (
          <span className="metric-card-detail">{detail}</span>
        )}
      </div>
      <button
        className={`metric-card-pin${pinned ? ' is-pinned' : ''}`}
        onClick={onTogglePin}
        title={pinned ? 'Desafixar card' : 'Fixar card no topo'}
        aria-label={pinned ? 'Desafixar card' : 'Fixar card no topo'}
      >
        {pinned ? <PinOff size={13} /> : <Pin size={13} />}
      </button>
      {tooltip && tooltip.length > 0 && (
        <div className="metric-card-tooltip" role="tooltip">
          {tooltip.map((pair, i) => (
            <div key={i} className="metric-card-tooltip-row">
              {pair.map((cell, j) => (
                <div key={j} className="metric-card-tooltip-cell">
                  <span className="metric-card-tooltip-value">{cell.value}</span>
                  <span className="metric-card-tooltip-label">{cell.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
