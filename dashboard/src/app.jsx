import { LayoutDashboard, RefreshCw, AlertCircle } from 'lucide-react';
import Charts from './components/charts.jsx';
import { useAnalytics } from './hooks/useAnalytics.js';
import './style.css';

export default function App() {
  const { data, loading, error } = useAnalytics();

  return (
    <div className="app">
      <header className="app-header">
        <LayoutDashboard size={24} />
        <h1>Roadmap 2025</h1>
      </header>
      <main className="app-main">
        {loading && (
          <div className="status">
            <RefreshCw size={18} className="spin" />
            <span>Carregando...</span>
          </div>
        )}
        {error && (
          <div className="status error">
            <AlertCircle size={18} />
            <span>{error.message}</span>
          </div>
        )}
        {!loading && !error && <Charts data={data} />}
      </main>
    </div>
  );
}
