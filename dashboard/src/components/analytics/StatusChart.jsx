import { useState } from 'react';
import { Activity } from 'lucide-react';
import ChartCard from '../charts/ChartCard.jsx';
import '../charts/Charts.css';

const LABEL_W = 148;
const BAR_AREA = 240;
const ROW_H = 28;
const ROW_GAP = 10;
const PAD = 8;
const COUNT_W = 32;
const SVG_W = LABEL_W + BAR_AREA + COUNT_W + PAD * 2;
const VISIBLE_ROWS = 8;
const SCROLL_H = VISIBLE_ROWS * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

export default function StatusChart({ data, forceCollapsed }) {
  const [tooltip, setTooltip] = useState(null);

  const entries = [...data.entries()].sort(([, a], [, b]) => b.total - a.total);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const svgH = entries.length * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

  if (entries.length === 0) return null;

  return (
    <ChartCard title="Distribuição por Status" icon={Activity} forceCollapsed={forceCollapsed}>
      <div style={{ position: 'relative', overflowY: entries.length > VISIBLE_ROWS ? 'auto' : 'visible', aspectRatio: entries.length > VISIBLE_ROWS ? `${SVG_W} / ${SCROLL_H}` : undefined }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`}>
          {entries.map(([state, { total }], i) => {
            const y = PAD + i * (ROW_H + ROW_GAP);
            const barW = (total / maxTotal) * BAR_AREA;
            const barX = LABEL_W + PAD;
            const label = state.length > 19 ? state.slice(0, 19) + '…' : state;

            return (
              <g key={state}>
                <text x={LABEL_W} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11} fill="var(--color-text-secondary)">
                  {label}
                </text>
                {barW > 0 && (
                  <rect
                    x={barX} y={y} width={barW} height={ROW_H} rx={3}
                    fill="var(--color-accent)"
                    opacity={tooltip && tooltip.state !== state ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setTooltip({ state, total })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                <text x={barX + barW + 6} y={y + ROW_H / 2 + 4} fontSize={11} fill="var(--color-text-muted)" fontWeight="600">
                  {total}
                </text>
              </g>
            );
          })}
        </svg>
        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{tooltip.state}</span>
            <span>Total: <strong>{tooltip.total}</strong></span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
