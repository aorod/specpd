import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Plus, X, CheckCircle, AlertCircle, Loader, Settings2, Pencil, Unlink } from 'lucide-react';
import { formatMesLabel, formatHoras } from '../../utils/formatters.js';
import { aliasName } from '../../utils/nameAliases.js';
import { useSort } from '../../hooks/useSort.js';
import './TimesheetTable.css';

const PAGE_SIZES = [10, 25, 50, 100];
const MAX_PAGE_BTNS = 10;
const ADO_BASE = 'https://dev.azure.com/Vector-Brasil/Roadmap%202026/_workitems/edit/';

const MESES = [
  { value: '01 - Janeiro',  label: 'Janeiro'   },
  { value: '02 - Fevereiro',label: 'Fevereiro' },
  { value: '03 - Março',    label: 'Março'     },
  { value: '04 - Abril',    label: 'Abril'     },
  { value: '05 - Maio',     label: 'Maio'      },
  { value: '06 - Junho',    label: 'Junho'     },
  { value: '07 - Julho',    label: 'Julho'     },
  { value: '08 - Agosto',   label: 'Agosto'    },
  { value: '09 - Setembro', label: 'Setembro'  },
  { value: '10 - Outubro',  label: 'Outubro'   },
  { value: '11 - Novembro', label: 'Novembro'  },
  { value: '12 - Dezembro', label: 'Dezembro'  },
];

const THIS_YEAR  = new Date().getFullYear();
const ANOS = [THIS_YEAR - 1, THIS_YEAR, THIS_YEAR + 1].map(String);

