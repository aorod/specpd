import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import {
  RefreshCw, SlidersHorizontal, Sun, Moon, AlertCircle, RotateCcw,
  ChevronLeft, ChevronRight,
  CheckCircle2, FlaskConical, Zap, Archive, Pause, Lightbulb, Eye, Users, Settings2, Check, X, Save,
} from 'lucide-react';
import MetricCard from '../components/cards/MetricCard.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import EsteiraEDFilterBar from '../components/filters/EsteiraEDFilterBar.jsx';
import { useEsteiraEDData } from '../hooks/useEsteiraEDData.js';
import './EsteiraEDPage.css';

// ── Defaults de mês/ano atual ────────────────────────────────────────────────
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const _now = new Date();
const DEFAULT_MES = `${String(_now.getMonth() + 1).padStart(2, '0')} - ${MESES_PT[_now.getMonth()]}`;
const DEFAULT_ANO = String(_now.getFullYear());

// ── Estado inicial dos filtros ───────────────────────────────────────────────
const EMPTY_FILTERS = {
  produtos:    [],
  statuses:    [],
  focusSquads: [],
  focal:       [],
  apoio:       [],
  meses:       [],
  anos:        [],
};

const DEFAULT_FILTERS = {
  ...EMPTY_FILTERS,
  meses: [DEFAULT_MES],
  anos:  [DEFAULT_ANO],
};

function applyEdFilters(items, filters, search) {
  return items.filter(item => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.produtos.length    && !filters.produtos.includes(item.produto))        return false;
    if (filters.statuses.length    && !filters.statuses.includes(item.status))         return false;
    if (filters.focusSquads.length && !filters.focusSquads.includes(item.focusSquad))  return false;
    if (filters.meses.length       && !filters.meses.includes(item.mes))               return false;
    if (filters.anos.length        && !filters.anos.includes(item.ano))                return false;
    if (filters.focal.length) {
      const vals = [item.focalDesign, item.focalRequisito].filter(Boolean);
      if (!vals.length || !filters.focal.some(f => vals.includes(f))) return false;
    }
    if (filters.apoio.length) {
      const vals = [item.pdApoio1, item.pdApoio2, item.reqApoio1].filter(Boolean);
      if (!vals.length || !filters.apoio.some(a => vals.includes(a))) return false;
    }
    return true;
  });
}

// ── Definição de todos os cards de status (ordem fixa e imutável) ───────────
const ALL_STATUS_CARDS = [
  { key: 'Backlog',              label: 'Backlog',              icon: Archive,      accent: 'muted'   },
  { key: 'Pausado',              label: 'Pausado',              icon: Pause,        accent: 'warning' },
  { key: 'Descobrir/Definir',    label: 'Descobrir/Definir',    icon: Lightbulb,    accent: 'neutral' },
  { key: 'Desenvolver/Entregar', label: 'Desenvolver/Entregar', icon: Zap,          accent: 'info'    },
  { key: 'Review/Refinamento',   label: 'Review/Refinamento',   icon: Eye,          accent: 'neutral' },
  { key: 'Squad',                label: 'Squad',                icon: Users,        accent: 'info'    },
  { key: 'Em teste',             label: 'Em Teste',             icon: FlaskConical, accent: 'success' },
  { key: 'Concluído',            label: 'Concluído',            icon: CheckCircle2, accent: 'er'      },
];

const DEFAULT_VISIBLE_CARDS = ['Backlog', 'Desenvolver/Entregar', 'Em teste', 'Concluído'];

async function fetchVisibleCards() {
  try {
    const token = localStorage.getItem('specpd_token');
    if (!token) return DEFAULT_VISIBLE_CARDS;
    const res = await fetch('/api/user-preferences', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return DEFAULT_VISIBLE_CARDS;
    const data = await res.json();
    if (Array.isArray(data.visibleCards) && data.visibleCards.length >= 4) {
      return data.visibleCards;
    }
  } catch { /* ignore */ }
  return DEFAULT_VISIBLE_CARDS;
}

async function saveVisibleCards(ordered) {
  try {
    const token = localStorage.getItem('specpd_token');
    if (!token) return;
    await fetch('/api/user-preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ visibleCards: ordered }),
    });
  } catch { /* ignore */ }
}

