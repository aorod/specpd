import { Link2 } from 'lucide-react';
import {
  getInitials,
  getAvatarColor,
  renderChangeText,
} from './HistoricoModal.jsx';
import './HistoricoModal.css';

function groupByDay(updates) {
  const groups = new Map();
  for (const u of updates) {
    const day = new Date(u.revisedDate).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(u);
  }
  return [...groups.entries()].map(([day, items]) => ({ day, items }));
}

export default function HistoricoTimeline({ updates, itemsMap }) {
  if (!updates || updates.length === 0) return null;

  const groups = groupByDay(updates);

  return (
    <div className="htimeline">
      {groups.map(({ day, items }) => (
        <div key={day} className="htimeline-day">
          <div className="htimeline-day-label">{day}</div>

          {items.map((update, idx) => {
            const title = itemsMap?.get(update.workItemId) || '';
            const time  = new Date(update.revisedDate).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit',
            });

            return (
              <div key={`${update.workItemId}-${update.id}-${idx}`} className="hmodal-item htimeline-item">
                <div
                  className="hmodal-avatar"
                  style={{ background: getAvatarColor(update.revisedBy) }}
                  title={update.revisedBy}
                >
                  {getInitials(update.revisedBy)}
                </div>

                <div className="hmodal-item-content">
                  <div className="htimeline-item-meta">
                    <span className="hmodal-author">{update.revisedBy}</span>
                    <span className="htimeline-workitem-id">· {update.workItemId}</span>
                    {title && (
                      <span className="htimeline-workitem-title" title={title}>— {title}</span>
                    )}
                  </div>

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

                <span className="hmodal-date">{time}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
