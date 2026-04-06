import { BarChart2, CalendarRange, Settings2, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './HomePage.css';

export default function HomePage({ onNavigate }) {
  const { can } = useAuth();

  // Cada card define quais permissões habilitam a sua exibição
  // e para qual página navegar (escolhe a primeira acessível)
  const ALL_CARDS = [
    {
      label: 'Dashboard',
      description: 'Acompanhe casos de uso, métricas e analytics do projeto',
      icon: BarChart2,
      colorClass: 'accent',
      canAccess: can('dashboard', 'casos_de_uso') || can('dashboard', 'analytics'),
      target: can('dashboard', 'casos_de_uso') ? 'casos-de-uso' : 'analytics',
    },
    {
      label: 'Colaboradores',
      description: 'Gerencie solicitações de férias e abonos da equipe',
      icon: CalendarRange,
      colorClass: 'info',
      canAccess: can('ferias', 'acessar') || can('dayoff', 'acessar'),
      target: can('ferias', 'acessar') ? 'ferias' : 'dayoff',
    },
    {
      label: 'Administração',
      description: 'Gerencie usuários, permissões e configurações do sistema',
      icon: Settings2,
      colorClass: 'admin',
      canAccess: can('configuracoes', 'acessar'),
      target: 'configuracoes',
    },
  ].filter(card => card.canAccess);

  return (
    <div className="home-page">

      <div className="home-topbar">
        <ProfileMenu onNavigate={onNavigate} />
      </div>

      <header className="home-header">
        <span className="home-logo-text">SpecPD</span>
        <p className="home-subtitle">Selecione um módulo para continuar</p>
      </header>

      <div className="home-cards">
        {ALL_CARDS.map(({ label, description, icon: Icon, colorClass, target }) => (
          <button
            key={target}
            className={`home-card home-card--${colorClass}`}
            onClick={() => onNavigate(target)}
          >
            <div className={`home-card-icon home-card-icon--${colorClass}`}>
              <Icon size={30} strokeWidth={1.6} />
            </div>
            <div className="home-card-body">
              <h2 className="home-card-title">{label}</h2>
              <p className="home-card-desc">{description}</p>
            </div>
            <ArrowRight size={18} className="home-card-arrow" />
          </button>
        ))}
      </div>

    </div>
  );
}
