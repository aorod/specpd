import { useState, useEffect } from 'react';
import './index.css';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import Sidebar from './components/sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage.jsx';
import UseCasePage from './pages/UseCasePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import TimesheetPage from './pages/TimesheetPage.jsx';
import FeriasPage from './pages/FeriasPage.jsx';
import DayOffPage from './pages/DayOffPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import ConfiguracoesPage from './pages/ConfiguracoesPage.jsx';

// Permissão necessária para acessar cada página
const PAGE_PERMISSIONS = {
  'casos-de-uso':  { modulo: 'dashboard',     acao: 'casos_de_uso' },
  'analytics':     { modulo: 'dashboard',     acao: 'analytics' },
  'timesheet':     { modulo: 'timesheet',     acao: 'acessar' },
  'ferias':        { modulo: 'ferias',        acao: 'acessar' },
  'dayoff':        { modulo: 'dayoff',        acao: 'acessar' },
  'calendario':    { modulo: 'calendario',    acao: 'acessar' },
  'configuracoes': { modulo: 'configuracoes', acao: 'acessar' },
};

export default function App() {
  const { user, loading, can } = useAuth();
  const [activePage, setActivePage] = useState('home');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Garante que ao fazer logout (ou ao fazer login como outro usuário)
  // o usuário sempre começa na home
  useEffect(() => {
    if (!user) setActivePage('home');
  }, [user]);

  // Aguarda validação do token
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }} />;

  // Não autenticado → tela de login
  if (!user) return <LoginPage />;

  function navigate(pageId) {
    const perm = PAGE_PERMISSIONS[pageId];
    if (perm && !can(perm.modulo, perm.acao)) return;
    setActivePage(pageId);
  }

  const menuProps = { menuOpen: flyoutOpen, onMenuToggle: () => setFlyoutOpen(v => !v), onNavigate: navigate };

  if (activePage === 'home') {
    return <HomePage onNavigate={navigate} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={navigate}
        open={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
      />

      <div className="app-content">
        {activePage === 'casos-de-uso'   && <UseCasePage    theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'analytics'      && <AnalyticsPage  theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'timesheet'      && <TimesheetPage  theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'ferias'         && <FeriasPage     theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'dayoff'         && <DayOffPage     theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'calendario'     && <CalendarPage   theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'configuracoes'  && <ConfiguracoesPage theme={theme} setTheme={setTheme} {...menuProps} />}
      </div>
    </div>
  );
}
