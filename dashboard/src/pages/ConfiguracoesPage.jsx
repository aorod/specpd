import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  Sun, Moon, Calculator, CalendarDays, Users,
  Plus, X, Check, Trash2, Pencil, ShieldCheck, Eye, UserCog, Search, Settings2,
} from 'lucide-react';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import { CalendarContent } from './CalendarPage.jsx';
import { listUsers, createUser, updateUser, deleteUser } from '../api/authClient.js';
import { useAuth } from '../context/AuthContext.jsx';
import { PERMISSOES_PERFIL, ACOES_POR_MODULO, MODULOS } from '../utils/permissions.js';
import './ConfiguracoesPage.css';
import './UsuariosPage.css';

const ALL_MENU_ITEMS = [
  { id: 'formulas',   label: 'Fórmulas e Cálculos',   icon: Calculator,  modulo: 'configuracoes', acao: 'editar_integracoes' },
  { id: 'calendario', label: 'Calendário de Feriados', icon: CalendarDays, modulo: 'calendario',    acao: 'acessar' },
  { id: 'usuarios',   label: 'Usuários & Permissões',  icon: Users,        modulo: 'usuarios',      acao: 'acessar' },
];

// ── Helpers: Perfis ───────────────────────────────────────────────────────────
const PAPEIS = [
  { value: 'admin',       label: 'Admin',       icon: ShieldCheck },
  { value: 'gestor',      label: 'Gestor',      icon: UserCog },
  { value: 'coordenador', label: 'Coordenador', icon: Users },
  { value: 'analista',    label: 'Analista',    icon: Eye },
];


function PapelBadge({ papel }) {
  const map = {
    admin:       'badge--admin',
    gestor:      'badge--gestor',
    coordenador: 'badge--coordenador',
    analista:    'badge--analista',
  };
  const labelMap = {
    admin:       'Admin',
    gestor:      'Gestor',
    coordenador: 'Coordenador',
    analista:    'Analista',
  };
  return <span className={`papel-badge ${map[papel] || ''}`}>{labelMap[papel] || papel}</span>;
}

