import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart2, List } from 'lucide-react';

const COLORS = ['#0078d4', '#107c10', '#d83b01', '#ffb900', '#8764b8', '#038387'];

function groupBy(items, field) {
  const counts = items.reduce((acc, item) => {
    const key = item[field] || 'Desconhecido';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, count]) => ({ name, count }));
}

export default function Charts({ data = [] }) {
  const byState = groupBy(data, 'State');
  const byType = groupBy(data, 'WorkItemType');

  return (
    <div className="charts">
      <div className="charts-header">
        <BarChart2 size={20} />
        <span>Work Items — {data.length} total</span>
      </div>

      {byState.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Por Estado</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byState} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Itens" radius={[4, 4, 0, 0]}>
                {byState.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {byType.length > 0 && (
        <div className="chart-section">
          <h3 className="chart-title">Por Tipo</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byType} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Itens" radius={[4, 4, 0, 0]}>
                {byType.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="chart-section">
        <div className="charts-list-header">
          <List size={16} />
          <h3 className="chart-title">Lista de Itens</h3>
        </div>
        <ul className="charts-list">
          {data.map((item, index) => (
            <li key={item.WorkItemId ?? index} className="charts-item">
              <span className="charts-item-id">#{item.WorkItemId}</span>
              <span className="charts-item-title">{item.Title}</span>
              {item.State && (
                <span className="charts-item-badge">{item.State}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