// ── UCSearchField ────────────────────────────────────────────────────────────────
function UCSearchField({ ucData, value, onChange, disabled }) {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return ucData
      .filter(uc =>
        uc.title.toLowerCase().includes(q) ||
        uc.id.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, ucData]);

  function handleSelect(uc) {
    onChange(uc);
    setQuery('');
    setOpen(false);
  }

  if (value) {
    return (
      <div className="uc-selected">
        <span className="uc-selected-id">{value.id}</span>
        <span className="uc-selected-title" title={value.title}>{value.title}</span>
        {!disabled && (
          <button
            className="uc-selected-remove"
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remover Caso de Uso"
          >
            <X size={11} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="uc-search-wrap" ref={wrapRef}>
      <input
        className="tsmodal-input"
        type="text"
        placeholder="Buscar por título ou ID (ex: UC-123)..."
        value={query}
        disabled={disabled}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => query.trim() && setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <div className="uc-search-dropdown">
          {filtered.map(uc => (
            <button
              key={uc.id}
              className="uc-search-item"
              type="button"
              onClick={() => handleSelect(uc)}
            >
              <span className="uc-search-item-id">{uc.id}</span>
              <span className="uc-search-item-title">{uc.title}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <div className="uc-search-dropdown">
          <span className="uc-search-empty">Nenhum Caso de Uso encontrado.</span>
        </div>
      )}
    </div>
  );
}

// ── GearMenu ────────────────────────────────────────────────────────────────────
function GearMenu({ onEditar, onRemoverLink }) {
  const [open, setOpen] = useState(false);
  const [pos,  setPos]  = useState({ top: 0, left: 0 });
  const btnRef  = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e) {
      if (
        btnRef.current  && !btnRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function handleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.top, right: window.innerWidth - rect.left + 4 });
    }
    setOpen(o => !o);
  }

  return (
    <div className="gear-root">
      <button ref={btnRef} className={`gear-btn${open ? ' is-open' : ''}`} onClick={handleOpen} title="Ações">
        <Settings2 size={15} />
      </button>
      {open && createPortal(
        <div ref={dropRef} className="gear-dropdown" style={{ top: pos.top, right: pos.right }}>
          <button className="gear-item gear-item--edit" onClick={() => { onEditar(); setOpen(false); }}>
            <Pencil size={13} /> Editar
          </button>
          <button className="gear-item gear-item--danger" onClick={() => { onRemoverLink(); setOpen(false); }}>
            <Unlink size={13} /> Remover Relacionamento
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── RemoverLinkModal ─────────────────────────────────────────────────────────────
function RemoverLinkModal({ item, ucData, onClose }) {
  const [ucVinculado, setUcVinculado] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [removing,    setRemoving]    = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const wiId = item.id.replace(/\D/g, '');

  useEffect(() => {
    fetch(`/api/workitems/timesheet/${wiId}/links`)
      .then(r => r.json())
      .then(d => {
        const parents = d.parents || [];
        if (parents.length > 0) {
          const parentId = parents[0].ucId;
          const cached   = ucData.find(u => Number(u.id.replace(/\D/g, '')) === parentId);
          setUcVinculado({
            ucId:  parentId,
            title: cached?.title || null,
            state: cached?.state || null,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [wiId, ucData]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && !removing) onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, removing]);

  async function handleRemover() {
    if (!ucVinculado) return;
    setRemoving(true);
    setError('');
    try {
      const res = await fetch(`/api/workitems/timesheet/${wiId}/link/${ucVinculado.ucId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div
      className="tsmodal-overlay"
      onClick={e => { if (e.target === e.currentTarget && !removing) onClose(); }}
    >
      <div className="rmlink-panel">
        <div className="tsmodal-header">
          <div className="tsmodal-header-title">
            <h2 className="tsmodal-title">Remover Relacionamento</h2>
            <div className="tsmodal-title-bar" />
          </div>
          <button className="tsmodal-close-btn" onClick={onClose} disabled={removing} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        <div className="rmlink-body">
          {loading ? (
            <div className="rmlink-loading">
              <Loader size={20} className="tsmodal-spin" />
            </div>
          ) : success ? (
            <div className="rmlink-success">
              <CheckCircle size={36} className="rmlink-success-icon" />
              <p>Relacionamento removido com sucesso.</p>
            </div>
          ) : !ucVinculado ? (
            <div className="rmlink-empty">
              <p>Este Timesheet não possui nenhum Caso de Uso vinculado.</p>
            </div>
          ) : (
            <>
              <p className="rmlink-desc">
                Confirme a remoção do vínculo entre <strong>{item.id}</strong> e o Caso de Uso abaixo:
              </p>
              <div className="rmlink-uc-card">
                <span className="rmlink-uc-id">UC-{ucVinculado.ucId}</span>
                <span className="rmlink-uc-title">
                  {ucVinculado.title || `Caso de Uso #${ucVinculado.ucId}`}
                </span>
                {ucVinculado.state && (
                  <span className="rmlink-uc-state">{ucVinculado.state}</span>
                )}
              </div>
              {error && (
                <div className="tsmodal-error">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="tsmodal-footer">
          <button
            className="tsmodal-btn tsmodal-btn--ghost"
            onClick={onClose}
            disabled={removing}
          >
            {success ? 'Fechar' : 'Cancelar'}
          </button>
          {!success && ucVinculado && (
            <button
              className="tsmodal-btn tsmodal-btn--danger"
              onClick={handleRemover}
              disabled={removing || loading}
            >
              {removing
                ? <><Loader size={13} className="tsmodal-spin" /> Removendo...</>
                : 'Confirmar Remoção'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── TimesheetModal ───────────────────────────────────────────────────────────────
// mode: 'create' | 'edit'   item: objeto do timesheet (só no modo edit)
function TimesheetModal({ onClose, dataOptions, ucData, mode = 'create', item = null }) {
  const isEdit = mode === 'edit';
  const hoje   = new Date();

  const mesInicial = isEdit
    ? (MESES.find(m => m.value.startsWith(item.mes + ' '))?.value ?? MESES[hoje.getMonth()].value)
    : (MESES[hoje.getMonth()]?.value ?? MESES[0].value);

  const [titulo,    setTitulo]    = useState(isEdit ? (item.title    ?? '') : '');
  const [analista,  setAnalista]  = useState(isEdit ? (item.assignedTo ?? '') : '');
  const [mes,       setMes]       = useState(mesInicial);
  const [ano,       setAno]       = useState(isEdit ? (item.ano ?? String(hoje.getFullYear())) : String(hoje.getFullYear()));
  const [equipe,    setEquipe]    = useState(isEdit ? (item.equipe   ?? '') : '');
  const [produto,   setProduto]   = useState(isEdit ? (item.produto  ?? '') : '');
  const [atividade, setAtividade] = useState(isEdit ? (item.atividade ?? '') : '');
  const [horas,     setHoras]     = useState(isEdit && item.effort != null ? String(item.effort) : '');
  const [state,     setState]     = useState(isEdit ? (item.state ?? '') : '');

  // ── UC linking state ──────────────────────────────────────────────────────────
  const [selectedUc,   setSelectedUc]   = useState(null);
  const [originalUcId, setOriginalUcId] = useState(null);
  const [ucFetchState, setUcFetchState] = useState(isEdit ? 'loading' : 'idle');

  useEffect(() => {
    if (!isEdit) return;
    const wiId = item.id.replace(/\D/g, '');
    fetch(`/api/workitems/timesheet/${wiId}/links`)
      .then(r => r.json())
      .then(d => {
        const parents = d.parents || [];
        if (parents.length > 0) {
          const parentId = parents[0].ucId;
          const cached   = ucData.find(u => Number(u.id.replace(/\D/g, '')) === parentId);
          const uc = cached ?? { id: `UC-${parentId}`, title: `Caso de Uso #${parentId}` };
          setSelectedUc(uc);
          setOriginalUcId(parentId);
        }
      })
      .catch(() => {})
      .finally(() => setUcFetchState('done'));
  }, [isEdit, item?.id, ucData]);

  // ── form state ───────────────────────────────────────────────────────────────
  const [status,        setStatus]        = useState('idle');
  const [errorMsg,      setErrorMsg]      = useState('');
  const [resultId,      setResultId]      = useState(null);
  const [resultUrl,     setResultUrl]     = useState(null);
  const [resultLinkErr, setResultLinkErr] = useState(null);

  const analistas = dataOptions.analistas ?? [];

  useEffect(() => {
    const map = dataOptions.analistaEquipeMap ?? {};
    if (!analista) { setEquipe(''); return; }
    const equipeAutoFill = map[analista];
    setEquipe(equipeAutoFill ?? '');
  }, [analista, dataOptions.analistaEquipeMap]);

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape' && status !== 'loading') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose, status]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!titulo.trim()) return;

    setStatus('loading');
    setErrorMsg('');

    let payload;
    if (isEdit) {
      payload = { titulo };
      const mesOriginal = MESES.find(m => m.value.startsWith(item.mes + ' '))?.value ?? '';
      if (analista  !== (item.assignedTo  ?? ''))                        payload.analista  = analista;
      if (mes       !== mesOriginal)                                      payload.mes       = mes;
      if (ano       !== (item.ano         ?? String(hoje.getFullYear()))) payload.ano       = ano;
      if (equipe    !== (item.equipe      ?? ''))                        payload.equipe    = equipe;
      if (produto   !== (item.produto     ?? ''))                        payload.produto   = produto;
      if (atividade !== (item.atividade   ?? ''))                        payload.atividade = atividade;
      if (state     !== (item.state       ?? ''))                        payload.state     = state;
      const horasNum      = horas !== '' ? Number(horas) : null;
      const horasOriginal = item.effort ?? null;
      if (horasNum !== horasOriginal)                                     payload.horas     = horasNum;
    } else {
      const ucNumId = selectedUc ? Number(selectedUc.id.replace(/\D/g, '')) : undefined;
      payload = {
        titulo, analista, mes, ano, equipe, produto, atividade,
        horas: horas !== '' ? Number(horas) : undefined,
        ...(state    ? { state }    : {}),
        ...(ucNumId  ? { ucId: ucNumId } : {}),
      };
    }

    try {
      const url    = isEdit ? `/api/workitems/timesheet/${item.id.replace(/\D/g, '')}` : '/api/workitems/timesheet';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Servidor indisponível ou rota não encontrada (HTTP ${res.status}). Reinicie o backend.`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);

      // ── Gerencia alteração de UC no modo edição ──────────────────────────────
      if (isEdit) {
        const wiIdNum    = item.id.replace(/\D/g, '');
        const newUcNumId = selectedUc ? Number(selectedUc.id.replace(/\D/g, '')) : null;

        if (newUcNumId !== originalUcId) {
          if (originalUcId) {
            const delRes = await fetch(`/api/workitems/timesheet/${wiIdNum}/link/${originalUcId}`, { method: 'DELETE' });
            if (!delRes.ok) {
              const d = await delRes.json().catch(() => null);
              throw new Error(`Erro ao remover vínculo anterior: ${d?.error || delRes.status}`);
            }
          }
          if (newUcNumId) {
            const linkRes = await fetch(`/api/workitems/timesheet/${wiIdNum}/link`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ucId: newUcNumId }),
            });
            if (!linkRes.ok) {
              const d = await linkRes.json().catch(() => null);
              throw new Error(`Erro ao vincular Caso de Uso: ${d?.error || linkRes.status}`);
            }
          }
        }
      }

      setResultId(data.id);
      setResultUrl(data.url);
      setResultLinkErr(data.linkError || null);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  function handleNovaEntrada() {
    setTitulo(''); setAnalista(''); setEquipe(''); setProduto(''); setAtividade(''); setHoras('');
    setSelectedUc(null);
    setStatus('idle'); setErrorMsg(''); setResultId(null); setResultUrl(null); setResultLinkErr(null);
  }

  const canSubmit = titulo.trim().length > 0 && status !== 'loading';

  return (
    <div className="tsmodal-overlay" onClick={e => { if (e.target === e.currentTarget && status !== 'loading') onClose(); }}>
      <div className="tsmodal-panel">

        {/* Header */}
        <div className="tsmodal-header">
          <div className="tsmodal-header-title">
            <h2 className="tsmodal-title">{isEdit ? 'Editar Timesheet' : 'Criar Timesheet'}</h2>
            <div className="tsmodal-title-bar" />
          </div>
          <button className="tsmodal-close-btn" onClick={onClose} disabled={status === 'loading'} aria-label="Fechar">
            <X size={14} />
          </button>
        </div>

        {/* Sucesso */}
        {status === 'success' ? (
          <div className="tsmodal-success">
            <CheckCircle size={40} className="tsmodal-success-icon" />
            <p className="tsmodal-success-title">{isEdit ? 'Timesheet atualizado!' : 'Timesheet criado!'}</p>
            <p className="tsmodal-success-id">{item?.id ?? `TS-${resultId}`}</p>
            {resultLinkErr && (
              <div className="tsmodal-error" style={{ textAlign: 'left', marginTop: 4 }}>
                <AlertCircle size={14} />
                <span>Aviso: vínculo com o Caso de Uso não foi criado — {resultLinkErr}. Use "Editar" para tentar novamente.</span>
              </div>
            )}
            <div className="tsmodal-success-actions">
              {resultUrl && (
                <a href={resultUrl} target="_blank" rel="noreferrer" className="tsmodal-btn tsmodal-btn--accent">
                  Abrir no Azure DevOps
                </a>
              )}
              {!isEdit && (
                <button className="tsmodal-btn tsmodal-btn--ghost" onClick={handleNovaEntrada}>
                  Criar outro
                </button>
              )}
              <button className="tsmodal-btn tsmodal-btn--ghost" onClick={onClose}>
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <form className="tsmodal-form" onSubmit={handleSubmit} noValidate>
            <div className="tsmodal-form-body">

              {/* Título */}
              <div className="tsmodal-field tsmodal-field--full">
                <label className="tsmodal-label">Título <span className="tsmodal-required">*</span></label>
                <input
                  className="tsmodal-input"
                  type="text"
                  placeholder="Ex: Desenvolvimento da feature X"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="tsmodal-row">
                {/* Analista */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Analista</label>
                  {analistas.length > 0 ? (
                    <select className="tsmodal-select" value={analista} onChange={e => setAnalista(e.target.value)}>
                      <option value="">Selecionar...</option>
                      {analistas.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : (
                    <input className="tsmodal-input" type="text" placeholder="Nome do analista"
                      value={analista} onChange={e => setAnalista(e.target.value)} />
                  )}
                </div>

                {/* Equipe */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Equipe</label>
                  <input
                    className={`tsmodal-input tsmodal-input--autofill${equipe ? ' tsmodal-input--autofill-filled' : ''}`}
                    type="text"
                    placeholder="Ex: E&D"
                    value={equipe}
                    readOnly
                    tabIndex={-1}
                  />
                </div>
              </div>

              <div className="tsmodal-row">
                {/* Mês */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Mês</label>
                  <select className="tsmodal-select" value={mes} onChange={e => setMes(e.target.value)}>
                    {MESES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                {/* Ano */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Ano</label>
                  <select className="tsmodal-select" value={ano} onChange={e => setAno(e.target.value)}>
                    {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>

                {/* Horas */}
                <div className="tsmodal-field tsmodal-field--sm">
                  <label className="tsmodal-label">Horas</label>
                  <input className="tsmodal-input" type="number" min="0.5" step="0.5" placeholder="0"
                    value={horas} onChange={e => setHoras(e.target.value)} />
                </div>
              </div>

              <div className="tsmodal-row">
                {/* Produto */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Produto</label>
                  {dataOptions.produtos.length > 0 ? (
                    <select className="tsmodal-select" value={produto} onChange={e => setProduto(e.target.value)}>
                      <option value="">Selecionar...</option>
                      {dataOptions.produtos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input className="tsmodal-input" type="text" placeholder="Nome do produto"
                      value={produto} onChange={e => setProduto(e.target.value)} />
                  )}
                </div>

                {/* Atividade */}
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Atividade</label>
                  {dataOptions.atividades.length > 0 ? (
                    <select className="tsmodal-select" value={atividade} onChange={e => setAtividade(e.target.value)}>
                      <option value="">Selecionar...</option>
                      {dataOptions.atividades.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  ) : (
                    <input className="tsmodal-input" type="text" placeholder="Tipo de atividade"
                      value={atividade} onChange={e => setAtividade(e.target.value)} />
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="tsmodal-row">
                <div className="tsmodal-field">
                  <label className="tsmodal-label">Status</label>
                  <select className="tsmodal-select" value={state} onChange={e => setState(e.target.value)}>
                    <option value="">Selecionar...</option>
                    {dataOptions.states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Caso de Uso ─────────────────────────────────────────────── */}
              <div className="tsmodal-field tsmodal-field--full">
                <label className="tsmodal-label">Caso de Uso (Pai)</label>
                {isEdit && ucFetchState === 'loading' ? (
                  <div className="uc-search-loading">
                    <Loader size={14} className="tsmodal-spin" />
                    <span>Carregando vínculo atual...</span>
                  </div>
                ) : (
                  <UCSearchField
                    ucData={ucData}
                    value={selectedUc}
                    onChange={setSelectedUc}
                    disabled={status === 'loading'}
                  />
                )}
                <span className="tsmodal-hint">
                  Vincula este Timesheet como filho do Caso de Uso selecionado no ADO.
                </span>
              </div>

              {/* Erro */}
              {status === 'error' && (
                <div className="tsmodal-error">
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="tsmodal-footer">
              <button type="button" className="tsmodal-btn tsmodal-btn--ghost" onClick={onClose} disabled={status === 'loading'}>
                Cancelar
              </button>
              <button type="submit" className={`tsmodal-btn tsmodal-btn--accent${!canSubmit ? ' tsmodal-btn--disabled' : ''}`} disabled={!canSubmit}>
                {status === 'loading'
                  ? <><Loader size={13} className="tsmodal-spin" /> {isEdit ? 'Salvando...' : 'Criando...'}</>
                  : isEdit ? 'Salvar Alterações' : 'Criar Timesheet'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}

const SORTABLE_COLS = [
  { key: 'produto',    label: 'Produto'   },
  { key: 'mes',        label: 'Mês'       },
  { key: 'ano',        label: 'Ano'       },
  { key: 'assignedTo', label: 'Analistas' },
  { key: 'equipe',     label: 'Equipe'    },
  { key: 'atividade',  label: 'Atividade' },
  { key: 'effort',     label: 'Horas'     },
  { key: 'state',      label: 'Status'    },
];

const TOTAL_COLS = 2 + SORTABLE_COLS.length;

function SortIcon({ col, sortConfig }) {
  if (sortConfig.key !== col) return <ChevronsUpDown size={13} className="sort-icon" />;
  return sortConfig.direction === 'asc'
    ? <ChevronUp size={13} className="sort-icon sort-icon--active" />
    : <ChevronDown size={13} className="sort-icon sort-icon--active" />;
}

function PageWindow({ safePage, totalPages, onPageChange }) {
  const half = Math.floor(MAX_PAGE_BTNS / 2);
  let winStart = Math.max(1, safePage - half);
  let winEnd   = Math.min(totalPages, winStart + MAX_PAGE_BTNS - 1);
  if (winEnd - winStart + 1 < MAX_PAGE_BTNS) {
    winStart = Math.max(1, winEnd - MAX_PAGE_BTNS + 1);
  }
  const pages = Array.from({ length: winEnd - winStart + 1 }, (_, i) => winStart + i);

  return (
    <>
      {pages.map((p) => (
        <button
          key={p}
          className={`pagination-btn pagination-page-btn${p === safePage ? ' pagination-page-btn--active' : ''}`}
          onClick={() => onPageChange(p)}
          aria-current={p === safePage ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
    </>
  );
}

export default function TimesheetTable({ data, rawData, ucData = [] }) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  const [modalState, setModalState]   = useState(null);
  const [removeModal, setRemoveModal] = useState(null);
  const { sortedData, sortConfig, requestSort } = useSort(data);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * pageSize;
  const pageItems  = sortedData.slice(start, start + pageSize);

  const handleSort     = key => { requestSort(key); setPage(1); };
  const handlePageSize = e   => { setPageSize(Number(e.target.value)); setPage(1); };

  const from = sortedData.length === 0 ? 0 : start + 1;
  const to   = Math.min(start + pageSize, sortedData.length);

  const dataOptions = useMemo(() => {
    const source     = rawData ?? data;
    const produtos   = [...new Set(source.map(d => d.produto).filter(Boolean))].sort();
    const atividades = [...new Set(source.map(d => d.atividade).filter(Boolean))].sort();
    const analistas  = [...new Set(source.map(d => d.assignedTo).filter(Boolean))].sort();
    const states     = [...new Set(source.map(d => d.state).filter(Boolean))].sort();

    const analistaEquipeMap = {};
    for (const d of source) {
      if (d.assignedTo && d.equipe) analistaEquipeMap[d.assignedTo] = d.equipe;
    }
    try {
      const configList = JSON.parse(localStorage.getItem('config_analistas') || '[]');
      for (const a of configList) {
        if (a.nome && a.equipe) analistaEquipeMap[a.nome] = a.equipe;
      }
    } catch {}

    return { produtos, atividades, analistas, states, analistaEquipeMap };
  }, [data, rawData]);

  return (
    <>
      {modalState && (
        <TimesheetModal
          onClose={() => setModalState(null)}
          dataOptions={dataOptions}
          ucData={ucData}
          mode={modalState.mode}
          item={modalState.item ?? null}
        />
      )}
      {removeModal && (
        <RemoverLinkModal
          item={removeModal}
          ucData={ucData}
          onClose={() => setRemoveModal(null)}
        />
      )}
      <div className="uc-table-wrap">
        <div className="uc-table-header">
          <h3 className="uc-table-title">Lista de Timesheets</h3>
          <div className="uc-table-header-right">
            <button
              className="criar-timesheet-btn"
              onClick={() => setModalState({ mode: 'create' })}
            >
              <Plus size={13} />
              Criar Timesheet
            </button>
            <span className="uc-table-count">{sortedData.length} item{sortedData.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="uc-table-scroll">
          <table className="uc-table" role="table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Título</th>
                {SORTABLE_COLS.map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    className="sortable-th"
                    aria-sort={sortConfig.key === key ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    onClick={() => handleSort(key)}
                  >
                    <span className="th-inner">
                      {label}
                      <SortIcon col={key} sortConfig={sortConfig} />
                    </span>
                  </th>
                ))}
                <th scope="col" className="col-acoes">Ações</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLS + 1} className="uc-table-empty">
                    Nenhum Timesheet encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => {
                  const idNum = item.id.replace(/\D/g, '');
                  return (
                    <tr key={item.id} className="uc-table-row" style={{ animationDelay: `${idx * 12}ms` }}>
                      <td className="cell-id">
                        <a href={`${ADO_BASE}${idNum}`} target="_blank" rel="noreferrer" className="cell-id-link">
                          {item.id}
                        </a>
                      </td>
                      <td className="cell-title">
                        <span title={item.title} className="title-text">{item.title}</span>
                      </td>
                      <td>{item.produto}</td>
                      <td>{formatMesLabel(item.mes)}</td>
                      <td>{item.ano}</td>
                      <td>{aliasName(item.assignedTo)}</td>
                      <td>{item.equipe || '—'}</td>
                      <td>{item.atividade || '—'}</td>
                      <td className="cell-effort">{item.effort != null ? formatHoras(item.effort) : '—'}</td>
                      <td>
                        <span className={`state-badge state-badge--${item.state.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.state}
                        </span>
                      </td>
                      <td className="cell-acoes">
                        <GearMenu
                          onEditar={() => setModalState({ mode: 'edit', item })}
                          onRemoverLink={() => setRemoveModal(item)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="uc-pagination">
          <span className="pagination-info">
            {sortedData.length > 0 ? `${from}–${to} de ${sortedData.length} itens` : '0 itens'}
          </span>

          <div className="pagination-center">
            <button
              className="pagination-btn"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={15} />
            </button>

            <PageWindow safePage={safePage} totalPages={totalPages} onPageChange={setPage} />

            <button
              className="pagination-btn"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="pagination-right">
            <span className="page-size-label">Por página</span>
            <select className="page-size-select" value={pageSize} onChange={handlePageSize} aria-label="Itens por página">
              {PAGE_SIZES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