// ── Modal: Criar / Editar Usuário ─────────────────────────────────────────────
function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user?.id;

  const [nome,   setNome]   = useState(user?.nome  || '');
  const [email,  setEmail]  = useState(user?.email || '');
  const [senha,  setSenha]  = useState('');
  const [papel,  setPapel]  = useState(user?.papel || 'analista');
  const [ativo,  setAtivo]  = useState(user?.ativo !== 0);
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    if (!nome.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios'); return; }
    if (!isEdit && !senha) { setError('A senha é obrigatória para novos usuários'); return; }

    setSaving(true);
    try {
      const payload = { nome: nome.trim(), email: email.trim(), papel, ativo };
      if (senha) payload.senha = senha;

      if (isEdit) {
        await updateUser(user.id, payload);
      } else {
        await createUser(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="umodal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="umodal-card">
        <div className="umodal-header">
          <h2 className="umodal-title">{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <button className="umodal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        <form className="umodal-form" onSubmit={handleSave} noValidate>

          <div className="umodal-field">
            <label className="umodal-label">Nome *</label>
            <input className="umodal-input" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Nome completo" disabled={saving} />
          </div>

          <div className="umodal-field">
            <label className="umodal-label">E-mail *</label>
            <input className="umodal-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="usuario@exemplo.com" disabled={saving} />
          </div>

          <div className="umodal-field">
            <label className="umodal-label">{isEdit ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</label>
            <input className="umodal-input" type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder={isEdit ? 'Nova senha (opcional)' : 'Senha de acesso'} disabled={saving} />
          </div>

          <div className="umodal-field">
            <label className="umodal-label">Perfil de Acesso</label>
            <div className="umodal-papel-grid">
              {PAPEIS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`umodal-papel-btn${papel === value ? ' is-selected' : ''}`}
                  onClick={() => setPapel(value)}
                  disabled={saving}
                >
                  <Icon size={16} />
                  <span className="umodal-papel-label">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {isEdit && (
            <div className="umodal-field umodal-field--row">
              <label className="umodal-label">Usuário ativo</label>
              <button
                type="button"
                className={`umodal-toggle${ativo ? ' is-on' : ''}`}
                onClick={() => setAtivo(v => !v)}
                disabled={saving}
                aria-label="Alternar status"
              >
                <span className="umodal-toggle-knob" />
              </button>
            </div>
          )}

          {error && <p className="umodal-error">{error}</p>}

          <div className="umodal-actions">
            <button type="button" className="umodal-btn umodal-btn--cancel" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="umodal-btn umodal-btn--save" disabled={saving}>
              {saving ? <span className="umodal-spinner" /> : <Check size={14} />}
              {isEdit ? 'Salvar Alterações' : 'Criar Usuário'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Modal: Confirmar Exclusão ─────────────────────────────────────────────────
function ConfirmDelete({ user, onClose, onConfirmed }) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteUser(user.id);
      onConfirmed();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="umodal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="umodal-card umodal-card--sm">
        <div className="umodal-header">
          <h2 className="umodal-title">Excluir Usuário</h2>
          <button className="umodal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <p className="umodal-confirm-text">
          Tem certeza que deseja excluir <strong>{user.nome}</strong>?<br />
          Esta ação não pode ser desfeita.
        </p>
        {error && <p className="umodal-error">{error}</p>}
        <div className="umodal-actions">
          <button className="umodal-btn umodal-btn--cancel" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="umodal-btn umodal-btn--danger" onClick={handleDelete} disabled={loading}>
            {loading ? <span className="umodal-spinner" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Painel: Fórmulas e Cálculos ───────────────────────────────────────────────
const FormulaPanel = forwardRef(function FormulaPanel(_, ref) {
  const storageKey = 'config_horas_por_dia';
  const [horasPorDia, setHorasPorDia] = useState(
    () => localStorage.getItem(storageKey) ?? '8'
  );

  function handleChange(e) {
    const val = e.target.value;
    if (/^\d*\.?\d*$/.test(val)) setHorasPorDia(val);
  }

  useImperativeHandle(ref, () => ({
    save() {
      if (horasPorDia === '' || isNaN(Number(horasPorDia))) return false;
      localStorage.setItem(storageKey, horasPorDia);
      return true;
    },
  }));

  return (
    <div className="cfg-panel">
      <div className="cfg-panel-header">
        <h2 className="cfg-panel-title">Fórmulas e Cálculos</h2>
        <p className="cfg-panel-desc">
          Parâmetros utilizados nas fórmulas e cálculos do sistema.
        </p>
      </div>

      <div className="cfg-panel-body">
        <div className="cfg-field-group">
          <label className="cfg-field-label" htmlFor="horas-por-dia">
            Horas por dia
          </label>
          <p className="cfg-field-hint">
            Quantidade de horas de trabalho por dia. Use ponto (.) para decimais.
          </p>
          <div className="cfg-field-row">
            <input
              id="horas-por-dia"
              type="text"
              inputMode="decimal"
              className="cfg-input cfg-input--sm"
              value={horasPorDia}
              onChange={handleChange}
              placeholder="8"
            />
          </div>
        </div>
      </div>
    </div>
  );
});

// ── GearMenu (dropdown de ações por linha) ────────────────────────────────────
function GearMenu({ onEditar, onPermissoes, onRemover }) {
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
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
    setOpen(o => !o);
  }

  if (!onEditar && !onPermissoes && !onRemover) return null;

  return (
    <div className="gear-root">
      <button ref={btnRef} className={`gear-btn${open ? ' is-open' : ''}`} onClick={handleOpen} title="Ações">
        <Settings2 size={15} />
      </button>
      {open && (
        <div ref={dropRef} className="gear-dropdown" style={{ top: pos.top, left: pos.left }}>
          {onEditar && (
            <button className="gear-item gear-item--edit" onClick={() => { onEditar(); setOpen(false); }}>
              <Pencil size={13} />Editar
            </button>
          )}
          {onPermissoes && (
            <button className="gear-item gear-item--perms" onClick={() => { onPermissoes(); setOpen(false); }}>
              <ShieldCheck size={13} />Gerenciar Permissões
            </button>
          )}
          {onRemover && (
            <button className="gear-item gear-item--remove" onClick={() => { onRemover(); setOpen(false); }}>
              <Trash2 size={13} />Remover
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal: Gerenciar Permissões ───────────────────────────────────────────────
function PermissoesModal({ user, onClose }) {
  const [perms, setPerms] = useState(() =>
    Object.fromEntries(
      MODULOS.map(({ key }) => [key, [...(PERMISSOES_PERFIL[user.papel]?.[key] || [])]])
    )
  );
  const [moduloAtivo, setModuloAtivo] = useState(MODULOS[0].key);
  const [phase, setPhase] = useState('edit'); // 'edit' | 'confirm' | 'success'

  function toggleAcao(modKey, acoKey) {
    setPerms(prev => {
      const cur = prev[modKey] || [];
      return {
        ...prev,
        [modKey]: cur.includes(acoKey) ? cur.filter(k => k !== acoKey) : [...cur, acoKey],
      };
    });
  }

  if (phase === 'success') {
    return (
      <div className="umodal-overlay">
        <div className="umodal-card umodal-card--sm">
          <div className="perm-success-icon">
            <Check size={28} />
          </div>
          <h2 className="umodal-title" style={{ textAlign: 'center', marginBottom: 6 }}>Permissões salvas!</h2>
          <p className="perm-success-desc">
            As permissões de <strong>{user.nome}</strong> foram atualizadas com sucesso.
          </p>
          <div className="umodal-actions">
            <button className="umodal-btn umodal-btn--save" style={{ flex: 1 }} onClick={onClose}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'confirm') {
    return (
      <div className="umodal-overlay">
        <div className="umodal-card umodal-card--sm">
          <div className="umodal-header">
            <h2 className="umodal-title">Confirmar alterações</h2>
            <button className="umodal-close" onClick={() => setPhase('edit')}><X size={16} /></button>
          </div>
          <p className="umodal-confirm-text">
            Deseja salvar as permissões de <strong>{user.nome}</strong>?<br />
            As alterações entrarão em vigor imediatamente.
          </p>
          <div className="umodal-actions">
            <button className="umodal-btn umodal-btn--cancel" onClick={() => setPhase('edit')}>Cancelar</button>
            <button className="umodal-btn umodal-btn--save" onClick={() => setPhase('success')}>
              <Check size={14} />Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="umodal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="perm-modal">

        {/* Header */}
        <div className="perm-modal-header">
          <h2 className="perm-modal-title">Gerenciar Permissões</h2>
          <button className="umodal-close" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>

        {/* User info bar */}
        <div className="perm-modal-user-bar">
          <span className="perm-modal-user-name">{user.nome}</span>
          <span className="perm-modal-user-sep" />
          <span className="perm-modal-user-email">{user.email}</span>
          <span className="perm-modal-user-sep" />
          <PapelBadge papel={user.papel} />
        </div>

        {/* Perms body */}
        <div className="perm-modal-body">
          <div className="perms-modulos">
            <p className="perms-col-title">Módulos</p>
            {MODULOS.map(({ key, label }) => {
              const qtd   = (perms[key] || []).length;
              const total = (ACOES_POR_MODULO[key] || []).length;
              return (
                <button
                  key={key}
                  className={`perms-modulo-item${moduloAtivo === key ? ' is-active' : ''}${qtd === 0 ? ' is-none' : ''}`}
                  onClick={() => setModuloAtivo(key)}
                >
                  <span className="perms-modulo-label">{label}</span>
                  <span className="perms-modulo-count">{qtd}/{total}</span>
                </button>
              );
            })}
          </div>

          <div className="perms-acoes">
            <p className="perms-col-title">Ações</p>
            {(ACOES_POR_MODULO[moduloAtivo] || []).map(({ key, label }) => {
              const on = (perms[moduloAtivo] || []).includes(key);
              return (
                <button
                  key={key}
                  className={`perm-toggle-item${on ? ' is-on' : ''}`}
                  onClick={() => toggleAcao(moduloAtivo, key)}
                >
                  <span className={`perms-acao-dot${on ? ' perms-acao-dot--on' : ''}`}>
                    {on ? <Check size={10} /> : <X size={10} />}
                  </span>
                  <span className="perms-acao-label">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="perm-modal-footer">
          <button className="umodal-btn umodal-btn--cancel" onClick={onClose}>Cancelar</button>
          <button className="umodal-btn umodal-btn--save" onClick={() => setPhase('confirm')}>
            <Check size={14} />Salvar
          </button>
        </div>

      </div>
    </div>
  );
}

// ── Painel: Usuários & Permissões ─────────────────────────────────────────────
function UsuariosPanel() {
  const { can } = useAuth();
  const canCriar     = can('usuarios', 'criar');
  const canEditar    = can('usuarios', 'editar');
  const canExcluir   = can('usuarios', 'excluir');
  const canPermissoes = can('usuarios', 'gerenciar_permissoes');

  const [users,        setUsers]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [modal,        setModal]        = useState(null);
  const [filterNome,   setFilterNome]   = useState('');
  const [filterPapel,  setFilterPapel]  = useState('');
  const filteredUsers = users.filter(u => {
    const nomeOk  = !filterNome.trim()  || u.nome.toLowerCase().includes(filterNome.trim().toLowerCase());
    const papelOk = !filterPapel        || u.papel === filterPapel;
    return nomeOk && papelOk;
  });

  async function load() {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function handleSaved()   { setModal(null); load(); }
  function handleDeleted() { setModal(null); load(); }

  return (
    <div className="cfg-panel cfg-panel--usuarios">

      <div className="cfg-panel-header">
        <h2 className="cfg-panel-title">Usuários & Permissões</h2>
        <p className="cfg-panel-desc">
          Gerencie os usuários cadastrados e os perfis de acesso ao sistema.
        </p>
      </div>

      <div className="cfg-panel-body">

        {/* ── Seção: Usuários ─────────────────────────────────── */}
        <div className="cfg-field-group cfg-field-group--table">
          <div className="cfg-field-group-top">
            <div>
              <p className="cfg-field-label">Usuários</p>
              <p className="cfg-field-hint">Cadastre e gerencie os usuários com acesso ao sistema.</p>
            </div>
          </div>

          <div className="cfg-usuarios-filters">
            <div className="cfg-filter-group">
              <div className="cfg-filter-input-wrap">
                <Search size={13} className="cfg-filter-icon" />
                <input
                  className="cfg-input cfg-input--filter cfg-input--search"
                  placeholder="Filtrar por nome..."
                  value={filterNome}
                  onChange={e => setFilterNome(e.target.value)}
                />
              </div>
            </div>
            <div className="cfg-filter-group">
              <select
                className="cfg-input cfg-select"
                style={{ minWidth: 160 }}
                value={filterPapel}
                onChange={e => setFilterPapel(e.target.value)}
              >
                <option value="">Todos os perfis</option>
                {PAPEIS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            {canCriar && (
              <button className="cfg-criar-btn" onClick={() => setModal({ type: 'add' })}>
                <Plus size={14} />
                Novo Usuário
              </button>
            )}
          </div>

          {loading && <div className="cfg-usuarios-loading">Carregando...</div>}
          {error   && <p className="cfg-usuarios-error">{error}</p>}

          {!loading && !error && (
            <div className="cfg-usuarios-table-wrap">
              <table className="cfg-usuarios-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="cfg-usuarios-empty">Nenhuma informação encontrada.</td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>{u.nome}</td>
                      <td className="cfg-usuarios-td-email">{u.email}</td>
                      <td><PapelBadge papel={u.papel} /></td>
                      <td>
                        <span className={`cfg-status-badge${u.ativo ? ' cfg-status-badge--on' : ' cfg-status-badge--off'}`}>
                          <span className="cfg-status-dot" />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td>
                        <div className="cfg-usuarios-td-actions">
                          <GearMenu
                            onEditar={canEditar     ? () => setModal({ type: 'edit',   user: u }) : null}
                            onPermissoes={canPermissoes ? () => setModal({ type: 'perms',  user: u }) : null}
                            onRemover={canExcluir   ? () => setModal({ type: 'delete', user: u }) : null}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


      </div>

      {modal?.type === 'perms' && (
        <PermissoesModal
          user={modal.user}
          onClose={() => setModal(null)}
        />
      )}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <UserModal
          user={modal.type === 'edit' ? modal.user : null}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'delete' && (
        <ConfirmDelete
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirmed={handleDeleted}
        />
      )}
    </div>
  );
}

// ── Painel: Calendário de Feriados ────────────────────────────────────────────
const CalendarioPanel = forwardRef(function CalendarioPanel({ onSaved }, ref) {
  return (
    <div className="cfg-panel cfg-panel--calendar">
      <div className="cfg-panel-header">
        <h2 className="cfg-panel-title">Calendário de Feriados</h2>
        <p className="cfg-panel-desc">
          Visualize feriados nacionais e municipais. Clique em um dia para marcar como Ponto Facultativo.
        </p>
      </div>

      <div className="cfg-calendar-wrap">
        <CalendarContent ref={ref} onSaved={onSaved} />
      </div>
    </div>
  );
});

// ── Page ──────────────────────────────────────────────────────────────────────
function SaveSuccessModal({ onClose }) {
  return (
    <div className="cfg-success-overlay" onClick={onClose}>
      <div className="cfg-success-card" onClick={e => e.stopPropagation()}>
        <div className="cfg-success-icon">
          <Check size={28} />
        </div>
        <h2 className="cfg-success-title">Alterações salvas!</h2>
        <p className="cfg-success-desc">As configurações foram salvas com sucesso.</p>
        <button className="cfg-success-btn" onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export default function ConfiguracoesPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { can } = useAuth();

  const menuItems = ALL_MENU_ITEMS.filter(item => can(item.modulo, item.acao));
  const defaultSection = menuItems[0]?.id ?? 'formulas';

  const [activeSection,  setActiveSection]  = useState(defaultSection);
  const [showSaveModal,  setShowSaveModal]  = useState(false);
  const formulaRef    = useRef(null);
  const calendarioRef = useRef(null);

  function handleSave() {
    if (activeSection === 'formulas') {
      const ok = formulaRef.current?.save();
      if (ok) setShowSaveModal(true);
    }
    if (activeSection === 'calendario') {
      calendarioRef.current?.save();
    }
  }

  return (
    <div className="cfg-page">

      {/* ── Sticky top ─────────────────────────────────────────────── */}
      <div className="cfg-sticky-top">
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

        <header className="cfg-header">
          <div>
            <h1 className="cfg-title">Configurações</h1>
            <p className="cfg-subtitle">Gerencie parâmetros e preferências do sistema</p>
          </div>
          <div className="cfg-header-right">
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

      {/* ── Body: sidebar + content ─────────────────────────────────── */}
      <div className="cfg-body">

        {/* Sidebar */}
        <nav className="cfg-sidebar">
          <ul className="cfg-sidebar-list">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <li key={id}>
                <button
                  className={`cfg-sidebar-item${activeSection === id ? ' cfg-sidebar-item--active' : ''}`}
                  onClick={() => setActiveSection(id)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Content */}
        <div className="cfg-content">
          {activeSection === 'formulas'   && <FormulaPanel ref={formulaRef} />}
          {activeSection === 'calendario' && <CalendarioPanel ref={calendarioRef} onSaved={() => setShowSaveModal(true)} />}
          {activeSection === 'usuarios'   && <UsuariosPanel />}
        </div>

      </div>

      {/* ── Bottom bar ─────────────────────────────────────────────── */}
      <div className="cfg-sticky-bottom">
        <button className="cfg-bottom-btn cfg-bottom-btn--back" onClick={() => onNavigate('home')}>
          Voltar
        </button>
        {activeSection !== 'usuarios' && (
          <button className="cfg-bottom-btn cfg-bottom-btn--save" onClick={handleSave}>
            Salvar
          </button>
        )}
      </div>

      {showSaveModal && <SaveSuccessModal onClose={() => setShowSaveModal(false)} />}

    </div>
  );
}
