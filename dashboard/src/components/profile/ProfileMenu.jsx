import { useState, useRef, useEffect } from 'react';
import { UserCircle2, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './ProfileMenu.css';

export default function ProfileMenu({ onNavigate }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, right: 0 });
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
      setPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen(o => !o);
  }

  function handleLogout() {
    setOpen(false);
    logout();
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`profile-btn${open ? ' is-open' : ''}`}
        onClick={handleOpen}
        aria-label="Perfil"
        title={user?.nome || 'Perfil'}
      >
        <UserCircle2 size={18} />
      </button>

      {open && (
        <div
          ref={dropRef}
          className="profile-dropdown"
          style={{ top: pos.top, right: pos.right }}
        >
          {user && (
            <div className="profile-user-info">
              <span className="profile-user-name">{user.nome}</span>
              <span className="profile-user-email">{user.email}</span>
            </div>
          )}

          <div className="profile-divider" />

          <button
            className="profile-item"
            onClick={() => { setOpen(false); onNavigate?.('configuracoes'); }}
          >
            <Settings size={14} />
            Configurações
          </button>

          <div className="profile-divider" />

          <button className="profile-item profile-item--logout" onClick={handleLogout}>
            <LogOut size={14} />
            Sair
          </button>
        </div>
      )}
    </>
  );
}
