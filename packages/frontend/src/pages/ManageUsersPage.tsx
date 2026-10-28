import { useEffect, useState, type FormEvent } from 'react';
import type { CreateUserResponse, UserRole } from '@tracelens/shared';
import { api } from '../api/client.js';

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 14px',
  borderBottom: '2px solid #eee',
  fontWeight: 600,
  fontSize: '0.85rem',
  color: '#555',
};
const td: React.CSSProperties = { padding: '10px 14px' };

const ROLE_COLOR: Record<UserRole, string> = {
  admin: '#1a1a2e',
  viewer: '#4a90e2',
};

export function ManageUsersPage() {
  const [users, setUsers] = useState<CreateUserResponse[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .users()
      .then(setUsers)
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'Failed to load users'))
      .finally(() => setLoadingUsers(false));
  }, []);

  async function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      const newUser = await api.createUser({ username, password, role });
      setUsers((prev) => [...prev, newUser]);
      setSuccessMsg(`User "${newUser.username}" created successfully.`);
      setUsername('');
      setPassword('');
      setRole('viewer');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>User Management</h2>
      <p style={{ color: '#888', marginTop: 0, marginBottom: '2rem', fontSize: '0.9rem' }}>
        Only admins can access this page. Create accounts here — users cannot self-register.
      </p>

      <section style={{ marginBottom: '2.5rem' }}>
        <h3 style={{ marginTop: 0 }}>Existing Users</h3>
        {loadingUsers ? (
          <p>Loading…</p>
        ) : loadError ? (
          <p style={{ color: '#f44336' }}>Error: {loadError}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Username</th>
                <th style={th}>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{u.username}</td>
                  <td style={td}>
                    <span
                      style={{
                        background: ROLE_COLOR[u.role],
                        color: '#fff',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: '1.5rem',
          maxWidth: 420,
          background: '#fff',
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create New User</h3>
        <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required
              autoComplete="off"
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
              autoComplete="new-password"
            />
          </label>
          <label style={labelStyle}>
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              style={{ ...inputStyle, background: '#fff' }}
            >
              <option value="viewer">Viewer — read-only access</option>
              <option value="admin">Admin — full access + user management</option>
            </select>
          </label>
          {formError && (
            <p style={{ color: '#f44336', margin: 0, fontSize: '0.9rem' }}>{formError}</p>
          )}
          {successMsg && (
            <p style={{ color: '#4caf50', margin: 0, fontSize: '0.9rem' }}>{successMsg}</p>
          )}
          <button type="submit" disabled={submitting} style={btnStyle}>
            {submitting ? 'Creating…' : 'Create User'}
          </button>
        </form>
      </section>
    </div>
  );
}

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
};
