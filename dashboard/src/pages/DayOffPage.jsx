import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Plus, Trash2, Pencil, Check, X, Settings2 } from 'lucide-react';

function GearMenu({ onEditar, onRemover }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (
        btnRef.current && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
    setOpen(o => !o);
  }

  return (
    <div className="gear-root">
      <button
        ref={btnRef}
        className={`gear-btn${open ? ' is-open' : ''}`}
        onClick={handleOpen}
        title="Ações"
      >
        <Settings2 size={15} />
      </button>
      {open && (
        <div
          ref={dropRef}
          className="gear-dropdown"
          style={{ top: pos.top, left: pos.left }}
        >
          <button className="gear-item gear-item--edit" onClick={() => { onEditar(); setOpen(false); }}>
            <Pencil size={13} />
            Editar
          </button>
          <button className="gear-item gear-item--remove" onClick={() => { onRemover(); setOpen(false); }}>
            <Trash2 size={13} />
            Remover
          </button>
        </div>
      )}
    </div>
  );
}
import { ANALISTAS } from '../utils/nameAliases.js';
import { EQUIPE_MAP } from '../utils/equipeList.js';
import DatePicker from '../components/datepicker/DatePicker.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import './DayOffPage.css';

const TIPOS_ABONO = ['Atestado', 'Day Off'];

