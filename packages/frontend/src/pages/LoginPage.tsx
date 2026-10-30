import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';

export function LoginPage() {
  const { login, demoLogin, token } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (token) navigate('/incidents', { replace: true });
  }, [token, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: '⚡', text: 'Automatic incident detection & timeline generation' },
    { icon: '🔗', text: 'Temporal & deployment correlation analysis' },
    { icon: '🕸️', text: 'Live service dependency graph with impact analysis' },
    { icon: '🎯', text: 'Ranked root-cause candidates with confidence scoring' },
  ];

  return (
    <div className="login-root">
      {/* ── Brand panel ── */}
      <div className="login-brand">
        <div className="login-brand-logo">🔭</div>
        <div className="login-brand-name">TraceLens</div>
        <p className="login-brand-tagline">
          Evidence-driven incident intelligence.<br />
          From alert to root cause — automatically.
        </p>

        <div className="login-features">
          {features.map((f, i) => (
            <div
              key={i}
              className="login-feature"
              style={{ animationDelay: `${0.1 + i * 0.08}s`, animation: 'fadeIn 0.4s ease both' }}
            >
              <span className="login-feature-icon">{f.icon}</span>
              <span className="login-feature-text">{f.text}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <span className="status-dot status-dot-live" />
          Open-source · Apache 2.0 · Built for engineers
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-form-header">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 12px',
                background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--brand-primary-light)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              <span className="status-dot status-dot-live" style={{ background: 'var(--brand-primary)' }} />
              Secure Sign In
            </div>
            <div className="login-form-title">Welcome back</div>
            <div className="login-form-subtitle">
              Sign in to your TraceLens workspace
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
                placeholder="your-username"
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPass((p) => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    padding: 0,
                    transition: 'color var(--tx-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-brand)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="alert alert-error">
                <span>⚠</span>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg btn-full"
              style={{ marginTop: 4 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Signing in…
                </>
              ) : (
                <>Sign In &rarr;</>
              )}
            </button>

            <div className="login-divider">or continue without backend</div>

            <button
              type="button"
              onClick={demoLogin}
              className="btn btn-secondary btn-full"
            >
              🚀&nbsp;&nbsp;Try Demo Mode
            </button>
          </form>

          <div className="login-footer-note">
            Demo mode uses mock data — no backend required.
          </div>
        </div>
      </div>
    </div>
  );
}
