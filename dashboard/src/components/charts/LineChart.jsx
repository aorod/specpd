import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatMes } from '../../utils/formatters.js';
import './Charts.css';

const PAD = { top: 20, right: 24, bottom: 48, left: 36 };
const SVG_W = 500;
const SVG_H = 220;
const CHART_W = SVG_W - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top - PAD.bottom;

export default function LineChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const entries = [...data.entries()];
  const n = entries.length;
  if (n === 0) return null;

  const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal / tickCount) * i)
  );

  const xPos = (i) => (n === 1 ? PAD.left + CHART_W / 2 : PAD.left + (i / (n - 1)) * CHART_W);
  const yPos = (v) => PAD.top + CHART_H - (v / maxVal) * CHART_H;

  const totalPoints = entries.map(([, v], i) => ({ x: xPos(i), y: yPos(v.total) }));
  const erPoints = entries.map(([, v], i) => ({ x: xPos(i), y: yPos(v.fluxoER) }));

  const toPath = (pts) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');

  const toArea = (pts, baseline) => {
    if (pts.length === 0) return '';
    const last = pts[pts.length - 1];
    const first = pts[0];
    return (
      toPath(pts) +
      ` L ${last.x.toFixed(2)} ${baseline} L ${first.x.toFixed(2)} ${baseline} Z`
    );
  };

  const baseline = PAD.top + CHART_H;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <TrendingUp size={16} />
        <h3>Evolução por Mês</h3>
      </div>

      <div className="chart-legend-row">
        <span className="chart-legend-dot" style={{ background: 'var(--color-info)' }} />
        <span className="chart-legend-text">Total de UCs</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-er)' }} />
        <span className="chart-legend-text">Eng. Reversa</span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} aria-label="Line chart — Evolução por Mês">
          <title>Evolução por Mês</title>

          {/* Grid lines + Y labels */}
          {ticks.map((tick) => {
            const y = yPos(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y}
                  stroke="var(--color-border)" strokeWidth={1}
                />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="var(--color-text-muted)">
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Filled areas */}
          <path d={toArea(totalPoints, baseline)} fill="var(--color-info)" opacity={0.08} />
          <path d={toArea(erPoints, baseline)} fill="var(--color-er)" opacity={0.1} />

          {/* Lines */}
          <path d={toPath(totalPoints)} fill="none" stroke="var(--color-info)" strokeWidth={2} strokeLinejoin="round" className="line-path" />
          <path d={toPath(erPoints)} fill="none" stroke="var(--color-er)" strokeWidth={2} strokeLinejoin="round" className="line-path" />

          {/* Dots + X labels */}
          {entries.map(([mes, v], i) => {
            const x = xPos(i);
            return (
              <g key={mes}>
                {/* Total dot */}
                <circle
                  cx={x} cy={yPos(v.total)} r={4}
                  fill="var(--color-info)"
                  stroke="var(--color-surface)" strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({ mes, total: v.total, er: v.fluxoER })}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* ER dot */}
                <circle
                  cx={x} cy={yPos(v.fluxoER)} r={4}
                  fill="var(--color-er)"
                  stroke="var(--color-surface)" strokeWidth={2}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setTooltip({ mes, total: v.total, er: v.fluxoER })}
                  onMouseLeave={() => setTooltip(null)}
                />
                {/* X label */}
                <text
                  x={x} y={PAD.top + CHART_H + 18}
                  textAnchor="middle" fontSize={11} fill="var(--color-text-muted)"
                >
                  {formatMes(mes)}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{formatMes(tooltip.mes)}</span>
            <span>Total: <strong>{tooltip.total}</strong></span>
            <span>Eng. Reversa: <strong>{tooltip.er}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
