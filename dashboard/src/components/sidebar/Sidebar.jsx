import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, BarChart3, Clock, CalendarRange, Umbrella,
  House, ChevronDown, LayoutDashboard, Users, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Sidebar.css';

// Mapeamento de permissão por item de navegação
const ITEM_PERMISSIONS = {
  'casos-de-uso':  { modulo: 'dashboard',     acao: 'casos_de_uso' },
  'analytics':     { modulo: 'dashboard',     acao: 'analytics' },
  'timesheet':     { modulo: 'timesheet',     acao: 'acessar' },
  'ferias':        { modulo: 'ferias',        acao: 'acessar' },
  'dayoff':        { modulo: 'dayoff',        acao: 'acessar' },
  'configuracoes': { modulo: 'configuracoes', acao: 'acessar' },
};

const ALL_MODULES = [
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
      { id: 'ferias',    label: 'Férias',          icon: CalendarRange },
      { id: 'dayoff',    label: 'DayOff / Abonos', icon: Umbrella },
    ],
  },
  {
    id: 'administracao',
    label: 'Administração',
    icon: ShieldCheck,
    items: [
      { id: 'configuracoes', label: 'Configurações', icon: ShieldCheck },
    ],
  },
];

export default function Sidebar({ activePage, onNavigate, open, onClose }) {
  const { can } = useAuth();

  // Filtra itens e módulos com base nas permissões do usuário
  const modules = ALL_MODULES
    .map(mod => ({
      ...mod,
      items: mod.items.filter(item => {
        const perm = ITEM_PERMISSIONS[item.id];
        return perm ? can(perm.modulo, perm.acao) : true;
      }),
    }))
    .filter(mod => mod.items.length > 0);

  const initialOpen = Object.fromEntries(modules.map(m => [m.id, false]));
  const [openModules, setOpenModules] = useState(initialOpen);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const btn = document.querySelector('.app-menu-btn');
    if (!btn) return;
    const { left } = btn.getBoundingClientRect();
    panelRef.current.style.left = `${left}px`;
  }, [open]);

  function toggleModule(id) {
    setOpenModules(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleNavigate(pageId) {
    onNavigate(pageId);
    onClose();
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
      <aside ref={panelRef} className={`float-menu${open ? ' is-open' : ''}`} aria-label="Menu de navegação">

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
          {modules.map(({ id, label, icon: ModIcon, items }) => {
            const isOpen = openModules[id] ?? false;
            const hasActive = items.some(item => item.id === activePage);

            return (
              <div key={id} className="float-module">
                <button
                  className={`float-module-header${isOpen ? ' is-open' : ''}${hasActive ? ' has-active' : ''}`}
                  onClick={() => toggleModule(id)}
                >
                  <div className="float-module-icon-wrap">
                    <ModIcon size={15} />
                  </div>
                  <span className="float-module-label">{label}</span>
                  <ChevronDown size={14} className="float-module-chevron" />
                </button>

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
