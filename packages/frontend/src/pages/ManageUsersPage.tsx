import { useEffect, useState, type FormEvent } from 'react';
import type { CreateUserResponse, UserRole } from '@tracelens/shared';
import { api } from '../api/client.js';

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
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Admin-only · users cannot self-register</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-6)', alignItems: 'start' }}>
        {/* Users table */}
        <div className="card">
          <div className="card-header">
            <div className="section-header" style={{ margin: 0 }}>
              <div className="section-icon">👥</div>
              <div>
                <div className="section-title">Existing Users</div>
                <div className="section-note">{loadingUsers ? '…' : `${users.length} accounts`}</div>
              </div>
            </div>
          </div>

          {loadingUsers ? (
            <div style={{ padding: 'var(--space-5)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '50%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '30%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div style={{ padding: 'var(--space-5)' }}>
              <div className="alert alert-error">⚠ {loadError}</div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: u.role === 'admin'
                              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                              : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                          }}
                        >
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{u.username}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <code
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {u.id}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Create user form */}
        <div className="card">
          <div className="card-header">
            <div className="section-header" style={{ margin: 0 }}>
              <div className="section-icon">➕</div>
              <div>
                <div className="section-title">Create New User</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="new-username">Username</label>
                <input
                  id="new-username"
                  className="form-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="off"
                  placeholder="new-user"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-password">Password</label>
                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="new-role">Role</label>
                <select
                  id="new-role"
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="viewer">Viewer — read-only access</option>
                  <option value="admin">Admin — full access + user management</option>
                </select>
              </div>

              {formError && <div className="alert alert-error">⚠ {formError}</div>}
              {successMsg && <div className="alert alert-success">✓ {successMsg}</div>}

              <button type="submit" disabled={submitting} className="btn btn-primary btn-full">
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14 }} />
                    Creating…
                  </>
                ) : (
                  '➕ Create User'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
