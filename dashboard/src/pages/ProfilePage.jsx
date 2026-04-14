import { useState, useRef } from 'react';
import { Sun, Moon, UserCircle2, ShieldCheck, UserCog, Users, Eye, KeyRound, Check, X, Camera, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import ProfileMenu from '../components/profile/ProfileMenu.jsx';
import { updateUser } from '../api/authClient.js';
import './ProfilePage.css';

const PAPEL_CONFIG = {
  admin:       { label: 'Admin',       icon: ShieldCheck, cls: 'badge--admin' },
  gestor:      { label: 'Gestor',      icon: UserCog,     cls: 'badge--gestor' },
  coordenador: { label: 'Coordenador', icon: Users,       cls: 'badge--coordenador' },
  analista:    { label: 'Analista',    icon: Eye,         cls: 'badge--analista' },
};

function cropToSquare(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        canvas.getContext('2d').drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage({ theme, setTheme, menuOpen, onMenuToggle, onNavigate }) {
  const { user, avatarUrl, updateAvatar } = useAuth();
  const fileInputRef = useRef(null);

  // undefined = sem alteração pendente | null = remover | string = nova foto
  const [pendingAvatar, setPendingAvatar] = useState(undefined);

  const [senhaAtual,   setSenhaAtual]   = useState('');
  const [novaSenha,    setNovaSenha]    = useState('');
  const [confirmSenha, setConfirmSenha] = useState('');
  const [feedback,     setFeedback]     = useState(null); // { type: 'ok'|'err', msg }
  const [saving,       setSaving]       = useState(false);
  const [confirmOpen,  setConfirmOpen]  = useState(false);
  const [toastMsg,     setToastMsg]     = useState('');

  // Avatar exibido = pendente (se houver) ou o salvo no contexto
  const displayAvatar     = pendingAvatar !== undefined ? pendingAvatar : avatarUrl;
  const hasAvatarChange   = pendingAvatar !== undefined;
  const hasPasswordChange = !!(senhaAtual || novaSenha || confirmSenha);
  const isDirty = hasAvatarChange || hasPasswordChange;

  const papel    = PAPEL_CONFIG[user?.papel] || { label: user?.papel, cls: '', icon: UserCircle2 };
  const PapelIcon = papel.icon;

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const base64 = await cropToSquare(file);
    setPendingAvatar(base64);
    e.target.value = '';
  }

  function handleSalvarClick() {
    if (!isDirty) {
      showToast('Nenhuma alteração foi feita para salvar');
      return;
    }
    if (hasPasswordChange) {
      setFeedback(null);
      if (!senhaAtual) { setFeedback({ type: 'err', msg: 'Informe sua senha atual.' }); return; }
      if (!novaSenha)  { setFeedback({ type: 'err', msg: 'Informe a nova senha.' }); return; }
      if (novaSenha !== confirmSenha) { setFeedback({ type: 'err', msg: 'As senhas não coincidem.' }); return; }
      if (novaSenha.length < 6)       { setFeedback({ type: 'err', msg: 'A senha deve ter ao menos 6 caracteres.' }); return; }
    }
    setConfirmOpen(true);
  }

  async function handleConfirmedSave() {
    setSaving(true);
    setConfirmOpen(false);
    try {
      if (hasPasswordChange) {
        await updateUser(user.id, { senhaAtual, senha: novaSenha });
      }
      if (hasAvatarChange) {
        updateAvatar(pendingAvatar); // null (remover) ou base64
      }
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmSenha('');
      setPendingAvatar(undefined);
      setFeedback(null);
      showToast('Alterações salvas com sucesso!');
    } catch (err) {
      setFeedback({ type: 'err', msg: err.message || 'Erro ao salvar alterações.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      {/* ── Sticky top ─────────────────────────────────────────── */}
      <div className="profile-page-sticky">
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

        <header className="profile-page-header">
          <div>
            <h1 className="profile-page-title">Perfil</h1>
            <p className="profile-page-subtitle">Informações da sua conta</p>
          </div>
          <div className="profile-page-header-right">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              aria-label={theme === 'dark' ? 'Ativar Light Mode' : 'Ativar Dark Mode'}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <ProfileMenu onNavigate={onNavigate} />
          </div>
        </header>
      </div>

      {/* ── Conteúdo ───────────────────────────────────────────── */}
      <div className="profile-page-body">

        {/* Card: Informações da conta */}
        <div className="profile-info-card">
          <div className="profile-avatar-col">
            <button
              className="profile-avatar-wrap"
              onClick={() => fileInputRef.current?.click()}
              title="Alterar foto de perfil"
              aria-label="Alterar foto de perfil"
            >
              {displayAvatar
                ? <img className="profile-avatar-img" src={displayAvatar} alt="Avatar" />
                : <UserCircle2 size={52} strokeWidth={1.3} className="profile-avatar-icon" />
              }
              <span className="profile-avatar-overlay">
                <Camera size={18} />
              </span>
            </button>
            {displayAvatar && (
              <button
                className="profile-avatar-remove"
                onClick={() => setPendingAvatar(null)}
                title="Remover foto de perfil"
                aria-label="Remover foto de perfil"
              >
                <Trash2 size={11} />
                Remover foto
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="profile-avatar-input"
            onChange={handleAvatarChange}
          />
          <div className="profile-info-details">
            <span className="profile-info-name">{user?.nome}</span>
            <span className="profile-info-email">{user?.email}</span>
            <span className={`papel-badge ${papel.cls}`}>
              <PapelIcon size={12} />
              {papel.label}
            </span>
          </div>
        </div>

        {/* Card: Alterar senha */}
        <div className="profile-senha-card">
          <h2 className="profile-section-title">
            <KeyRound size={15} />
            Alterar Senha
          </h2>

          <div className="profile-senha-form">
            <div className="profile-field">
              <label className="profile-label">Senha atual</label>
              <input
                type="password"
                className="profile-input"
                value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>
            <div className="profile-field">
              <label className="profile-label">Nova senha</label>
              <input
                type="password"
                className="profile-input"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>
            <div className="profile-field">
              <label className="profile-label">Confirmar nova senha</label>
              <input
                type="password"
                className="profile-input"
                value={confirmSenha}
                onChange={e => setConfirmSenha(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </div>

            {feedback && (
              <div className={`profile-feedback profile-feedback--${feedback.type}`}>
                {feedback.type === 'ok' ? <Check size={13} /> : <X size={13} />}
                {feedback.msg}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Barra fixa inferior ─────────────────────────────────── */}
      <div className="profile-sticky-bottom">
        <button
          className="profile-bottom-btn profile-bottom-btn--back"
          onClick={() => onNavigate('home')}
        >
          Voltar
        </button>
        <button
          className="profile-bottom-btn profile-bottom-btn--save"
          onClick={handleSalvarClick}
          disabled={saving}
        >
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toastMsg && <div className="profile-toast">{toastMsg}</div>}

      {/* ── Modal de confirmação ────────────────────────────────── */}
      {confirmOpen && (
        <div
          className="profile-modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false); }}
        >
          <div className="profile-modal-card">
            <div className="profile-modal-header">
              <h2 className="profile-modal-title">Confirmar alterações</h2>
              <button className="profile-modal-close" onClick={() => setConfirmOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <p className="profile-modal-text">
              Deseja salvar as alterações do seu perfil?<br />
              As alterações entrarão em vigor imediatamente.
            </p>
            <div className="profile-modal-actions">
              <button
                className="profile-modal-btn profile-modal-btn--cancel"
                onClick={() => setConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="profile-modal-btn profile-modal-btn--save"
                onClick={handleConfirmedSave}
              >
                <Check size={14} />
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
