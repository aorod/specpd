import { BarChart2, CalendarRange, ArrowRight } from 'lucide-react';
import './HomePage.css';

const MENU_ITEMS = [
  {
    id: 'casos-de-uso',
    label: 'Dashboard',
    description: 'Acompanhe casos de uso, métricas e analytics do projeto',
    icon: BarChart2,
    colorClass: 'accent',
  },
  {
    id: 'ferias',
    label: 'Colaboradores',
    description: 'Gerencie solicitações de férias e abonos da equipe',
    icon: CalendarRange,
    colorClass: 'info',
  },
];

export default function HomePage({ onNavigate }) {
  return (
    <div className="home-page">
      <header className="home-header">
        <span className="home-logo-text">SpecPD</span>
        <p className="home-subtitle">Selecione um módulo para continuar</p>
      </header>

      <div className="home-cards">
        {MENU_ITEMS.map(({ id, label, description, icon: Icon, colorClass }) => (
          <button
            key={id}
            className={`home-card home-card--${colorClass}`}
            onClick={() => onNavigate(id)}
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