export default function DayOffPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  // Form state
  const [analista, setAnalista]     = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim]       = useState('');
  const [tipoAbono, setTipoAbono]   = useState('');

  // Grid state
  const [registros, setRegistros] = useState([]);

  // Editing state
  const [editingId, setEditingId]   = useState(null);
  const [editFields, setEditFields] = useState({});

  // Equipe vem direto do EQUIPE_MAP pelo alias do analista selecionado
  const alias  = ANALISTAS.find((a) => a.fullName === analista)?.alias ?? '';
  const equipe = alias ? (EQUIPE_MAP[alias] || '—') : '';

  function handleIncluir() {
    if (!analista || !dataInicio || !dataFim || !tipoAbono) return;
    setRegistros((prev) => [
      ...prev,
      { id: Date.now(), analista: alias, equipe, dataInicio, dataFim, tipoAbono },
    ]);
    setAnalista('');
    setDataInicio('');
    setDataFim('');
    setTipoAbono('');
  }

  function handleRemover(id) {
    if (editingId === id) setEditingId(null);
    setRegistros((prev) => prev.filter((r) => r.id !== id));
  }

  function handleEditar(r) {
    setEditingId(r.id);
    // Find fullName for the alias
    const found = ANALISTAS.find((a) => a.alias === r.analista);
    setEditFields({
      analista:  found?.fullName ?? '',
      dataInicio: r.dataInicio,
      dataFim:    r.dataFim,
      tipoAbono:  r.tipoAbono,
    });
  }

  function handleSalvar(id) {
    const f = editFields;
    if (!f.analista || !f.dataInicio || !f.dataFim || !f.tipoAbono) return;
    const editAlias  = ANALISTAS.find((a) => a.fullName === f.analista)?.alias ?? f.analista;
    const editEquipe = EQUIPE_MAP[editAlias] || '—';
    setRegistros((prev) =>
      prev.map((r) => r.id === id
        ? { ...r, analista: editAlias, equipe: editEquipe, dataInicio: f.dataInicio, dataFim: f.dataFim, tipoAbono: f.tipoAbono }
        : r
      )
    );
    setEditingId(null);
  }

  function handleCancelar() {
    setEditingId(null);
  }

  function formatDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }

  function calcDiasUteis(isoInicio, isoFim) {
    if (!isoInicio || !isoFim) return 0;
    const [yi, mi, di] = isoInicio.split('-').map(Number);
    const [yf, mf, df] = isoFim.split('-').map(Number);
    const start = new Date(yi, mi - 1, di);
    const end   = new Date(yf, mf - 1, df);
    if (end < start) return 0;
    let count = 0;
    const cur = new Date(start);
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  const formValid   = analista && dataInicio && dataFim && tipoAbono;
  const editValid   = editFields.analista && editFields.dataInicio && editFields.dataFim && editFields.tipoAbono;
  const editAlias   = editingId ? (ANALISTAS.find((a) => a.fullName === editFields.analista)?.alias ?? '') : '';

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
            <ProfileMenu onNavigate={onNavigate} />
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
            <DatePicker value={dataInicio} onChange={setDataInicio} />
          </div>

          <div className="dayoff-field dayoff-field--date">
            <label className="dayoff-label">Data Fim</label>
            <DatePicker value={dataFim} onChange={setDataFim} minDate={dataInicio} />
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
            <colgroup>
              <col /><col /><col /><col /><col /><col /><col />
            </colgroup>
            <thead>
              <tr>
                <th>Analista</th>
                <th>Equipe</th>
                <th>Data Início</th>
                <th>Data Fim</th>
                <th>Dias Úteis</th>
                <th>Tipo de Abono</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {registros.length === 0 ? (
                <tr>
                  <td colSpan={7} className="dayoff-empty">
                    Nenhum registro adicionado. Preencha os campos acima e clique em Incluir.
                  </td>
                </tr>
              ) : (
                registros.map((r) => {
                  const isEditing = editingId === r.id;

                  if (isEditing) {
                    return (
                      <tr key={r.id} className="dayoff-row--editing">
                        {/* Analista */}
                        <td>
                          <select
                            className="dayoff-select dayoff-select--inline"
                            value={editFields.analista}
                            onChange={(e) => setEditFields((f) => ({ ...f, analista: e.target.value }))}
                          >
                            <option value="">Selecionar...</option>
                            {ANALISTAS.map((a) => (
                              <option key={a.fullName} value={a.fullName}>{a.alias}</option>
                            ))}
                          </select>
                        </td>
                        {/* Equipe — auto */}
                        <td className="dayoff-td--muted">
                          {editAlias ? (EQUIPE_MAP[editAlias] || '—') : '—'}
                        </td>
                        {/* Data Início */}
                        <td>
                          <DatePicker
                            value={editFields.dataInicio}
                            onChange={(v) => setEditFields((f) => ({ ...f, dataInicio: v }))}
                          />
                        </td>
                        {/* Data Fim */}
                        <td>
                          <DatePicker
                            value={editFields.dataFim}
                            onChange={(v) => setEditFields((f) => ({ ...f, dataFim: v }))}
                            minDate={editFields.dataInicio}
                          />
                        </td>
                        {/* Dias Úteis */}
                        <td className="dayoff-td--dias">
                          {calcDiasUteis(editFields.dataInicio, editFields.dataFim)}
                        </td>
                        {/* Tipo de Abono */}
                        <td>
                          <select
                            className="dayoff-select dayoff-select--inline"
                            value={editFields.tipoAbono}
                            onChange={(e) => setEditFields((f) => ({ ...f, tipoAbono: e.target.value }))}
                          >
                            <option value="">Selecionar...</option>
                            {TIPOS_ABONO.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </td>
                        {/* Ações */}
                        <td>
                          <div className="dayoff-actions">
                            <button
                              className="dayoff-action-btn dayoff-action-btn--save"
                              onClick={() => handleSalvar(r.id)}
                              disabled={!editValid}
                              title="Salvar"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              className="dayoff-action-btn dayoff-action-btn--cancel"
                              onClick={handleCancelar}
                              title="Cancelar"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={r.id}>
                      <td className="dayoff-td--analista">{r.analista}</td>
                      <td>{r.equipe}</td>
                      <td>{formatDate(r.dataInicio)}</td>
                      <td>{formatDate(r.dataFim)}</td>
                      <td className="dayoff-td--dias">{calcDiasUteis(r.dataInicio, r.dataFim)}</td>
                      <td>
                        <span className={`dayoff-badge dayoff-badge--${r.tipoAbono === 'Day Off' ? 'dayoff' : 'atestado'}`}>
                          {r.tipoAbono}
                        </span>
                      </td>
                      <td>
                        <GearMenu onEditar={() => handleEditar(r)} onRemover={() => handleRemover(r.id)} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
