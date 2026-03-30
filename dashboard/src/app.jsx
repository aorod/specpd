import { useState, useEffect } from 'react';
import './style.css';
import Sidebar from './components/sidebar/Sidebar.jsx';
import Dashboard from './components/dashboard/Dashboard.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

export default function App() {
  const [activePage, setActivePage] = useState('casos-de-uso');
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded((v) => !v)}
      />
      <div className="app-content">
        {activePage === 'casos-de-uso' && <Dashboard theme={theme} setTheme={setTheme} />}
        {activePage === 'analytics'    && <AnalyticsPage theme={theme} setTheme={setTheme} />}
      </div>
    </div>
  );
}
