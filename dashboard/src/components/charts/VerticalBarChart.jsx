import { useState } from 'react';
import { Users } from 'lucide-react';
import './Charts.css';

const PAD = { top: 16, right: 16, bottom: 52, left: 36 };
const SVG_W = 500;
const SVG_H = 240;
const CHART_W = SVG_W - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top - PAD.bottom;

export default function VerticalBarChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const entries = [...data.entries()];
  const n = entries.length;
  if (n === 0) return null;

  const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);
  const colW = CHART_W / n;
  const barW = Math.min(colW * 0.55, 48);

  const yScale = (v) => CHART_H - (v / maxVal) * CHART_H;

  // Y-axis ticks
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal / tickCount) * i)
  );

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <Users size={16} />
        <h3>Requisito por Designer</h3>
      </div>

      <div className="chart-legend-row">
        <span className="chart-legend-dot" style={{ background: 'var(--color-info)' }} />
        <span className="chart-legend-text">Com requisito</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-er)' }} />
        <span className="chart-legend-text">Sem requisito</span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} aria-label="Barras verticais — Requisito por Designer">
          <title>Requisito por Designer</title>

          {/* Grid lines + Y labels */}
          {ticks.map((tick) => {
            const y = PAD.top + yScale(tick);
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

          {/* Bars */}
          {entries.map(([designer, { total, comRequisito, semRequisito }], i) => {
            const cx = PAD.left + i * colW + colW / 2;
            const x = cx - barW / 2;
            const comH = (comRequisito / maxVal) * CHART_H;
            const semH = (semRequisito / maxVal) * CHART_H;

            return (
              <g key={designer}>
                {/* Com requisito (bottom portion of stack) */}
                {comH > 0 && (
                  <rect
                    x={x}
                    y={PAD.top + CHART_H - comH}
                    width={barW}
                    height={comH}
                    rx={3}
                    fill="var(--color-info)"
                    opacity={tooltip && tooltip.key !== `${designer}-c` ? 0.4 : 1}
                    className="v-bar"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onMouseEnter={() => setTooltip({ key: `${designer}-c`, label: 'Com requisito', value: comRequisito, designer })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {/* Sem requisito (stacked on top) */}
                {semH > 0 && (
                  <rect
                    x={x}
                    y={PAD.top + CHART_H - comH - semH}
                    width={barW}
                    height={semH}
                    rx={3}
                    fill="var(--color-er)"
                    opacity={tooltip && tooltip.key !== `${designer}-s` ? 0.4 : 1}
                    className="v-bar"
                    style={{ animationDelay: `${i * 50 + 25}ms` }}
                    onMouseEnter={() => setTooltip({ key: `${designer}-s`, label: 'Sem requisito', value: semRequisito, designer })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                {/* Total label above bar */}
                <text
                  x={cx}
                  y={PAD.top + CHART_H - comH - semH - 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight="600"
                  fill="var(--color-text-secondary)"
                >
                  {total}
                </text>

                {/* X label */}
                <text
                  x={cx}
                  y={PAD.top + CHART_H + 18}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--color-text-muted)"
                  transform={`rotate(-30, ${cx}, ${PAD.top + CHART_H + 18})`}
                >
                  {designer.split(' ')[0]}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{tooltip.designer}</span>
            <span>{tooltip.label}: <strong>{tooltip.value}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
