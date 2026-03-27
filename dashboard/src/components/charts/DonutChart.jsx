import { useState } from 'react';
import { PieChart } from 'lucide-react';
import './Charts.css';

const CX = 90;
const CY = 90;
const OUTER_R = 78;
const INNER_R = 50;

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

export default function DonutChart({ normal = 0, er = 0 }) {
  const [hovered, setHovered] = useState(null);
  const total = normal + er;

  const segments =
    total === 0
      ? []
      : (() => {
          const normalAngle = (normal / total) * 360;
          return [
            {
              key: 'normal',
              label: 'Fluxo Normal',
              count: normal,
              pct: ((normal / total) * 100).toFixed(1),
              color: 'var(--color-normal)',
              path: donutPath(CX, CY, OUTER_R, INNER_R, 0, normalAngle),
            },
            {
              key: 'er',
              label: 'Engenharia Reversa',
              count: er,
              pct: ((er / total) * 100).toFixed(1),
              color: 'var(--color-er)',
              path: donutPath(CX, CY, OUTER_R, INNER_R, normalAngle, normalAngle + (er / total) * 360),
            },
          ];
        })();

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <PieChart size={16} />
        <h3>Distribuição de Fluxo</h3>
      </div>
      <div className="donut-layout">
        <div className="donut-svg-wrap">
          <svg width="100%" viewBox="0 0 180 180" aria-label="Donut chart — Distribuição de Fluxo">
            <title>Distribuição de Fluxo</title>
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
    </div>
  );
}
