import { useState, useRef, useEffect } from 'react';
import { UserCircle2, Settings, CalendarDays } from 'lucide-react';
import './ProfileMenu.css';

export default function ProfileMenu({ onNavigate }) {
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

  return (
    <>
      <button
        ref={btnRef}
        className={`profile-btn${open ? ' is-open' : ''}`}
        onClick={handleOpen}
        aria-label="Perfil"
        title="Perfil"
      >
        <UserCircle2 size={18} />
      </button>

      {open && (
        <div
          ref={dropRef}
          className="profile-dropdown"
          style={{ top: pos.top, right: pos.right }}
        >
          <button className="profile-item" onClick={() => setOpen(false)}>
            <Settings size={14} />
            Configurações
          </button>
          <button className="profile-item" onClick={() => { setOpen(false); onNavigate?.('calendario'); }}>
            <CalendarDays size={14} />
            Calendário
          </button>
        </div>
      )}
    </>
  );
}
