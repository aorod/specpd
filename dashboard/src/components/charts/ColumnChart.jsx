import { useState } from 'react';
import { Users, ArrowDownUp } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import ChartCard from './ChartCard.jsx';
import './Charts.css';

const COL_W    = 36;
const COL_GAP  = 16;
const BAR_H    = 160;
const PAD_X    = 12;
const PAD_TOP  = 16;
const LABEL_H  = 40;
const COUNT_H  = 18;
const SVG_H    = PAD_TOP + BAR_H + COUNT_H + LABEL_H;

export default function ColumnChart({ data, forceCollapsed, title = 'Designer', tooltipLabel = 'Total' }) {
  const [tooltip, setTooltip]   = useState(null);
  const [asc, setAsc]           = useState(false);

  const entries = [...data.entries()].sort(([, a], [, b]) =>
    asc ? a.total - b.total : b.total - a.total
  );

  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const svgW     = PAD_X * 2 + entries.length * COL_W + Math.max(0, entries.length - 1) * COL_GAP;

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
    <ChartCard title={title} icon={Users} actions={sortButton} forceCollapsed={forceCollapsed}>
      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${SVG_H}`}
          aria-label={`Barras verticais — ${title}`}
          style={{ minWidth: entries.length > 6 ? `${svgW}px` : undefined }}
        >
          <title>{title}</title>
          {entries.map(([key, { total }], i) => {
            const barH  = (total / maxTotal) * BAR_H;
            const x     = PAD_X + i * (COL_W + COL_GAP);
            const barY  = PAD_TOP + (BAR_H - barH);
            const cx    = x + COL_W / 2;

            const name  = aliasName(key);
            // quebra o label em até 2 linhas de ~6 chars
            const words = name.split(' ');
            const lines = [];
            let current = '';
            for (const w of words) {
              if ((current + ' ' + w).trim().length <= 7) {
                current = (current + ' ' + w).trim();
              } else {
                if (current) lines.push(current);
                current = w;
              }
            }
            if (current) lines.push(current);
            const labelLines = lines.slice(0, 2);
            if (lines.length > 2) labelLines[1] = labelLines[1].slice(0, 5) + '…';

            return (
              <g key={key}>
                {barH > 0 && (
                  <rect
                    x={x}
                    y={barY}
                    width={COL_W}
                    height={barH}
                    rx={3}
                    fill="var(--color-accent)"
                    opacity={tooltip && tooltip.key !== key ? 0.4 : 1}
                    className="v-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setTooltip({ key, total })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                {/* Contagem acima da barra */}
                <text
                  x={cx}
                  y={barY - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill="var(--color-text-muted)"
                >
                  {total}
                </text>

                {/* Label abaixo da barra */}
                {labelLines.map((line, li) => (
                  <text
                    key={li}
                    x={cx}
                    y={PAD_TOP + BAR_H + COUNT_H + li * 13}
                    textAnchor="middle"
                    fontSize={8.5}
                    fill="var(--color-text-secondary)"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{aliasName(tooltip.key)}</span>
            <span>{tooltipLabel}: <strong>{tooltip.total}</strong></span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
