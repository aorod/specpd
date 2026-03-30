import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ChartCard({ title, icon: Icon, actions, children, forceCollapsed }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (forceCollapsed !== undefined) setCollapsed(forceCollapsed);
  }, [forceCollapsed]);

  return (
    <div className={`chart-card${collapsed ? ' is-collapsed' : ''}`}>
      <div className="chart-card-header" onClick={() => setCollapsed((o) => !o)}>
        <Icon size={16} />
        <h3>{title}</h3>
        <div className="chart-card-header-spacer" />
        {!collapsed && actions}
        <ChevronDown size={14} className={`chart-card-chevron${collapsed ? ' is-collapsed' : ''}`} />
      </div>
      {!collapsed && <div className="chart-card-body">{children}</div>}
    </div>
  );
}
