import { Umbrella } from 'lucide-react';

export default function DayOffPage({ theme, setTheme }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      gap: '16px',
      fontFamily: 'var(--font-sans)',
    }}>
      <Umbrella size={48} strokeWidth={1.2} style={{ color: 'var(--color-info)' }} />
      <h1 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        DayOff / Abonos
      </h1>
      <p style={{ fontSize: '0.88rem', color: 'var(--color-text-muted)' }}>
        Página em construção
      </p>
    </div>
  );
}
