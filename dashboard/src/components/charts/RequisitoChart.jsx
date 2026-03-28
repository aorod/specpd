import { useState } from 'react';
import { Users, ArrowDownUp } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import ChartCard from './ChartCard.jsx';
import './Charts.css';

const LABEL_W = 148;
const BAR_AREA = 240;
const ROW_H = 28;
const ROW_GAP = 10;
const PAD = 8;
const COUNT_W = 32;
const SVG_W = LABEL_W + BAR_AREA + COUNT_W + PAD * 2;
const VISIBLE_ROWS = 6;
const SCROLL_H = VISIBLE_ROWS * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

export default function RequisitoChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  const [asc, setAsc] = useState(false);

  const entries = [...data.entries()].sort(([, a], [, b]) =>
    asc ? a.total - b.total : b.total - a.total
  );
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const svgH = entries.length * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

  if (entries.length === 0) return null;

  const sortButton = (
    <button
      onClick={(e) => { e.stopPropagation(); setAsc((v) => !v); }}
      title={asc ? 'Ordenar decrescente' : 'Ordenar crescente'}
      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 6, padding: '3px 8px', color: asc ? 'var(--color-accent)' : 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.7rem', fontFamily: 'var(--font-sans)' }}
    >
      <ArrowDownUp size={11} />
      {asc ? '1→9' : '9→1'}
    </button>
  );

  return (
    <ChartCard title="Requisito" icon={Users} actions={sortButton}>
      <div style={{ position: 'relative', overflowY: entries.length > VISIBLE_ROWS ? 'auto' : 'visible', aspectRatio: entries.length > VISIBLE_ROWS ? `${SVG_W} / ${SCROLL_H}` : undefined }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`} aria-label="Barras horizontais — Requisito">
          <title>Requisito</title>
          {entries.map(([requisito, { total }], i) => {
            const y = PAD + i * (ROW_H + ROW_GAP);
            const barW = (total / maxTotal) * BAR_AREA;
            const barX = LABEL_W + PAD;

            return (
              <g key={requisito}>
                <text
                  x={LABEL_W}
                  y={y + ROW_H / 2 + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--color-text-secondary)"
                >
                  {(() => { const n = aliasName(requisito); return n.length > 19 ? n.slice(0, 19) + '…' : n; })()}
                </text>

                {barW > 0 && (
                  <rect
                    x={barX}
                    y={y}
                    width={barW}
                    height={ROW_H}
                    rx={3}
                    fill="var(--color-info)"
                    opacity={tooltip && tooltip.requisito !== requisito ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setTooltip({ requisito, total })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                <text
                  x={barX + barW + 6}
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
            <span className="chart-tooltip-label">{aliasName(tooltip.requisito)}</span>
            <span>Total de demandas: <strong>{tooltip.total}</strong></span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
