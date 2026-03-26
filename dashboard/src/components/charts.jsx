import { BarChart2 } from 'lucide-react';

export default function Charts({ data = [] }) {
  return (
    <div className="charts">
      <div className="charts-header">
        <BarChart2 size={20} />
        <span>Work Items</span>
      </div>
      <ul className="charts-list">
        {data.map((item, index) => (
          <li key={item.WorkItemId ?? index} className="charts-item">
            <span className="charts-item-id">#{item.WorkItemId}</span>
            {item.Title}
          </li>
        ))}
      </ul>
    </div>
  );
}
