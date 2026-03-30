import { useState } from 'react';
import { FileCheck } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import ChartCard from '../charts/ChartCard.jsx';
import '../charts/Charts.css';

const LABEL_W = 148;
const BAR_AREA = 240;
const ROW_H = 28;
const ROW_GAP = 10;
const PAD = 8;
const COUNT_W = 48;
const SVG_W = LABEL_W + BAR_AREA + COUNT_W + PAD * 2;
const VISIBLE_ROWS = 6;
const SCROLL_H = VISIBLE_ROWS * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

export default function DocRateChart({ data, forceCollapsed }) {
  const [tooltip, setTooltip] = useState(null);

  const entries = [...data.entries()]
    .sort(([, a], [, b]) => b.total - a.total);
  const maxTotal = Math.max(...entries.map(([, v]) => v.total), 1);
  const svgH = entries.length * (ROW_H + ROW_GAP) + PAD * 2 - ROW_GAP;

  if (entries.length === 0) return null;

  return (
    <ChartCard title="Taxa de Documentação por Designer" icon={FileCheck} forceCollapsed={forceCollapsed}>
      <div className="chart-legend-row">
        <span className="chart-legend-dot" style={{ background: 'var(--color-normal)' }} />
        <span className="chart-legend-text">Com Documentação</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-er)' }} />
        <span className="chart-legend-text">Sem Documentação</span>
      </div>

      <div style={{ position: 'relative', overflowY: entries.length > VISIBLE_ROWS ? 'auto' : 'visible', aspectRatio: entries.length > VISIBLE_ROWS ? `${SVG_W} / ${SCROLL_H}` : undefined }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${svgH}`}>
          {entries.map(([designer, { total, comReq, semReq }], i) => {
            const y = PAD + i * (ROW_H + ROW_GAP);
            const comW = (comReq / maxTotal) * BAR_AREA;
            const semW = (semReq / maxTotal) * BAR_AREA;
            const barX = LABEL_W + PAD;
            const alias = aliasName(designer);
            const label = alias.length > 19 ? alias.slice(0, 19) + '…' : alias;
            const pct = total > 0 ? Math.round((comReq / total) * 100) : 0;

            return (
              <g key={designer}>
                <text x={LABEL_W} y={y + ROW_H / 2 + 4} textAnchor="end" fontSize={11} fill="var(--color-text-secondary)">
                  {label}
                </text>
                {comW > 0 && (
                  <rect
                    x={barX} y={y} width={comW} height={ROW_H} rx={3}
                    fill="var(--color-normal)"
                    opacity={tooltip && tooltip.designer !== designer ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => setTooltip({ designer: alias, total, comReq, semReq, pct })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                {semW > 0 && (
                  <rect
                    x={barX + comW} y={y} width={semW} height={ROW_H} rx={3}
                    fill="var(--color-er)"
                    opacity={tooltip && tooltip.designer !== alias ? 0.4 : 1}
                    className="h-bar"
                    style={{ animationDelay: `${i * 40 + 20}ms` }}
                    onMouseEnter={() => setTooltip({ designer: alias, total, comReq, semReq, pct })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}
                <text x={barX + comW + semW + 6} y={y + ROW_H / 2 + 4} fontSize={10} fill="var(--color-text-muted)" fontWeight="600">
                  {pct}%
                </text>
              </g>
            );
          })}
        </svg>
        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{tooltip.designer}</span>
            <span>Com doc.: <strong>{tooltip.comReq}</strong></span>
            <span>Sem doc.: <strong>{tooltip.semReq}</strong></span>
            <span>Cobertura: <strong>{tooltip.pct}%</strong></span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
