import { useState, useCallback } from 'react';
import { useCasosDeUsoHistorico } from './useCasosDeUsoHistorico.js';

const BATCH_SIZE = 50;

/** Estados considerados "finalização" do ciclo de vida */
const DONE_STATES = new Set(['Concluído', 'Finalizado', 'Fechado', 'Done', 'Closed', 'Resolved']);

/** Ordem ordinal para detectar retrogressão de estado */
const STATE_ORDER = {
  'Novo': 0, 'Active': 1, 'Em Design': 1,
  'Em Desenvolvimento': 2, 'Em teste': 3, 'Aguardando Deploy': 4,
  'Concluído': 5, 'Fechado': 6,
};

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function roundDays(ms) {
  return Math.round(ms / 86_400_000 * 10) / 10;
}

/** Constrói estatísticas de tempo para um mapa state→[durationDays] */
function buildTimeStats(durationsMap) {
  const result = new Map();
  for (const [key, durations] of durationsMap) {
    if (!durations.length) continue;
    const avg    = durations.reduce((s, v) => s + v, 0) / durations.length;
    const med    = median(durations);
    const sorted = [...durations].sort((a, b) => a - b);
    result.set(key, {
      avg:    Math.round(avg * 10) / 10,
      median: Math.round(med * 10) / 10,
      max:    Math.round(Math.max(...durations) * 10) / 10,
      p75:    Math.round((sorted[Math.floor(sorted.length * 0.75)] ?? 0) * 10) / 10,
      count:  durations.length,
    });
  }
  // ordena por avg desc
  return new Map([...result.entries()].sort(([, a], [, b]) => b.avg - a.avg));
}

/**
 * Agrega uma lista de updates (já filtrados por data/itens) em todas as
 * métricas estratégicas: churn, usuários, meses, campos, retrogressões,
 * tempo por estado, tempo por sub status e lead time.
 */
