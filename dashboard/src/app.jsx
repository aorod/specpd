import { useState, useEffect } from 'react';
import './style.css';
import Sidebar from './components/sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage.jsx';
import UseCasePage from './pages/UseCasePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import TimesheetPage from './pages/TimesheetPage.jsx';
import FeriasPage from './pages/FeriasPage.jsx';
import DayOffPage from './pages/DayOffPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const menuProps = { menuOpen: flyoutOpen, onMenuToggle: () => setFlyoutOpen(v => !v), onNavigate: setActivePage };

  if (activePage === 'home') {
    return <HomePage onNavigate={setActivePage} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        open={flyoutOpen}
        onClose={() => setFlyoutOpen(false)}
      />

      <div className="app-content">
        {activePage === 'casos-de-uso' && <UseCasePage theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'analytics'    && <AnalyticsPage theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'timesheet'    && <TimesheetPage theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'ferias'       && <FeriasPage theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'dayoff'       && <DayOffPage theme={theme} setTheme={setTheme} {...menuProps} />}
        {activePage === 'calendario'   && <CalendarPage theme={theme} setTheme={setTheme} {...menuProps} />}
      </div>
    </div>
  );
}
