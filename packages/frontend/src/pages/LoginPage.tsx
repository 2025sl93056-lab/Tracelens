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

  return (
    <div className="login-root">
      <div className="login-brand">
        <div className="login-brand-logo">🔭</div>
        <div className="login-brand-name">TraceLens</div>
        <div className="login-brand-tagline">
          Incident intelligence that goes from alert to root cause — automatically.
        </div>

        <div className="login-features">
          <div className="login-feature">
            <span className="login-feature-icon">⚡</span>
            <span className="login-feature-text">Automatic incident detection & timeline generation</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">🔗</span>
            <span className="login-feature-text">Temporal & deployment correlation analysis</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">🕸️</span>
            <span className="login-feature-text">Live service dependency graph with impact analysis</span>
          </div>
          <div className="login-feature">
            <span className="login-feature-icon">🎯</span>
            <span className="login-feature-text">Ranked root-cause candidates with confidence scoring</span>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-form-box">
          <div className="login-form-title">Welcome back</div>
          <div className="login-form-subtitle">Sign in to your TraceLens workspace</div>

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
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
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

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-full">
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>

            <div className="login-divider">or</div>

            <button type="button" onClick={demoLogin} className="btn btn-secondary btn-full">
              🚀&nbsp; Try demo — no backend needed
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
