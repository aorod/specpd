import { useState } from 'react';
import { Menu, BookOpen, BarChart3, Clock, CalendarRange, Umbrella, House, ChevronRight, LayoutDashboard, Users } from 'lucide-react';
import './Sidebar.css';

const MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    items: [
      { id: 'casos-de-uso', label: 'Casos de Uso', icon: BookOpen },
      { id: 'analytics',    label: 'Analytics',    icon: BarChart3 },
      { id: 'timesheet',    label: 'Timesheet',    icon: Clock },
    ],
  },
  {
    id: 'colaborador',
    label: 'Colaborador',
    icon: Users,
    items: [
      { id: 'ferias', label: 'Férias',          icon: CalendarRange },
      { id: 'dayoff', label: 'DayOff / Abonos', icon: Umbrella },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, expanded, onToggle }) {
  const [openModules, setOpenModules] = useState({ dashboard: true, colaborador: false });

  function toggleModule(id) {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Auto-open module that contains the active page
  function handleNavigate(pageId) {
    onNavigate(pageId);
    MODULES.forEach(mod => {
      if (mod.items.some(item => item.id === pageId)) {
        setOpenModules(prev => ({ ...prev, [mod.id]: true }));
      }
    });
  }

  return (
    <aside className={`sidebar${expanded ? ' is-expanded' : ''}`}>
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Menu">
        <Menu size={18} />
      </button>

      <nav className="sidebar-nav">
        {MODULES.map(({ id, label, icon: ModIcon, items }) => {
          const isOpen = openModules[id];
          const hasActive = items.some(item => item.id === activePage);

          return (
            <div key={id} className="sidebar-module">
              {/* Module header — only meaningful when expanded */}
              <button
                className={`sidebar-module-header${isOpen ? ' is-open' : ''}${hasActive && !isOpen ? ' has-active' : ''}`}
                onClick={() => expanded ? toggleModule(id) : undefined}
                title={!expanded ? label : undefined}
              >
                <ModIcon size={15} className="sidebar-module-icon" />
                <span className="sidebar-module-label">{label}</span>
                <ChevronRight size={12} className="sidebar-module-chevron" />
              </button>

              {/* Sub-items: always visible when collapsed; follow accordion when expanded */}
              <div className={`sidebar-module-items${isOpen || !expanded ? ' is-open' : ''}`}>
                {items.map(({ id: itemId, label: itemLabel, icon: Icon }) => (
                  <button
                    key={itemId}
                    className={`sidebar-item${activePage === itemId ? ' is-active' : ''}`}
                    onClick={() => handleNavigate(itemId)}
                    title={!expanded ? itemLabel : undefined}
                  >
                    <Icon size={16} className="sidebar-item-icon" />
                    <span className="sidebar-item-label">{itemLabel}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          className="sidebar-item"
          onClick={() => onNavigate('home')}
          title={!expanded ? 'Início' : undefined}
        >
          <House size={17} className="sidebar-item-icon" />
          <span className="sidebar-item-label">Início</span>
        </button>
      </div>
    </aside>
  );
}
