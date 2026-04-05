import { useState, useEffect } from 'react';
import {
  Sun, Moon, Plus, Trash2, Pencil, X, Check,
  ShieldCheck, Users, Eye, UserCog, Search,
} from 'lucide-react';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import { listUsers, createUser, updateUser, deleteUser } from '../api/authClient.js';
import './UsuariosPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────────
const PAPEIS = [
  { value: 'admin',       label: 'Admin',       icon: ShieldCheck },
  { value: 'gestor',      label: 'Gestor',      icon: UserCog },
  { value: 'coordenador', label: 'Coordenador', icon: Users },
  { value: 'analista',    label: 'Analista',    icon: Eye },
];

const MODULOS = [
  { key: 'dashboard',     label: 'Dashboard & Analytics' },
  { key: 'timesheet',     label: 'Timesheet' },
  { key: 'ferias',        label: 'Férias' },
  { key: 'dayoff',        label: 'DayOff & Abonos' },
  { key: 'calendario',    label: 'Calendário' },
  { key: 'configuracoes', label: 'Configurações' },
  { key: 'usuarios',      label: 'Usuários & Permissões' },
];

const ACOES_POR_MODULO = {
  dashboard: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'casos_de_uso',  label: 'Visualizar Casos de Uso' },
    { key: 'analytics',     label: 'Visualizar Analytics' },
    { key: 'exportar',      label: 'Exportar dados' },
  ],
  timesheet: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'visualizar',    label: 'Visualizar lançamentos' },
    { key: 'editar',        label: 'Editar lançamentos' },
    { key: 'exportar',      label: 'Exportar relatório' },
  ],
  ferias: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'criar',         label: 'Criar solicitação' },
    { key: 'aprovar',       label: 'Aprovar solicitação' },
    { key: 'rejeitar',      label: 'Rejeitar solicitação' },
    { key: 'cancelar',      label: 'Cancelar solicitação' },
  ],
  dayoff: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'criar',         label: 'Criar registro' },
    { key: 'editar',        label: 'Editar registro' },
    { key: 'excluir',       label: 'Excluir registro' },
  ],
  calendario: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'adicionar',     label: 'Adicionar evento' },
    { key: 'editar',        label: 'Editar evento' },
    { key: 'remover',       label: 'Remover evento' },
  ],
  configuracoes: [
    { key: 'acessar',       label: 'Acessar página' },
    { key: 'editar_integracoes', label: 'Editar integrações' },
    { key: 'gerenciar_sync', label: 'Gerenciar sincronização' },
  ],
  usuarios: [
    { key: 'acessar',            label: 'Acessar página' },
    { key: 'criar',              label: 'Criar usuário' },
    { key: 'editar',             label: 'Editar usuário' },
    { key: 'excluir',            label: 'Excluir usuário' },
    { key: 'gerenciar_permissoes', label: 'Gerenciar permissões' },
  ],
};

const PERMISSOES_PERFIL = {
  admin: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics', 'exportar'],
    timesheet:     ['acessar', 'visualizar', 'editar', 'exportar'],
    ferias:        ['acessar', 'criar', 'aprovar', 'rejeitar', 'cancelar'],
    dayoff:        ['acessar', 'criar', 'editar', 'excluir'],
    calendario:    ['acessar', 'adicionar', 'editar', 'remover'],
    configuracoes: ['acessar', 'editar_integracoes', 'gerenciar_sync'],
    usuarios:      ['acessar', 'criar', 'editar', 'excluir', 'gerenciar_permissoes'],
  },
  gestor: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics', 'exportar'],
    timesheet:     ['acessar', 'visualizar', 'editar', 'exportar'],
    ferias:        ['acessar', 'criar', 'aprovar', 'rejeitar', 'cancelar'],
    dayoff:        ['acessar', 'criar', 'editar', 'excluir'],
    calendario:    ['acessar', 'adicionar', 'editar', 'remover'],
    configuracoes: ['acessar'],
    usuarios:      [],
  },
  coordenador: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics'],
    timesheet:     ['acessar', 'visualizar', 'editar'],
    ferias:        ['acessar', 'criar', 'aprovar'],
    dayoff:        ['acessar', 'criar', 'editar'],
    calendario:    ['acessar', 'adicionar', 'editar'],
    configuracoes: [],
    usuarios:      [],
  },
  analista: {
    dashboard:     ['acessar', 'casos_de_uso', 'analytics'],
    timesheet:     ['acessar', 'visualizar', 'editar'],
    ferias:        ['acessar', 'criar'],
    dayoff:        ['acessar', 'criar'],
    calendario:    ['acessar'],
    configuracoes: [],
    usuarios:      [],
  },
};

