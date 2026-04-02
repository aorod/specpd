import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatMes } from '../../utils/formatters.js';
import ChartCard from './ChartCard.jsx';
import './Charts.css';

const MES_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const YEAR_COLORS = [
  'var(--color-info)',
  'var(--color-normal)',
  'var(--color-accent)',
  'var(--color-er)',
  '#f59e0b',
];

const PAD = { top: 12, right: 16, bottom: 26, left: 28 };
const SVG_W = 500;
const SVG_H = 130;
const CHART_W = SVG_W - PAD.left - PAD.right;
const CHART_H = SVG_H - PAD.top - PAD.bottom;

const mesAbbrFromKey = (mesKey) => {
  const parts = mesKey.split('-');
  const m = parts.length === 2 ? parts[1] : parts[0];
  return MES_ABBR[parseInt(m, 10) - 1] ?? mesKey;
};

// ─── Catmull-Rom → Cubic Bézier (curva senoidal suave) ──────────────────────
const toSmoothPath = (pts) => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  if (pts.length === 2) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)} L ${pts[1].x.toFixed(2)} ${pts[1].y.toFixed(2)}`;

  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
};

const toSmoothArea = (pts, baseline) => {
  if (!pts.length) return '';
  return toSmoothPath(pts) + ` L ${pts[pts.length - 1].x.toFixed(2)} ${baseline} L ${pts[0].x.toFixed(2)} ${baseline} Z`;
};

const yPos = (v, maxVal) => PAD.top + CHART_H - (v / maxVal) * CHART_H;
const tickCount = 4;

export default function LineChart({ data, anos = [], forceCollapsed, title = 'Evolução Por Fluxo', dotRadius = 2 }) {
  const [tooltip, setTooltip] = useState(null);

  const entries = [...data.entries()].filter(([key]) => {
    const [y, m] = key.split('-');
    return y && m && !isNaN(parseInt(m, 10));
  });

  if (entries.length === 0) return null;

  const yearsInData = [...new Set(entries.map(([key]) => key.split('-')[0]))].sort();
  const multiYear = yearsInData.length > 1;
  const displayYears = anos.length > 0 ? [...anos].sort().join(' · ') : yearsInData.join(' · ');
  const baseline = PAD.top + CHART_H;

  // ─── MODO MULTI-ANO ──────────────────────────────────────────────────────
  if (multiYear) {
    const byYear = {};
    for (const [key, val] of entries) {
      const [year, month] = key.split('-');
      if (!byYear[year]) byYear[year] = {};
      byYear[year][month] = val;
    }

    const allMonths = [...new Set(entries.map(([key]) => key.split('-')[1]))].sort();
    const nm = allMonths.length;
    const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);
    const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxVal / tickCount) * i));
    const xPos = (mi) => nm === 1 ? PAD.left + CHART_W / 2 : PAD.left + (mi / (nm - 1)) * CHART_W;

    return (
      <ChartCard
        title={title}
        icon={TrendingUp}
        actions={displayYears ? <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{displayYears}</span> : undefined}
        forceCollapsed={forceCollapsed}
      >
        <div className="chart-legend-row">
          {yearsInData.flatMap((year, i) => [
            <span key={`dot-${year}`} className="chart-legend-dot" style={{ background: YEAR_COLORS[i % YEAR_COLORS.length] }} />,
            <span key={`label-${year}`} className="chart-legend-text">{year}</span>,
          ])}
        </div>

        <div style={{ position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} aria-label={`Line chart — ${title}`}>
            <title>{title}</title>

            {ticks.map((tick) => {
              const y = yPos(tick, maxVal);
              return (
                <g key={tick}>
                  <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y} stroke="var(--color-border)" strokeWidth={1} />
                  <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{tick}</text>
                </g>
              );
            })}

            {yearsInData.map((year, yi) => {
              const color = YEAR_COLORS[yi % YEAR_COLORS.length];
              const pts = allMonths
                .map((mes, mi) => byYear[year]?.[mes] ? { x: xPos(mi), y: yPos(byYear[year][mes].total, maxVal) } : null)
                .filter(Boolean);

              return (
                <g key={year}>
                  <path d={toSmoothArea(pts, baseline)} fill={color} opacity={0.07} />
                  <path d={toSmoothPath(pts)} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" className="line-path" />
                  {allMonths.map((mes, mi) => {
                    const val = byYear[year]?.[mes];
                    if (!val) return null;
                    return (
                      <circle
                        key={`${year}-${mes}`}
                        cx={xPos(mi)} cy={yPos(val.total, maxVal)} r={dotRadius}
                        fill={color} stroke="var(--color-surface)" strokeWidth={1.5}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setTooltip({ mes, year, val })}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })}
                </g>
              );
            })}

            {allMonths.map((mes, mi) => (
              <text key={mes} x={xPos(mi)} y={PAD.top + CHART_H + 14} textAnchor="middle" fontSize={8} fill="var(--color-text-muted)">
                {MES_ABBR[parseInt(mes, 10) - 1]}
              </text>
            ))}
          </svg>

          {tooltip && (
            <div className="chart-tooltip">
              <span className="chart-tooltip-label">{MES_ABBR[parseInt(tooltip.mes, 10) - 1]} {tooltip.year}</span>
              <span>Total: <strong>{tooltip.val.total}</strong></span>
              <span>Fluxo Normal: <strong>{tooltip.val.fluxoNormal}</strong></span>
              <span>Eng. Reversa: <strong>{tooltip.val.fluxoER}</strong></span>
            </div>
          )}
        </div>
      </ChartCard>
    );
  }

  // ─── MODO ANO ÚNICO ───────────────────────────────────────────────────────
  const n = entries.length;
  const maxVal = Math.max(...entries.map(([, v]) => v.total), 1);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Math.round((maxVal / tickCount) * i));
  const xPos = (i) => n === 1 ? PAD.left + CHART_W / 2 : PAD.left + (i / (n - 1)) * CHART_W;

  const totalPoints  = entries.map(([, v], i) => ({ x: xPos(i), y: yPos(v.total, maxVal) }));
  const normalPoints = entries.map(([, v], i) => ({ x: xPos(i), y: yPos(v.fluxoNormal, maxVal) }));
  const erPoints     = entries.map(([, v], i) => ({ x: xPos(i), y: yPos(v.fluxoER, maxVal) }));

  return (
    <ChartCard
      title={title}
      icon={TrendingUp}
      actions={displayYears ? <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{displayYears}</span> : undefined}
      forceCollapsed={forceCollapsed}
    >
      <div className="chart-legend-row">
        <span className="chart-legend-dot" style={{ background: 'var(--color-info)' }} />
        <span className="chart-legend-text">Total de UCs</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-normal)' }} />
        <span className="chart-legend-text">Fluxo Normal</span>
        <span className="chart-legend-dot" style={{ background: 'var(--color-er)' }} />
        <span className="chart-legend-text">Eng. Reversa</span>
      </div>

      <div style={{ position: 'relative' }}>
        <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} aria-label={`Line chart — ${title}`}>
          <title>{title}</title>

          {ticks.map((tick) => {
            const y = yPos(tick, maxVal);
            return (
              <g key={tick}>
                <line x1={PAD.left} y1={y} x2={PAD.left + CHART_W} y2={y} stroke="var(--color-border)" strokeWidth={1} />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={8} fill="var(--color-text-muted)">{tick}</text>
              </g>
            );
          })}

          <path d={toSmoothArea(totalPoints,  baseline)} fill="var(--color-info)"   opacity={0.07} />
          <path d={toSmoothArea(normalPoints, baseline)} fill="var(--color-normal)" opacity={0.07} />
          <path d={toSmoothArea(erPoints,     baseline)} fill="var(--color-er)"     opacity={0.09} />

          <path d={toSmoothPath(totalPoints)}  fill="none" stroke="var(--color-info)"   strokeWidth={1.5} strokeLinejoin="round" className="line-path" />
          <path d={toSmoothPath(normalPoints)} fill="none" stroke="var(--color-normal)" strokeWidth={1.5} strokeLinejoin="round" className="line-path" />
          <path d={toSmoothPath(erPoints)}     fill="none" stroke="var(--color-er)"     strokeWidth={1.5} strokeLinejoin="round" className="line-path" />

          {entries.map(([mesKey, v], i) => {
            const x = xPos(i);
            const onEnter = () => setTooltip({ mesKey, total: v.total, normal: v.fluxoNormal, er: v.fluxoER });
            const onLeave = () => setTooltip(null);
            return (
              <g key={mesKey}>
                <circle cx={x} cy={yPos(v.total, maxVal)}       r={dotRadius} fill="var(--color-info)"   stroke="var(--color-surface)" strokeWidth={1.5} style={{ cursor: 'pointer' }} onMouseEnter={onEnter} onMouseLeave={onLeave} />
                <circle cx={x} cy={yPos(v.fluxoNormal, maxVal)} r={dotRadius} fill="var(--color-normal)" stroke="var(--color-surface)" strokeWidth={1.5} style={{ cursor: 'pointer' }} onMouseEnter={onEnter} onMouseLeave={onLeave} />
                <circle cx={x} cy={yPos(v.fluxoER, maxVal)}     r={dotRadius} fill="var(--color-er)"     stroke="var(--color-surface)" strokeWidth={1.5} style={{ cursor: 'pointer' }} onMouseEnter={onEnter} onMouseLeave={onLeave} />
                <text x={x} y={PAD.top + CHART_H + 14} textAnchor="middle" fontSize={8} fill="var(--color-text-muted)">
                  {mesAbbrFromKey(mesKey)}
                </text>
              </g>
            );
          })}
        </svg>

        {tooltip && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{formatMes(tooltip.mesKey)}</span>
            <span>Total: <strong>{tooltip.total}</strong></span>
            <span>Fluxo Normal: <strong>{tooltip.normal}</strong></span>
            <span>Eng. Reversa: <strong>{tooltip.er}</strong></span>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
