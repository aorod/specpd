import { useState } from 'react';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { login as apiLogin } from '../api/authClient.js';
import './LoginPage.css';

export default function LoginPage() {
  const { login } = useAuth();

  const [email,     setEmail]     = useState('');
  const [senha,     setSenha]     = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await apiLogin(email.trim(), senha);
      login(token, user);
    } catch (err) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-root">
      <div className="login-card">

        {/* Branding */}
        <div className="login-brand">
          <span className="login-brand-mark">S</span>
          <div>
            <h1 className="login-title">SpecPD</h1>
            <p className="login-subtitle">Dashboard de Gestão</p>
          </div>
        </div>

        <p className="login-desc">Acesse o sistema com suas credenciais.</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>

          <div className="login-field">
            <label className="login-label" htmlFor="login-email">E-mail</label>
            <input
              id="login-email"
              className="login-input"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label" htmlFor="login-senha">Senha</label>
            <div className="login-password-wrap">
              <input
                id="login-senha"
                className="login-input"
                type={showSenha ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                disabled={loading}
                required
              />
              <button
                type="button"
                className="login-eye-btn"
                onClick={() => setShowSenha(v => !v)}
                tabIndex={-1}
                aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading ? (
              <span className="login-spinner" />
            ) : (
              <>
                <LogIn size={15} />
                Entrar
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}