// ── Mapa de cores por status ─────────────────────────────────────────────────
const STATUS_COLOR = {
  'Concluído':             'status--green',
  'Em teste':              'status--blue',
  'Squad':                 'status--blue',
  'Desenvolver/Entregar':  'status--blue',
  'Review/Refinamento':    'status--purple',
  'Descobrir/Definir':     'status--purple',
  'Pausado':               'status--amber',
  'Cancelado':             'status--red',
  'Backlog':               'status--gray',
};

function statusClass(status) {
  return STATUS_COLOR[status] ?? 'status--gray';
}

// ── Modal de Personalizar Exibição ───────────────────────────────────────────
function CustomizeModal({ visibleCards, onSave, onClose }) {
  const [selected, setSelected] = useState([...visibleCards]);
  const [saved, setSaved] = useState(false);

  function toggle(key) {
    setSelected(prev => {
      if (prev.includes(key)) {
        if (prev.length <= 4) return prev;   // mínimo 4
        return prev.filter(k => k !== key);
      } else {
        return [...prev, key];               // sem limite máximo
      }
    });
  }

  function handleSave() {
    const ordered = ALL_STATUS_CARDS.map(c => c.key).filter(k => selected.includes(k));
    onSave(ordered);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1400);
  }

  const canSave = selected.length >= 4;

  return (
    <div className="customize-overlay" onClick={onClose}>
      <div className="customize-modal" onClick={e => e.stopPropagation()}>
        <div className="customize-modal-header">
          <Settings2 size={16} />
          <h3 className="customize-modal-title">Personalizar Exibição</h3>
          <button className="customize-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={15} />
          </button>
        </div>

        <p className="customize-modal-desc">
          Selecione quais cards serão exibidos no painel. Escolha no mínimo <strong>4</strong> opções.
          A ordem de exibição segue sempre a sequência abaixo.
        </p>

        <div className="customize-modal-list">
          {ALL_STATUS_CARDS.map(card => {
            const isChecked = selected.includes(card.key);
            const isDisabledRemove = isChecked && selected.length <= 4;
            return (
              <button
                key={card.key}
                className={`customize-card-opt${isChecked ? ' is-checked' : ''}${isDisabledRemove ? ' is-disabled' : ''}`}
                onClick={() => !isDisabledRemove && toggle(card.key)}
                aria-checked={isChecked}
                role="checkbox"
              >
                <span className="customize-card-checkbox">
                  {isChecked && <Check size={9} strokeWidth={3} />}
                </span>
                <card.icon size={14} />
                <span className="customize-card-label">{card.label}</span>
              </button>
            );
          })}
        </div>

        <div className="customize-modal-count">
          <span className={selected.length < 4 ? 'is-error' : ''}>
            {selected.length} selecionado{selected.length !== 1 ? 's' : ''}
          </span>
          <span className="customize-modal-count-hint">(mín. 4)</span>
        </div>

        {saved ? (
          <div className="customize-modal-confirm">
            <Check size={15} />
            Configuração salva com sucesso!
          </div>
        ) : (
          <div className="customize-modal-footer">
            <button className="customize-btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              className="customize-btn-save"
              onClick={handleSave}
              disabled={!canSave}
            >
              <Save size={13} />
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Carrosel de Cards ────────────────────────────────────────────────────────
function MetricsCarousel({ cardDefs }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0);
  const rafId = useRef(null);

  function cancelMomentum() {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = null;
  }

  function applyMomentum() {
    cancelMomentum();
    let v = velocity.current;
    function step() {
      if (!trackRef.current || Math.abs(v) < 0.5) return;
      trackRef.current.scrollLeft -= v;
      v *= 0.92;
      rafId.current = requestAnimationFrame(step);
    }
    rafId.current = requestAnimationFrame(step);
  }

  function scrollBy(amount) {
    cancelMomentum();
    trackRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  }

  function onMouseDown(e) {
    cancelMomentum();
    dragging.current = true;
    lastX.current = e.clientX;
    lastT.current = performance.now();
    velocity.current = 0;
    trackRef.current.style.cursor = 'grabbing';
    trackRef.current.style.userSelect = 'none';
  }

  function onMouseMove(e) {
    if (!dragging.current) return;
    const now = performance.now();
    const dx = e.clientX - lastX.current;
    const dt = now - lastT.current || 1;
    velocity.current = dx / dt * 14;          // pixels por frame a 60fps
    trackRef.current.scrollLeft -= dx;
    lastX.current = e.clientX;
    lastT.current = now;
  }

  function onMouseUp() {
    if (!dragging.current) return;
    dragging.current = false;
    trackRef.current.style.cursor = 'grab';
    trackRef.current.style.userSelect = '';
    applyMomentum();
  }

  function onTouchStart(e) {
    cancelMomentum();
    lastX.current = e.touches[0].clientX;
    lastT.current = performance.now();
    velocity.current = 0;
  }

  function onTouchMove(e) {
    const now = performance.now();
    const dx = e.touches[0].clientX - lastX.current;
    const dt = now - lastT.current || 1;
    velocity.current = dx / dt * 14;
    trackRef.current.scrollLeft -= dx;
    lastX.current = e.touches[0].clientX;
    lastT.current = now;
  }

  function onTouchEnd() {
    applyMomentum();
  }

  return (
    <section className="ed-carousel-section" aria-label="Métricas por Status">
      <button
        className="ed-carousel-nav"
        onClick={() => scrollBy(-280)}
        aria-label="Rolar para esquerda"
      >
        <ChevronLeft size={16} />
      </button>

      <div
        className="ed-carousel-track"
        ref={trackRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {cardDefs.map(card => (
          <div key={card.key} className="ed-carousel-item">
            <MetricCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              detail={card.detail}
              accent={card.accent}
              pinned={false}
              onTogglePin={() => {}}
            />
          </div>
        ))}
      </div>

      <button
        className="ed-carousel-nav"
        onClick={() => scrollBy(280)}
        aria-label="Rolar para direita"
      >
        <ChevronRight size={16} />
      </button>
    </section>
  );
}

// ── Tabela View ──────────────────────────────────────────────────────────────
function TabelaView({ items }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);

  function goTo(p) { setPage(Math.max(1, Math.min(p, totalPages))); }
  function handlePageSize(e) { setPageSize(Number(e.target.value)); setPage(1); }

  function pageRange() {
    const delta = 2;
    const range = [];
    const left = Math.max(2, safePage - delta);
    const right = Math.min(totalPages - 1, safePage + delta);
    range.push(1);
    if (left > 2) range.push('…');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('…');
    if (totalPages > 1) range.push(totalPages);
    return range;
  }

  return (
    <section className="ed-demands-section" aria-label="Lista de Demandas">
      <div className="ed-demands-card">
        <div className="ed-demands-table-wrapper">
          <table className="ed-demands-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Título</th>
                <th>Produto Controladoria</th>
                <th>Mês</th>
                <th>Ano</th>
                <th>Status</th>
                <th>Designer Focal</th>
                <th>Requisito Focal</th>
                <th>Designer Apoio 1</th>
                <th>Designer Apoio 2</th>
                <th>Requisito Apoio</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => (
                <tr key={item.id} className={item.fluxo === 'ER' ? 'ed-row--er' : ''}>
                  <td className="ed-col-id">
                    <a
                      href={`https://dev.azure.com/Vector-Brasil/Especifica%C3%A7%C3%B5es%20e%20Design/_boards/board/t/Produto%202026/Cards?workitem=${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ed-col-id-link"
                    >
                      I-{item.id}
                    </a>
                  </td>
                  <td className="ed-col-title">{item.title}</td>
                  <td className="ed-col-text">{item.produto || '—'}</td>
                  <td className="ed-col-text">{item.mes || '—'}</td>
                  <td className="ed-col-sm">{item.ano || '—'}</td>
                  <td>
                    <span className={`ed-status-badge ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="ed-col-text">{item.focalDesign || '—'}</td>
                  <td className="ed-col-text">{item.focalRequisito || '—'}</td>
                  <td className="ed-col-text">{item.pdApoio1 || '—'}</td>
                  <td className="ed-col-text">{item.pdApoio2 || '—'}</td>
                  <td className="ed-col-text">{item.reqApoio1 || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ed-pagination">
          <span className="ed-pagination-info">
            {start + 1}–{Math.min(start + pageSize, total)} de {total} itens
          </span>

          <div className="ed-pagination-pages">
            <button
              className="ed-page-btn ed-page-nav"
              onClick={() => goTo(safePage - 1)}
              disabled={safePage === 1}
              aria-label="Página anterior"
            >
              <ChevronLeft size={13} />
            </button>

            {pageRange().map((p, i) =>
              p === '…'
                ? <span key={`ellipsis-${i}`} className="ed-page-ellipsis">…</span>
                : <button
                    key={p}
                    className={`ed-page-btn${safePage === p ? ' is-active' : ''}`}
                    onClick={() => goTo(p)}
                  >
                    {p}
                  </button>
            )}

            <button
              className="ed-page-btn ed-page-nav"
              onClick={() => goTo(safePage + 1)}
              disabled={safePage === totalPages}
              aria-label="Próxima página"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="ed-pagination-size">
            <span>Por página:</span>
            <select value={pageSize} onChange={handlePageSize} className="ed-page-size-select">
              {[10, 25, 50, 100].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Page principal ───────────────────────────────────────────────────────────
export default function EsteiraEDPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { user } = useAuth();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [visibleCards, setVisibleCards] = useState(DEFAULT_VISIBLE_CARDS);
  const [customizeOpen, setCustomizeOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchVisibleCards().then(setVisibleCards);
    } else {
      setVisibleCards(DEFAULT_VISIBLE_CARDS);
    }
  }, [user?.id]);

  const { data: rawItems, loading, error, retry } = useEsteiraEDData();

  const isActive = Object.values(filters).some(v => v.length > 0);
  const items = applyEdFilters(rawItems, filters, search);

  function toggleFilter(key, value) {
    setFilters(prev => {
      const current = prev[key];
      return {
        ...prev,
        [key]: current.includes(value)
          ? current.filter(v => v !== value)
          : [...current, value],
      };
    });
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const activeCount = Object.values(filters).reduce((sum, v) => sum + v.length, 0)
    + (search.trim() ? 1 : 0);

  function handleSaveCards(ordered) {
    setVisibleCards(ordered);
    saveVisibleCards(ordered);
  }

  // ── Contagens por status ──────────────────────────────────────────────────
  const total = items.length;
  const countByStatus = {};
  for (const card of ALL_STATUS_CARDS) {
    countByStatus[card.key] = items.filter(i => i.status === card.key).length;
  }

  const carouselCards = ALL_STATUS_CARDS
    .filter(c => visibleCards.includes(c.key))
    .map(c => ({
      ...c,
      value: countByStatus[c.key],
      detail: total ? `${Math.round(countByStatus[c.key] / total * 100)}% do total` : '0% do total',
    }));

  return (
    <div className="dashboard">
      <div className="dashboard-sticky-top">
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

        <header className="dashboard-header">
          <div>
            <h1 className="dashboard-title">Esteira E&amp;D</h1>
            <p className="dashboard-subtitle">Acompanhamento da Esteira de Especificação &amp; Design</p>
          </div>

          <div className="dashboard-header-right">
            {!loading && (
              <button
                className="refresh-btn"
                onClick={retry}
                disabled={loading}
                aria-label="Atualizar dados"
                title="Atualizar dados da Esteira E&D"
              >
                <RefreshCw size={13} className={loading ? 'spin' : ''} />
                Atualizar
              </button>
            )}

            {!loading && !error && (
              <button
                className={`filters-toggle-btn${filtersOpen ? ' is-active' : ''}`}
                aria-pressed={filtersOpen}
                onClick={() => setFiltersOpen(o => !o)}
              >
                <SlidersHorizontal size={14} />
                Filtros
                {activeCount > 0 && (
                  <span className="filters-toggle-badge">{activeCount}</span>
                )}
              </button>
            )}

            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div className="dashboard-badge">
              <span className={`dashboard-badge-dot${loading ? ' is-loading' : error ? ' is-error' : ''}`} />
              {loading ? 'Carregando...' : error ? 'Offline' : 'Online'}
            </div>

            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>

        {!loading && !error && filtersOpen && (
          <EsteiraEDFilterBar
            data={rawItems}
            filters={filters}
            toggleFilter={toggleFilter}
            clearFilters={clearFilters}
            isActive={isActive}
            search={search}
            onSearchChange={setSearch}
            onOpenCustomize={() => setCustomizeOpen(true)}
          />
        )}
      </div>

      {loading && (
        <div className="dashboard-status">
          <RefreshCw size={16} className="spin" />
          <span>Buscando dados da Esteira E&amp;D...</span>
        </div>
      )}

      {error && (
        <div className="dashboard-status dashboard-status--error">
          <AlertCircle size={16} />
          <span>{error.message}</span>
          <button className="retry-btn" onClick={retry}>
            <RotateCcw size={12} /> Tentar novamente
          </button>
        </div>
      )}

      {!loading && !error && (
        <main className="dashboard-main">
          <MetricsCarousel cardDefs={carouselCards} />
          <TabelaView items={items} />
        </main>
      )}

      {customizeOpen && (
        <CustomizeModal
          visibleCards={visibleCards}
          onSave={handleSaveCards}
          onClose={() => setCustomizeOpen(false)}
        />
      )}
    </div>
  );
}
