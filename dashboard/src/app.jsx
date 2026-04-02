import { useState, useEffect } from 'react';
import './style.css';
import Sidebar from './components/sidebar/Sidebar.jsx';
import HomePage from './pages/HomePage.jsx';
import UseCasePage from './pages/UseCasePage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import TimesheetPage from './pages/TimesheetPage.jsx';
import FeriasPage from './pages/FeriasPage.jsx';
import DayOffPage from './pages/DayOffPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('home');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  if (activePage === 'home') {
    return <HomePage onNavigate={setActivePage} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
      />
      <div className="app-content">
        {activePage === 'casos-de-uso' && <UseCasePage theme={theme} setTheme={setTheme} />}
        {activePage === 'analytics'    && <AnalyticsPage theme={theme} setTheme={setTheme} />}
        {activePage === 'timesheet'    && <TimesheetPage theme={theme} setTheme={setTheme} />}
        {activePage === 'ferias'       && <FeriasPage theme={theme} setTheme={setTheme} />}
        {activePage === 'dayoff'       && <DayOffPage theme={theme} setTheme={setTheme} />}
      </div>
    </div>
  );
}