// ── Painel de Permissões ──────────────────────────────────────────────────────
function PermissoesPanel() {
  const [perfilAtivo,  setPerfilAtivo]  = useState('admin');
  const [moduloAtivo,  setModuloAtivo]  = useState('dashboard');

  const acoes      = ACOES_POR_MODULO[moduloAtivo] || [];
  const habilitadas = PERMISSOES_PERFIL[perfilAtivo]?.[moduloAtivo] || [];

  return (
    <div className="perms-panel">

      {/* Abas de perfil */}
      <div className="perms-tabs">
        {PAPEIS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            className={`perms-tab perms-tab--${value}${perfilAtivo === value ? ' is-active' : ''}`}
            onClick={() => setPerfilAtivo(value)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <div className="perms-body">

        {/* Lista de módulos */}
        <div className="perms-modulos">
          <p className="perms-col-title">Módulos</p>
          {MODULOS.map(({ key, label }) => {
            const qtd   = (PERMISSOES_PERFIL[perfilAtivo]?.[key] || []).length;
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

        {/* Ações do módulo selecionado */}
        <div className="perms-acoes">
          <p className="perms-col-title">Ações</p>
          {acoes.map(({ key, label }) => {
            const on = habilitadas.includes(key);
            return (
              <div key={key} className={`perms-acao-item${on ? ' is-on' : ' is-off'}`}>
                <span className={`perms-acao-dot${on ? ' perms-acao-dot--on' : ''}`}>
                  {on ? <Check size={10} /> : <X size={10} />}
                </span>
                <span className="perms-acao-label">{label}</span>
              </div>
            );
          })}
          {acoes.length === 0 && (
            <p className="perms-empty">Nenhuma ação disponível para este módulo.</p>
          )}
        </div>

      </div>
    </div>
  );
}

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

// ── Modal ─────────────────────────────────────────────────────────────────────
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

// ── ConfirmDelete ─────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UsuariosPage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [modal,       setModal]       = useState(null); // null | { type: 'add'|'edit'|'delete', user? }
  const [filterNome,  setFilterNome]  = useState('');
  const [filterPapel, setFilterPapel] = useState('');

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

  function handleSaved() { setModal(null); load(); }
  function handleDeleted() { setModal(null); load(); }

  return (
    <div className="usuarios-page">

      {/* ── Sticky top ─────────────────────────────────────────── */}
      <div className="usuarios-sticky-top">
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

        <header className="usuarios-header">
          <div className="usuarios-header-left">
            <Users size={18} className="usuarios-header-icon" />
            <div>
              <h1 className="usuarios-title">Usuários & Permissões</h1>
              <p className="usuarios-subtitle">Gerencie os acessos ao sistema</p>
            </div>
          </div>
          <div className="usuarios-header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label="Alternar tema"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>
      </div>

      <div className="usuarios-body">

        {/* ── Perfis & Permissões ───────────────────────────────── */}
        <section className="usuarios-section">
          <h2 className="usuarios-section-title">Perfis & Permissões</h2>
          <PermissoesPanel />
        </section>

        {/* ── Tabela de Usuários ────────────────────────────────── */}
        <section className="usuarios-section">
          <div className="usuarios-table-header">
            <h2 className="usuarios-section-title">Usuários Cadastrados</h2>
            <button className="usuarios-add-btn" onClick={() => setModal({ type: 'add' })}>
              <Plus size={14} />
              Novo Usuário
            </button>
          </div>

          <div className="usuarios-filters">
            <div className="usuarios-filter-input-wrap">
              <Search size={13} className="usuarios-filter-icon" />
              <input
                className="usuarios-filter-input"
                placeholder="Filtrar por nome..."
                value={filterNome}
                onChange={e => setFilterNome(e.target.value)}
              />
            </div>
            <select
              className="usuarios-filter-select"
              value={filterPapel}
              onChange={e => setFilterPapel(e.target.value)}
            >
              <option value="">Todos os perfis</option>
              {PAPEIS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {loading && <div className="usuarios-loading">Carregando...</div>}
          {error   && <p className="usuarios-fetch-error">{error}</p>}

          {!loading && !error && (
            <div className="usuarios-table-wrap">
              <table className="usuarios-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th>Status</th>
                    <th className="usuarios-th-actions">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="usuarios-empty">Nenhuma informação encontrada.</td>
                    </tr>
                  ) : filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td className="usuarios-td-nome">{u.nome}</td>
                      <td className="usuarios-td-email">{u.email}</td>
                      <td><PapelBadge papel={u.papel} /></td>
                      <td>
                        <span className={`status-dot-badge${u.ativo ? ' status-dot-badge--on' : ' status-dot-badge--off'}`}>
                          <span className="status-dot" />
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="usuarios-td-actions">
                        <button
                          className="usuarios-action-btn usuarios-action-btn--edit"
                          onClick={() => setModal({ type: 'edit', user: u })}
                          title="Editar"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="usuarios-action-btn usuarios-action-btn--delete"
                          onClick={() => setModal({ type: 'delete', user: u })}
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* ── Modais ───────────────────────────────────────────────── */}
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
