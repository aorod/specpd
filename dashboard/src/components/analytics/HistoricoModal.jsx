import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Link2 } from 'lucide-react';
import { useCasosDeUsoHistorico } from '../../hooks/useCasosDeUsoHistorico.js';
import './HistoricoModal.css';

const AVATAR_COLORS = [
  '#818cf8', '#34d399', '#f59e0b', '#60a5fa',
  '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c',
];

export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

export function formatDateBR(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

export function renderChangeText(field) {
  if (field.oldValue && field.newValue) {
    return (
      <>
        mudou <strong>{field.label}</strong>{' de '}
        <em className="hmodal-val hmodal-val--old">{field.oldValue}</em>
        {' para '}
        <em className="hmodal-val hmodal-val--new">{field.newValue}</em>
      </>
    );
  }
  if (field.newValue) {
    return (
      <>
        definiu <strong>{field.label}</strong>{': '}
        <em className="hmodal-val hmodal-val--new">{field.newValue}</em>
      </>
    );
  }
  return <>removeu <strong>{field.label}</strong></>;
}

function groupByPeriod(updates) {
  const now = Date.now();
  const WEEK  = 7  * 86_400_000;
  const MONTH = 30 * 86_400_000;
  const groups = [
    { label: 'Última semana',   updates: [] },
    { label: 'Últimos 30 dias', updates: [] },
    { label: 'Mais antigos',    updates: [] },
  ];
  for (const u of updates) {
    const diff = now - new Date(u.revisedDate).getTime();
    if      (diff <= WEEK)  groups[0].updates.push(u);
    else if (diff <= MONTH) groups[1].updates.push(u);
    else                    groups[2].updates.push(u);
  }
  return groups.filter(g => g.updates.length > 0);
}

export default function HistoricoModal({ item, onClose }) {
  const { fetchItemHistory } = useCasosDeUsoHistorico();
  const [updates, setUpdates]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  useEffect(() => {
    const numId = String(item.id).replace(/^(UC|TS)-/, '');
    setLoading(true);
    setError(null);
    fetchItemHistory(numId)
      .then(setUpdates)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [item.id, fetchItemHistory]);

  const groups = groupByPeriod(updates);

  return (
    <div className="hmodal-overlay" onClick={onClose}>
      <div className="hmodal-drawer" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="hmodal-header">
          <div className="hmodal-header-info">
            <span className="hmodal-id">{item.id}</span>
            <h2 className="hmodal-title" title={item.title}>{item.title}</h2>
          </div>
          <button className="hmodal-close" onClick={onClose} aria-label="Fechar histórico">
            <X size={18} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="hmodal-body">

          {loading && (
            <div className="hmodal-status">
              <RefreshCw size={15} className="spin" />
              <span>Buscando histórico...</span>
            </div>
          )}

          {!loading && error && (
            <div className="hmodal-status hmodal-status--error">
              <AlertCircle size={15} />
              <span>{error.message}</span>
            </div>
          )}

          {!loading && !error && updates.length === 0 && (
            <div className="hmodal-empty">Nenhuma alteração registrada para este item.</div>
          )}

          {!loading && !error && groups.map(group => (
            <div key={group.label} className="hmodal-group">
              <div className="hmodal-group-label">{group.label}</div>

              {group.updates.map(update => (
                <div key={update.id} className="hmodal-item">
                  <div
                    className="hmodal-avatar"
                    style={{ background: getAvatarColor(update.revisedBy) }}
                    title={update.revisedBy}
                  >
                    {getInitials(update.revisedBy)}
                  </div>

                  <div className="hmodal-item-content">
                    <span className="hmodal-author">{update.revisedBy}</span>
                    <div className="hmodal-changes">
                      {update.fields.map((f, i) => (
                        <div key={i} className="hmodal-change-line">
                          {renderChangeText(f)}
                        </div>
                      ))}
                      {update.relations?.added > 0 && (
                        <div className="hmodal-change-line hmodal-change-line--link">
                          <Link2 size={11} />
                          <span>adicionou {update.relations.added} vínculo{update.relations.added > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {update.relations?.removed > 0 && (
                        <div className="hmodal-change-line hmodal-change-line--removed">
                          <Link2 size={11} />
                          <span>removeu {update.relations.removed} vínculo{update.relations.removed > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <span className="hmodal-date">{formatDateBR(update.revisedDate)}</span>
                </div>
              ))}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
