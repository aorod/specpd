import { useState } from 'react';
import { BookOpen, BarChart3, Clock, CalendarRange, Umbrella, House, ChevronDown, LayoutDashboard, Users } from 'lucide-react';
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

export default function Sidebar({ activePage, onNavigate, open, onClose }) {
  const [openModules, setOpenModules] = useState({ dashboard: true, colaborador: false });

  function toggleModule(id) {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleNavigate(pageId) {
    onNavigate(pageId);
    onClose();
    MODULES.forEach(mod => {
      if (mod.items.some(item => item.id === pageId)) {
        setOpenModules(prev => ({ ...prev, [mod.id]: true }));
      }
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`float-backdrop${open ? ' is-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Floating panel */}
      <aside className={`float-menu${open ? ' is-open' : ''}`} aria-label="Menu de navegação">

        {/* Início — topo */}
        <div className="float-top">
          <button
            className="float-footer-btn"
            onClick={() => { onNavigate('home'); onClose(); }}
          >
            <House size={15} />
            <span>Início</span>
          </button>
        </div>

        {/* Stacked modules */}
        <nav className="float-nav">
          {MODULES.map(({ id, label, icon: ModIcon, items }) => {
            const isOpen = openModules[id];

            return (
              <div key={id} className="float-module">
                {/* Module header */}
                <button
                  className={`float-module-header${isOpen ? ' is-open' : ''}`}
                  onClick={() => toggleModule(id)}
                >
                  <div className="float-module-icon-wrap">
                    <ModIcon size={15} />
                  </div>
                  <span className="float-module-label">{label}</span>
                  <ChevronDown size={14} className="float-module-chevron" />
                </button>

                {/* Sub-items */}
                <div className={`float-module-items${isOpen ? ' is-open' : ''}`}>
                  {items.map(({ id: itemId, label: itemLabel, icon: Icon }) => (
                    <button
                      key={itemId}
                      className={`float-item${activePage === itemId ? ' is-active' : ''}`}
                      onClick={() => handleNavigate(itemId)}
                    >
                      <div className="float-item-icon-wrap">
                        <Icon size={15} />
                      </div>
                      <span className="float-item-label">{itemLabel}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="float-footer" />

      </aside>
    </>
  );
}
