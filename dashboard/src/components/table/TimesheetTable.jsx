import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, Plus, X, CheckCircle, AlertCircle, Loader, Settings2, Pencil } from 'lucide-react';
import { formatMesLabel, formatHoras } from '../../utils/formatters.js';
import { aliasName } from '../../utils/nameAliases.js';
import { useSort } from '../../hooks/useSort.js';
import './TimesheetTable.css';

const PAGE_SIZES = [10, 25, 50, 100];
const MAX_PAGE_BTNS = 10;
const ADO_BASE = 'https://dev.azure.com/Vector-Brasil/Roadmap%202025/_workitems/edit/';

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

// ── GearMenu ────────────────────────────────────────────────────────────────────
function GearMenu({ onEditar }) {
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
      // aparece à esquerda do botão, alinhado verticalmente com ele
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
        </div>,
        document.body
      )}
    </div>
  );
}

// mode: 'create' | 'edit'   item: objeto do timesheet (só no modo edit)
function TimesheetModal({ onClose, dataOptions, mode = 'create', item = null }) {
  const isEdit = mode === 'edit';
  const hoje   = new Date();

  // Para edit: mapeia item.mes ("04") para o value da picklist ("04 - Abril")
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

  const [status,     setStatus]     = useState('idle');
  const [errorMsg,   setErrorMsg]   = useState('');
  const [resultId,   setResultId]   = useState(null);
  const [resultUrl,  setResultUrl]  = useState(null);

  const analistas = dataOptions.analistas ?? [];

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && status !== 'loading') onClose(); };
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
      // Envia apenas os campos que foram alterados em relação ao item original
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
      payload = { titulo, analista, mes, ano, equipe, produto, atividade, horas: horas !== '' ? Number(horas) : undefined, ...(state ? { state } : {}) };
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
      setResultId(data.id);
      setResultUrl(data.url);
      setStatus('success');
    } catch (err) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  }

  function handleNovaEntrada() {
    setTitulo(''); setAnalista(''); setEquipe(''); setProduto(''); setAtividade(''); setHoras('');
    setStatus('idle'); setErrorMsg(''); setResultId(null); setResultUrl(null);
  }

  const canSubmit = titulo.trim().length > 0 && status !== 'loading';

  return (
    <div className="tsmodal-overlay" onClick={(e) => { if (e.target === e.currentTarget && status !== 'loading') onClose(); }}>
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
                  <input className="tsmodal-input" type="text" placeholder="Ex: E&D"
                    value={equipe} onChange={e => setEquipe(e.target.value)} />
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

const TOTAL_COLS = 2 + SORTABLE_COLS.length; // ID + Título + sortable

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

export default function TimesheetTable({ data, rawData }) {
  const [page, setPage]           = useState(1);
  const [pageSize, setPageSize]   = useState(10);
  // null = fechado | { mode:'create' } | { mode:'edit', item }
  const [modalState, setModalState] = useState(null);
  const { sortedData, sortConfig, requestSort } = useSort(data);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const start      = (safePage - 1) * pageSize;
  const pageItems  = sortedData.slice(start, start + pageSize);

  const handleSort     = (key) => { requestSort(key); setPage(1); };
  const handlePageSize = (e)   => { setPageSize(Number(e.target.value)); setPage(1); };

  const from = sortedData.length === 0 ? 0 : start + 1;
  const to   = Math.min(start + pageSize, sortedData.length);

  // Opções únicas para os dropdowns do modal (derivadas dos dados existentes)
  const dataOptions = useMemo(() => {
    // Usa rawData (dados completos, sem filtro) para garantir que todas as opções apareçam
    const source     = rawData ?? data;
    const produtos   = [...new Set(source.map(d => d.produto).filter(Boolean))].sort();
    const atividades = [...new Set(source.map(d => d.atividade).filter(Boolean))].sort();
    const analistas  = [...new Set(source.map(d => d.assignedTo).filter(Boolean))].sort();
    const states     = [...new Set(source.map(d => d.state).filter(Boolean))].sort();
    return { produtos, atividades, analistas, states };
  }, [data, rawData]);

  return (
    <>
    {modalState && (
      <TimesheetModal
        onClose={() => setModalState(null)}
        dataOptions={dataOptions}
        mode={modalState.mode}
        item={modalState.item ?? null}
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
                      <GearMenu onEditar={() => setModalState({ mode: 'edit', item })} />
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            aria-label="Página anterior"
          >
            <ChevronLeft size={15} />
          </button>

          <PageWindow safePage={safePage} totalPages={totalPages} onPageChange={setPage} />

          <button
            className="pagination-btn"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        <div className="pagination-right">
          <span className="page-size-label">Por página</span>
          <select className="page-size-select" value={pageSize} onChange={handlePageSize} aria-label="Itens por página">
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
    </>
  );
}
