import { useState } from 'react';
import { BarChart2 } from 'lucide-react';
import './Charts.css';

const LABEL_W = 148;
const BAR_AREA = 240;
const ROW_H = 28;
const ROW_GAP = 10;
const PAD = 8;
const COUNT_W = 32;
const SVG_W = LABEL_W + BAR_AREA + COUNT_W + PAD * 2;

export default function HorizontalBarChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const entries = [...data.entries()];
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const svgH = entries.length * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <BarChart2 size={16} />
        <h3>Fluxo por Produto</h3>
      </div>

      <div className="chart-legend-row">
        <span className="chart-legend-dot" style={{ background: 'var(--color-normal)' }} />
        <span className="chart-legend-text">Fluxo Normal</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-er)' }} />
        <span className="chart-legend-text">Eng. Reversa</span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`} aria-label="Barras horizontais — Fluxo por Produto">
          <title>Fluxo por Produto</title>
          {entries.map(([produto, { total, fluxoNormal, fluxoER }], i) => {
            const y = PAD + i * (ROW_H + ROW_GAP);
            const normalW = (fluxoNormal / maxTotal) * BAR_AREA;
            const erW = (fluxoER / maxTotal) * BAR_AREA;
            const barX = LABEL_W + PAD;

            return (
              <g key={produto}>
                <text
                  x={LABEL_W}
                  y={y + ROW_H / 2 + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--color-text-secondary)"
                >
                  {produto.length > 19 ? produto.slice(0, 19) + '…' : produto}
                </text>

                {normalW > 0 && (
                  <rect
                    x={barX}
                    y={y}
                    width={normalW}
                    height={ROW_H}
                    rx={3}
                    fill="var(--color-normal)"
                    opacity={tooltip && tooltip.key !== `${produto}-n` ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setTooltip({ key: `${produto}-n`, label: 'Fluxo Normal', value: fluxoNormal, produto })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {erW > 0 && (
                  <rect
                    x={barX + normalW}
                    y={y}
                    width={erW}
                    height={ROW_H}
                    rx={3}
                    fill="var(--color-er)"
                    opacity={tooltip && tooltip.key !== `${produto}-e` ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40 + 20}ms` }}
                    onMouseEnter={() => setTooltip({ key: `${produto}-e`, label: 'Eng. Reversa', value: fluxoER, produto })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                <text
                  x={barX + normalW + erW + 6}
                  y={y + ROW_H / 2 + 4}
                  fontSize={11}
                  fill="var(--color-text-muted)"
                  fontWeight="600"
                >
                  {total}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{tooltip.produto}</span>
            <span>{tooltip.label}: <strong>{tooltip.value}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
}
