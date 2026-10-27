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
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '5rem 1rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ margin: '0 0 0.25rem' }}>TraceLens</h1>
      <p style={{ color: '#888', margin: '0 0 2rem' }}>From Alert to Root Cause.</p>
      <form onSubmit={handleSubmit} style={formStyle}>
        <label style={labelStyle}>
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
            autoFocus
            autoComplete="username"
          />
        </label>
        <label style={labelStyle}>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p style={{ color: '#f44336', margin: 0, fontSize: '0.9rem' }}>{error}</p>}
        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <button type="button" onClick={demoLogin} style={demoBtnStyle}>
          Try demo (no backend needed)
        </button>
      </form>
    </main>
  );
}

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  width: 320,
  padding: '2rem',
  border: '1px solid #e0e0e0',
  borderRadius: 8,
};
const labelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontWeight: 500,
  fontSize: '0.9rem',
};
const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '1rem',
};
const btnStyle: React.CSSProperties = {
  padding: '10px',
  background: '#1a1a2e',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: '1rem',
  cursor: 'pointer',
  marginTop: '0.5rem',
};
const demoBtnStyle: React.CSSProperties = {
  padding: '9px',
  background: 'transparent',
  color: '#555',
  border: '1px solid #ccc',
  borderRadius: 4,
  fontSize: '0.9rem',
  cursor: 'pointer',
};
