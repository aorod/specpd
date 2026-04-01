import { useState } from 'react';
import { PieChart } from 'lucide-react';
import ChartCard from './ChartCard.jsx';
import './Charts.css';

const CX = 90;
const CY = 90;
const OUTER_R = 78;
const INNER_R = 50;

const STATUS_COLOR_MAP = {
  'Finalizado':   'var(--color-normal)',
  'Em Andamento': '#f97316',
};
const FALLBACK_COLORS = [
  'var(--color-er)',
  '#f59e0b',
  '#06b6d4',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#f97316',
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: +(cx + r * Math.cos(rad)).toFixed(4),
    y: +(cy + r * Math.sin(rad)).toFixed(4),
  };
}

function donutPath(cx, cy, outerR, innerR, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 360) return donutPath(cx, cy, outerR, innerR, 0, 359.99);
  const large = sweep > 180 ? 1 : 0;
  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, endAngle);
  const is = polarToCartesian(cx, cy, innerR, startAngle);
  const ie = polarToCartesian(cx, cy, innerR, endAngle);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is.x} ${is.y}`,
    'Z',
  ].join(' ');
}

export default function StatusDonutChart({ data, forceCollapsed }) {
  const [hovered, setHovered] = useState(null);

  const entries = [...data.entries()].sort(([, a], [, b]) => b.total - a.total);
  const total   = entries.reduce((sum, [, v]) => sum + v.total, 0);

  const segments = total === 0 ? [] : (() => {
    let accumulated = 0;
    return entries.map(([status, { total: count }], i) => {
      const startAngle = (accumulated / total) * 360;
      accumulated += count;
      const endAngle = (accumulated / total) * 360;
      return {
        key:   status,
        label: status,
        count,
        pct:   ((count / total) * 100).toFixed(1),
        color: STATUS_COLOR_MAP[status] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        path:  donutPath(CX, CY, OUTER_R, INNER_R, startAngle, endAngle),
      };
    });
  })();

  return (
    <ChartCard title="Qtde TS por Status" icon={PieChart} forceCollapsed={forceCollapsed}>
      <div className="donut-layout">
        <div className="donut-svg-wrap">
          <svg width="100%" viewBox="0 0 180 180" aria-label="Donut chart — Qtde TS por Status">
            <title>Qtde TS por Status</title>
            {total === 0 ? (
              <circle cx={CX} cy={CY} r={OUTER_R} fill="var(--color-border)" />
            ) : (
              segments.map((seg, i) => (
                <path
                  key={seg.key}
                  d={seg.path}
                  fill={seg.color}
                  opacity={hovered && hovered !== seg.key ? 0.35 : 1}
                  style={{ cursor: 'pointer', transition: 'opacity 150ms' }}
                  onMouseEnter={() => setHovered(seg.key)}
                  onMouseLeave={() => setHovered(null)}
                  className={`donut-segment donut-segment--${i}`}
                />
              ))
            )}
            <circle cx={CX} cy={CY} r={INNER_R - 2} fill="var(--color-surface)" />
            <text x={CX} y={CY - 6} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-text-primary)">
              {total}
            </text>
            <text x={CX} y={CY + 14} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
              total
            </text>
          </svg>
        </div>
        <div className="donut-legend">
          {segments.map((seg) => (
            <div
              key={seg.key}
              className={`donut-legend-item${hovered === seg.key ? ' is-hovered' : ''}`}
              onMouseEnter={() => setHovered(seg.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="donut-legend-dot" style={{ background: seg.color }} />
              <div className="donut-legend-text">
                <span className="donut-legend-label">{seg.label}</span>
                <span className="donut-legend-value">
                  {seg.count} <small>({seg.pct}%)</small>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}