function aggregateUpdates(updates, titleMap) {
  const byItem           = new Map(); // id → { count, title }
  const byUser           = new Map(); // userName → count
  const byMonth          = new Map(); // 'YYYY-MM' → count
  const byField          = new Map(); // fieldLabel → count
  const ownerChanges     = new Map(); // id → count
  const stateRegressions = new Map(); // id → count

  const itemStateEvents      = new Map(); // id → [{date, to}]
  const itemSubStatusEvents  = new Map(); // id → [{date, to}]
  const titleEvents          = new Map(); // id → [{date, oldTitle, newTitle}]
  const subStatusChanges     = new Map(); // id → [{date, oldStatus, newStatus}]
  const firstUpdateDate      = new Map(); // id → Date (mais antigo)

  for (const update of updates) {
    const { workItemId, revisedBy, revisedDate, fields } = update;

    if (!byItem.has(workItemId)) {
      byItem.set(workItemId, { count: 0, title: titleMap.get(workItemId) || '' });
    }
    byItem.get(workItemId).count += 1;

    const uDate = revisedDate ? new Date(revisedDate) : null;
    if (uDate) {
      const prev = firstUpdateDate.get(workItemId);
      if (!prev || uDate < prev) firstUpdateDate.set(workItemId, uDate);
    }

    if (revisedBy) byUser.set(revisedBy, (byUser.get(revisedBy) || 0) + 1);

    if (revisedDate) {
      const d   = new Date(revisedDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    }

    for (const f of fields || []) {
      byField.set(f.label, (byField.get(f.label) || 0) + 1);

      if (f.field === 'System.AssignedTo') {
        ownerChanges.set(workItemId, (ownerChanges.get(workItemId) || 0) + 1);
      }

      // ── Estado (State) ─────────────────────────────────────────────────────
      if (f.field === 'System.State' && revisedDate) {
        if (f.oldValue && f.newValue) {
          const prev = STATE_ORDER[f.oldValue] ?? -1;
          const next = STATE_ORDER[f.newValue] ?? -1;
          if (prev > 0 && next >= 0 && next < prev) {
            stateRegressions.set(workItemId, (stateRegressions.get(workItemId) || 0) + 1);
          }
        }
        if (!itemStateEvents.has(workItemId)) itemStateEvents.set(workItemId, []);
        itemStateEvents.get(workItemId).push({ date: new Date(revisedDate), to: f.newValue || null });
      }

      // ── Sub Status ─────────────────────────────────────────────────────────
      if (f.field === 'Custom.SubStatus' && revisedDate) {
        if (!itemSubStatusEvents.has(workItemId)) itemSubStatusEvents.set(workItemId, []);
        itemSubStatusEvents.get(workItemId).push({ date: new Date(revisedDate), to: f.newValue || null });

        if (f.oldValue || f.newValue) {
          if (!subStatusChanges.has(workItemId)) subStatusChanges.set(workItemId, []);
          subStatusChanges.get(workItemId).push({
            date:      new Date(revisedDate),
            oldStatus: f.oldValue || '',
            newStatus: f.newValue || '',
          });
        }
      }

      // ── Título ─────────────────────────────────────────────────────────────
      if (f.field === 'System.Title' && revisedDate && (f.oldValue || f.newValue)) {
        if (!titleEvents.has(workItemId)) titleEvents.set(workItemId, []);
        titleEvents.get(workItemId).push({
          date:     new Date(revisedDate),
          oldTitle: f.oldValue || '',
          newTitle: f.newValue || '',
        });
      }
    }
  }

  // ── Tempo por Estado ────────────────────────────────────────────────────────
  const stateDurations     = new Map();
  const subStatusDurations = new Map();
  // per-item: state/substatus → Map<id, number[]>
  const stateItemDurMap     = new Map();
  const subStatusItemDurMap = new Map();

  function computeDurations(eventsMap, durationsMap, itemDurMap) {
    for (const [id, events] of eventsMap) {
      const sorted = [...events].filter(e => e.to).sort((a, b) => a.date - b.date);
      for (let i = 0; i < sorted.length - 1; i++) {
        const days  = roundDays(sorted[i + 1].date - sorted[i].date);
        if (days < 0) continue;
        const state = sorted[i].to;
        if (!durationsMap.has(state)) durationsMap.set(state, []);
        durationsMap.get(state).push(days);
        // per-item tracking
        if (!itemDurMap.has(state)) itemDurMap.set(state, new Map());
        const itemMap = itemDurMap.get(state);
        if (!itemMap.has(id)) itemMap.set(id, []);
        itemMap.get(id).push(days);
      }
    }
  }

  computeDurations(itemStateEvents,     stateDurations,     stateItemDurMap);
  computeDurations(itemSubStatusEvents, subStatusDurations, subStatusItemDurMap);

  const avgTimePerState     = buildTimeStats(stateDurations);
  const avgTimePerSubStatus = buildTimeStats(subStatusDurations);

  /** Constrói lista de itens por estado/substatus com avg e max individuais */
  function buildItemList(itemDurMap) {
    const result = new Map();
    for (const [state, itemMap] of itemDurMap) {
      const items = [];
      for (const [id, durations] of itemMap) {
        const avg = durations.reduce((s, v) => s + v, 0) / durations.length;
        items.push({
          id,
          title: titleMap.get(id) || id,
          avg:   Math.round(avg * 10) / 10,
          max:   Math.round(Math.max(...durations) * 10) / 10,
        });
      }
      items.sort((a, b) => b.max - a.max);
      result.set(state, items);
    }
    return result;
  }

  const stateItemList     = buildItemList(stateItemDurMap);
  const subStatusItemList = buildItemList(subStatusItemDurMap);

  // ── Histórico de Títulos ────────────────────────────────────────────────────
  const titleHistoryMap = new Map();
  const now = new Date();
  for (const [id, events] of titleEvents) {
    const sorted  = [...events].sort((a, b) => a.date - b.date);
    const history = [];

    // Título original: o oldTitle da primeira alteração registrada
    if (sorted[0]?.oldTitle) {
      const creationDate = firstUpdateDate.get(id) || sorted[0].date;
      const days = roundDays(sorted[0].date - creationDate);
      history.push({
        title:     sorted[0].oldTitle,
        days:      Math.max(0, days),
        startDate: creationDate.toISOString(),
        endDate:   sorted[0].date.toISOString(),
      });
    }

    // Cada novo título após uma alteração
    for (let i = 0; i < sorted.length; i++) {
      const isLast  = i + 1 >= sorted.length;
      const endDate = isLast ? now : sorted[i + 1].date;
      const days    = roundDays(endDate - sorted[i].date);
      history.push({
        title:     sorted[i].newTitle,
        days:      Math.max(0, days),
        startDate: sorted[i].date.toISOString(),
        endDate:   isLast ? null : endDate.toISOString(), // null = título atual
      });
    }

    if (history.length > 0) titleHistoryMap.set(id, history);
  }

  // ── Histórico de SubStatus ──────────────────────────────────────────────────
  const subStatusHistoryMap = new Map();
  for (const [id, events] of subStatusChanges) {
    const sorted  = [...events].sort((a, b) => a.date - b.date);
    const history = [];

    if (sorted[0]?.oldStatus) {
      const creationDate = firstUpdateDate.get(id) || sorted[0].date;
      const days = roundDays(sorted[0].date - creationDate);
      history.push({
        title:     sorted[0].oldStatus,
        days:      Math.max(0, days),
        startDate: creationDate.toISOString(),
        endDate:   sorted[0].date.toISOString(),
      });
    }

    for (let i = 0; i < sorted.length; i++) {
      const isLast  = i + 1 >= sorted.length;
      const endDate = isLast ? now : sorted[i + 1].date;
      const days    = roundDays(endDate - sorted[i].date);
      history.push({
        title:     sorted[i].newStatus,
        days:      Math.max(0, days),
        startDate: sorted[i].date.toISOString(),
        endDate:   isLast ? null : endDate.toISOString(),
      });
    }

    if (history.length > 0) subStatusHistoryMap.set(id, history);
  }

  // ── Correlaciona substatus com o título ativo em cada período ───────────────
  for (const [id, subHistory] of subStatusHistoryMap) {
    const titleHistory = titleHistoryMap.get(id);
    for (const subEntry of subHistory) {
      if (!titleHistory || !subEntry.startDate) {
        subEntry.titleAtTime = null;
        continue;
      }
      const subStart = new Date(subEntry.startDate);
      const match = titleHistory.find(th => {
        const tStart = new Date(th.startDate);
        const tEnd   = th.endDate ? new Date(th.endDate) : new Date(8640000000000000);
        return subStart >= tStart && subStart < tEnd;
      });
      subEntry.titleAtTime = match?.title ?? null;
    }
  }

  // ── Lead Time ───────────────────────────────────────────────────────────────
  const leadTimes = [];
  for (const [id, events] of itemStateEvents) {
    const sorted    = [...events].filter(e => e.to).sort((a, b) => a.date - b.date);
    const createdAt = firstUpdateDate.get(id) || sorted[0]?.date;
    if (!createdAt) continue;
    const doneEvent = sorted.find(ev => DONE_STATES.has(ev.to));
    if (!doneEvent) continue;
    const durationDays = roundDays(doneEvent.date - createdAt);
    if (durationDays < 0) continue;
    leadTimes.push({
      workItemId:  id,
      title:       titleMap.get(id) || id,
      durationDays,
      finalState:  doneEvent.to,
      createdAt:   createdAt.toISOString(),
      finalizedAt: doneEvent.date.toISOString(),
    });
  }
  leadTimes.sort((a, b) => b.durationDays - a.durationDays);

  const ltValues = leadTimes.map(l => l.durationDays);
  const leadTimeStats = ltValues.length ? {
    count:  ltValues.length,
    avg:    Math.round(ltValues.reduce((s, v) => s + v, 0) / ltValues.length * 10) / 10,
    median: Math.round(median(ltValues) * 10) / 10,
    min:    Math.min(...ltValues),
    max:    Math.max(...ltValues),
  } : null;

  const ltBuckets = [
    { label: '< 7d',   min: 0,  max: 7,        count: 0 },
    { label: '7–14d',  min: 7,  max: 14,       count: 0 },
    { label: '15–30d', min: 14, max: 30,       count: 0 },
    { label: '31–60d', min: 30, max: 60,       count: 0 },
    { label: '61–90d', min: 60, max: 90,       count: 0 },
    { label: '> 90d',  min: 90, max: Infinity, count: 0 },
  ];
  for (const v of ltValues) {
    const b = ltBuckets.find(b => v >= b.min && v < b.max);
    if (b) b.count += 1;
  }

  // ── Ordenações finais ───────────────────────────────────────────────────────
  const sortDesc   = m => new Map([...m.entries()].sort(([, a], [, b]) => b - a));
  const byMonthAsc = new Map([...byMonth.entries()].sort(([a], [b]) => a.localeCompare(b)));

  return {
    totalUpdates:        updates.length,
    byItem:              new Map([...byItem.entries()].sort(([, a], [, b]) => b.count - a.count)),
    byUser:              sortDesc(byUser),
    byMonth:             byMonthAsc,
    byField:             sortDesc(byField),
    ownerChanges:        sortDesc(ownerChanges),
    stateRegressions:    sortDesc(stateRegressions),
    avgTimePerState,
    avgTimePerSubStatus,
    stateItemList,
    subStatusItemList,
    titleHistoryMap,
    subStatusHistoryMap,
    leadTimes,
    leadTimeStats,
    leadTimeBuckets:     ltBuckets,
  };
}

/**
 * Hook que busca o histórico de todos os itens (em lotes de 50) e expõe
 * uma função `computeInsights` que agrega as métricas para um subconjunto
 * filtrado de itens e intervalo de datas.
 */
export function useInsightsHistory() {
  const { fetchBatchHistory } = useCasosDeUsoHistorico();

  const [rawUpdates, setRawUpdates] = useState([]);
  const [titleMap,   setTitleMap]   = useState(new Map());
  const [loaded,     setLoaded]     = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [progress,   setProgress]   = useState(0);

  const loadHistory = useCallback(async (items) => {
    if (!items?.length) return;
    setLoading(true);
    setError(null);
    setProgress(0);
    try {
      const allUpdates = [];
      const total = Math.ceil(items.length / BATCH_SIZE);
      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batchIds = items.slice(i, i + BATCH_SIZE).map(it => it.id);
        const updates  = await fetchBatchHistory(batchIds);
        allUpdates.push(...updates);
        setProgress(Math.round(((Math.floor(i / BATCH_SIZE) + 1) / total) * 100));
      }
      setRawUpdates(allUpdates);
      setTitleMap(new Map(items.map(it => [it.id, it.title])));
      setLoaded(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
      setProgress(100);
    }
  }, [fetchBatchHistory]);

  /**
   * Agrega métricas para:
   *   - filteredItemIds : Set de IDs a incluir (null = todos)
   *   - dateFrom        : 'YYYY-MM-DD' ou '' (sem limite)
   *   - dateTo          : 'YYYY-MM-DD' ou '' (sem limite)
   */
  const computeInsights = useCallback((filteredItemIds, dateFrom, dateTo) => {
    if (!rawUpdates.length) return null;

    const fromDate = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const toDate   = dateTo   ? new Date(dateTo   + 'T23:59:59') : null;

    const filtered = rawUpdates.filter(u => {
      if (filteredItemIds && !filteredItemIds.has(u.workItemId)) return false;
      if (!u.revisedDate) return false;
      const d = new Date(u.revisedDate);
      if (fromDate && d < fromDate) return false;
      if (toDate   && d > toDate)   return false;
      return true;
    });

    return aggregateUpdates(filtered, titleMap);
  }, [rawUpdates, titleMap]);

  return { loaded, loading, error, progress, loadHistory, computeInsights };
}
