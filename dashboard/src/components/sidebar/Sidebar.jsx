import { Menu, BookOpen, BarChart3 } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
  { id: 'casos-de-uso', label: 'Casos de Uso', icon: BookOpen },
  { id: 'analytics',    label: 'Analytics',    icon: BarChart3 },
];

export default function Sidebar({ activePage, onNavigate, expanded, onToggle }) {
  return (
    <aside className={`sidebar${expanded ? ' is-expanded' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Menu">
        <Menu size={18} />
      </button>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`sidebar-item${activePage === id ? ' is-active' : ''}`}
            onClick={() => onNavigate(id)}
            title={!expanded ? label : undefined}
          >
            <Icon size={17} className="sidebar-item-icon" />
            <span className="sidebar-item-label">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}
