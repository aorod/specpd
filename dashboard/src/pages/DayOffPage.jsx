import { useState, useMemo } from 'react';
import { Sun, Moon, Plus, Trash2 } from 'lucide-react';
import { useUCData } from '../hooks/useUCData.js';
import { ANALISTAS } from '../utils/nameAliases.js';
import './DayOffPage.css';

const TIPOS_ABONO = ['Atestado', 'Day Off'];

export default function DayOffPage({ theme, setTheme, menuOpen, onMenuToggle }) {
  const { data: rawData } = useUCData();

  // Mapa: fullName → equipe (derivado dos dados do Azure DevOps)
  const equipeMap = useMemo(() => {
    const map = new Map();
    rawData.forEach((item) => {
      if (item.assignedTo && item.equipe) {
        map.set(item.assignedTo, item.equipe);
      }
    });
    return map;
  }, [rawData]);

  // Form state
  const [analista, setAnalista]     = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim]       = useState('');
  const [tipoAbono, setTipoAbono]   = useState('');

  // Grid state
  const [registros, setRegistros] = useState([]);

  const equipe = analista ? (equipeMap.get(analista) || '—') : '';

  function handleIncluir() {
    if (!analista || !dataInicio || !dataFim || !tipoAbono) return;
    const alias = ANALISTAS.find((a) => a.fullName === analista)?.alias ?? analista;
    setRegistros((prev) => [
      ...prev,
      { id: Date.now(), analista: alias, equipe: equipeMap.get(analista) || '—', dataInicio, dataFim, tipoAbono },
    ]);
    setAnalista('');
    setDataInicio('');
    setDataFim('');
    setTipoAbono('');
  }

  function handleRemover(id) {
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  const formValid = analista && dataInicio && dataFim && tipoAbono;

  return (
    <div className="dayoff-page">

      {/* ── Sticky top ─────────────────────────────────────────────── */}
      <div className="dayoff-sticky-top">
        <button
          className={`app-menu-btn${menuOpen ? ' is-open' : ''}`}
          onClick={onMenuToggle}
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          <span className="hamburger">
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </span>
        </button>

        <header className="dayoff-header">
          <div>
            <h1 className="dayoff-title">DayOff / Abonos</h1>
            <p className="dayoff-subtitle">Registro de ausências e abonos da equipe</p>
          </div>
          <div className="dayoff-header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </header>
      </div>

      {/* ── Formulário ─────────────────────────────────────────────── */}
      <div className="dayoff-form-card">
        <div className="dayoff-form-row">

          <div className="dayoff-field">
            <label className="dayoff-label">Analista</label>
            <select className="dayoff-select" value={analista} onChange={(e) => setAnalista(e.target.value)}>
              <option value="">Selecionar...</option>
              {ANALISTAS.map((a) => (
                <option key={a.fullName} value={a.fullName}>{a.alias}</option>
              ))}
            </select>
          </div>

          <div className="dayoff-field dayoff-field--equipe">
            <label className="dayoff-label">Equipe</label>
            <div className={`dayoff-autofill${equipe && equipe !== '—' ? ' has-value' : ''}`}>
              {equipe || '—'}
            </div>
          </div>

          <div className="dayoff-field dayoff-field--date">
            <label className="dayoff-label">Data Início</label>
            <input
              type="date"
              className="dayoff-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>

          <div className="dayoff-field dayoff-field--date">
            <label className="dayoff-label">Data Fim</label>
            <input
              type="date"
              className="dayoff-input"
              value={dataFim}
              min={dataInicio}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>

          <div className="dayoff-field">
            <label className="dayoff-label">Tipo de Abono</label>
            <select className="dayoff-select" value={tipoAbono} onChange={(e) => setTipoAbono(e.target.value)}>
              <option value="">Selecionar...</option>
              {TIPOS_ABONO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="dayoff-field dayoff-field--btn">
            <label className="dayoff-label">&nbsp;</label>
            <button
              className={`dayoff-incluir-btn${formValid ? ' is-ready' : ''}`}
              onClick={handleIncluir}
              disabled={!formValid}
            >
              <Plus size={15} />
              Incluir
            </button>
          </div>

        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────── */}
      <div className="dayoff-grid-card">
        <div className="dayoff-grid-header">
          <span className="dayoff-grid-title">Registros</span>
          <span className="dayoff-grid-count">
            {registros.length} {registros.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        <div className="dayoff-table-wrapper">
          <table className="dayoff-table">
            <thead>
              <tr>
                <th>Analista</th>
                <th>Equipe</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                <th>Tipo de Abono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={6} className="dayoff-empty">
                    Nenhum registro adicionado. Preencha os campos acima e clique em Incluir.
                  </td>
                </tr>
              ) : (
                registros.map((r) => (
                  <tr key={r.id}>
                    <td className="dayoff-td--analista">{r.analista}</td>
                    <td>{r.equipe}</td>
                    <td>{formatDate(r.dataInicio)}</td>
                    <td>{formatDate(r.dataFim)}</td>
                    <td>
                      <span className={`dayoff-badge dayoff-badge--${r.tipoAbono === 'Day Off' ? 'dayoff' : 'atestado'}`}>
                        {r.tipoAbono}
                      </span>
                    </td>
                    <td>
                      <button className="dayoff-remove-btn" onClick={() => handleRemover(r.id)} title="Remover">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
