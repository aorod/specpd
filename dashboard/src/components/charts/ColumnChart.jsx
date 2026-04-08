import { useState } from 'react';
import { Users, ArrowDownUp } from 'lucide-react';
import { aliasName } from '../../utils/nameAliases.js';
import { formatHoras } from '../../utils/formatters.js';
import ChartCard from './ChartCard.jsx';
import './Charts.css';

const COL_W    = 36;
const COL_GAP  = 16;
const BAR_H    = 160;
const PAD_X    = 12;
const PAD_TOP  = 24; // extra top padding to accommodate value labels above reference dots
const LABEL_H  = 40;
const COUNT_H  = 18;
const SVG_H    = PAD_TOP + BAR_H + COUNT_H + LABEL_H;

/**
 * perColumnLines: array of { values: Map<key, number>, color: string, label: string, showLabels?: boolean }
 * Each line is rendered as a dashed polyline connecting per-column dots, with optional value labels.
 * perColumnLines[0] = Meta do Mês (blue), perColumnLines[1] = Meta do Dia (green)
 */
export default function ColumnChart({ data, forceCollapsed, title = 'Designer', tooltipLabel = 'Total', perColumnLines = [] }) {
  const [tooltip, setTooltip]         = useState(null);
  const [asc, setAsc]                 = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);

  const entries = [...data.entries()].sort(([, a], [, b]) =>
    asc ? a.total - b.total : b.total - a.total
  );

  const maxTotal  = Math.max(
    ...entries.map(([, v]) => v.total),
    ...perColumnLines.flatMap((l) => [...(l.values?.values() ?? [])]),
    1,
  );
  const MIN_SLOTS = 15;
  const slots     = Math.max(entries.length, MIN_SLOTS);
  const svgW      = PAD_X * 2 + slots * COL_W + Math.max(0, slots - 1) * COL_GAP;

  // Pre-compute column center X positions (same formula as bar rendering)
  const colCenters = entries.map((_, i) => {
    const offset = ((slots - entries.length) * (COL_W + COL_GAP)) / 2;
    const x = PAD_X + offset + i * (COL_W + COL_GAP);
    return x + COL_W / 2;
  });

  const handleBarClick = (key) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  };

  // Compute mini-card values for selected analista
  const metaMesLine = perColumnLines[0] ?? null;
  const metaDiaLine = perColumnLines.length > 1 ? perColumnLines[1] : null;

  const selEffort   = selectedKey != null ? (data.get(selectedKey)?.total ?? 0) : null;
  const selMetaMes  = selectedKey != null && metaMesLine ? (metaMesLine.values?.get(selectedKey) ?? 0) : null;
  const selMetaDia  = selectedKey != null && metaDiaLine ? (metaDiaLine.values?.get(selectedKey) ?? 0) : null;

  const miniCards = [
    {
      label: 'Horas Trabalhadas',
      value: selEffort !== null ? formatHoras(selEffort) : '--',
      accent: 'var(--color-text-primary)',
    },
    {
      label: 'Horas Faltantes Mês',
      value: selEffort !== null && selMetaMes !== null ? formatHoras(selEffort - selMetaMes) : '--',
      accent: selEffort !== null && selMetaMes !== null
        ? (selEffort < selMetaMes ? 'var(--color-error, #ef4444)' : 'var(--color-success, #22c55e)')
        : 'var(--color-text-primary)',
    },
    {
      label: 'Horas Faltantes Dia',
      value: selEffort !== null && selMetaDia !== null ? formatHoras(selEffort - selMetaDia) : '--',
      accent: selEffort !== null && selMetaDia !== null
        ? (selEffort < selMetaDia ? 'var(--color-error, #ef4444)' : 'var(--color-success, #22c55e)')
        : 'var(--color-text-primary)',
    },
    {
      label: 'Total Mês Individual',
      value: selMetaMes !== null ? formatHoras(selMetaMes) : '--',
      accent: 'var(--color-accent)',
    },
  ];

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
      {/* Legend */}
      {perColumnLines.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingBottom: 8, paddingLeft: 4 }}>
          {perColumnLines.map((line) => (
            <div key={line.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width={28} height={10}>
                <line x1={0} y1={5} x2={28} y2={5} stroke={line.color} strokeWidth={2} strokeDasharray="5,3" />
                <circle cx={14} cy={5} r={2.5} fill={line.color} />
              </svg>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>{line.label}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'relative', overflowX: 'auto' }}>
        <svg
          width="100%"
          viewBox={`0 0 ${svgW} ${SVG_H}`}
          aria-label={`Barras verticais — ${title}`}
          style={{ minWidth: entries.length > 6 ? `${svgW}px` : undefined }}
        >
          <title>{title}</title>

          {/* Per-column reference lines (dashed polylines with dots and optional value labels) */}
          {perColumnLines.map((line) => {
            if (!entries.length) return null;

            const showLabels = line.showLabels !== false;

            const points = entries.map(([key], i) => {
              const value = line.values?.get(key) ?? 0;
              const refY  = PAD_TOP + BAR_H - (value / maxTotal) * BAR_H;
              return { cx: colCenters[i], refY, value, key };
            });

            const polylinePoints = points.map((p) => `${p.cx},${p.refY}`).join(' ');

            return (
              <g key={line.label}>
                {/* Dashed connecting line */}
                <polyline
                  points={polylinePoints}
                  fill="none"
                  stroke={line.color}
                  strokeWidth={1.5}
                  strokeDasharray="6,4"
                  opacity={0.85}
                />

                {/* Optional value label per column (no dots) */}
                {showLabels && points.map(({ cx, refY, value, key }) => (
                  <text
                    key={key}
                    x={cx}
                    y={refY - 5}
                    textAnchor="middle"
                    fontSize={8}
                    fontWeight="600"
                    fill={line.color}
                    opacity={0.9}
                  >
                    {formatHoras(value)}
                  </text>
                ))}
              </g>
            );
          })}

          {/* Bars */}
          {entries.map(([key, { total }], i) => {
            const barH   = (total / maxTotal) * BAR_H;
            const offset = ((slots - entries.length) * (COL_W + COL_GAP)) / 2;
            const x      = PAD_X + offset + i * (COL_W + COL_GAP);
            const barY  = PAD_TOP + (BAR_H - barH);
            const cx    = x + COL_W / 2;

            const isSelected  = selectedKey === key;
            const hasSelection = selectedKey !== null;

            const name  = aliasName(key);
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

            // Opacity logic: selected = full, others dimmed when a selection exists, hover = tooltip
            const opacity = hasSelection
              ? (isSelected ? 1 : 0.25)
              : (tooltip && tooltip.key !== key ? 0.4 : 1);

            return (
              <g key={key} style={{ cursor: 'pointer' }} onClick={() => handleBarClick(key)}>
                {barH > 0 && (
                  <rect
                    x={x}
                    y={barY}
                    width={COL_W}
                    height={barH}
                    rx={3}
                    fill={isSelected ? 'var(--color-accent)' : 'var(--color-accent)'}
                    opacity={opacity}
                    className="v-bar"
                    style={{ animationDelay: `${i * 40}ms` }}
                    onMouseEnter={() => !hasSelection && setTooltip({ key, total })}
                    onMouseLeave={() => setTooltip(null)}
                  />
                )}

                {/* Valor realizado acima da barra */}
                <text
                  x={cx}
                  y={barY - 3}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight="600"
                  fill="var(--color-accent)"
                  opacity={hasSelection && !isSelected ? 0.25 : 1}
                >
                  {formatHoras(total)}
                </text>

                {/* Label abaixo da barra */}
                {labelLines.map((line, li) => (
                  <text
                    key={li}
                    x={cx}
                    y={PAD_TOP + BAR_H + COUNT_H + li * 13}
                    textAnchor="middle"
                    fontSize={8.5}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
                    opacity={hasSelection && !isSelected ? 0.4 : 1}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>

        {tooltip && !selectedKey && (
          <div className="chart-tooltip">
            <span className="chart-tooltip-label">{aliasName(tooltip.key)}</span>
            <span>{tooltipLabel}: <strong>{formatHoras(tooltip.total)}</strong></span>
          </div>
        )}
      </div>

      {/* Mini cards — shown when an analista bar is clicked */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 10,
        marginTop: 14,
        borderTop: '1px solid var(--color-border)',
        paddingTop: 14,
      }}>
        {miniCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--color-surface-2, var(--color-surface))',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              {card.label}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: card.value === '--' ? 'var(--color-text-muted)' : card.accent }}>
              {card.value}
            </span>
            {selectedKey && (
              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}>
                {aliasName(selectedKey)}
              </span>
            )}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}
