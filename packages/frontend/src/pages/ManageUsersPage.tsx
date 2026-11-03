import { useEffect, useState, type FormEvent } from 'react';
import type { CreateUserResponse, UserRole } from '@tracelens/shared';
import { api } from '../api/client.js';

const AVATAR_GRADIENTS: Record<UserRole, string> = {
  admin:  'linear-gradient(135deg, #6366f1, #8b5cf6)',
  viewer: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
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
    <div style={{ animation: 'fadeIn 0.25s ease' }}>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Admin-only · users cannot self-register</p>
        </div>
        {!loadingUsers && (
          <span className="count-pill">{users.length} account{users.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 380px',
          gap: 'var(--sp-6)',
          alignItems: 'start',
        }}
      >
        {/* ── Users table ── */}
        <div className="card">
          <div className="card-header">
            <div className="section-header" style={{ margin: 0 }}>
              <div className="section-icon">👥</div>
              <div>
                <div className="section-title">Existing Users</div>
                <div className="section-note">
                  {loadingUsers ? 'Loading…' : `${users.length} account${users.length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
          </div>

          {loadingUsers ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton skeleton-text" style={{ width: '45%' }} />
                    <div className="skeleton skeleton-text" style={{ width: '25%' }} />
                  </div>
                  <div className="skeleton skeleton-text" style={{ width: 60 }} />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div style={{ padding: 'var(--sp-5)' }}>
              <div className="alert alert-error">⚠ {loadError}</div>
            </div>
          ) : users.length === 0 ? (
            <div className="empty-state" style={{ padding: 'var(--sp-12)' }}>
              <span className="empty-state-icon">👤</span>
              <div className="empty-state-title">No users yet</div>
              <div className="empty-state-desc">Create the first user using the form.</div>
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
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    style={{
                      cursor: 'default',
                      animation: 'fadeIn 0.25s ease both',
                      animationDelay: `${i * 0.04}s`,
                    }}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: AVATAR_GRADIENTS[u.role],
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#fff',
                            flexShrink: 0,
                            boxShadow:
                              u.role === 'admin'
                                ? '0 0 10px rgba(99,102,241,0.4)'
                                : '0 0 10px rgba(6,182,212,0.3)',
                          }}
                        >
                          {u.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              fontSize: '0.875rem',
                            }}
                          >
                            {u.username}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Member since today
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${u.role}`}>{u.role}</span>
                    </td>
                    <td>
                      <code
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          background: 'var(--surface-overlay)',
                          padding: '2px 7px',
                          borderRadius: 'var(--radius-xs)',
                        }}
                      >
                        {u.id.slice(0, 8)}…
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Create user form ── */}
        <div className="card">
          <div className="card-header">
            <div className="section-header" style={{ margin: 0 }}>
              <div className="section-icon">➕</div>
              <div>
                <div className="section-title">Create New User</div>
                <div className="section-note">Admin accounts only</div>
              </div>
            </div>
          </div>
          <div className="card-body">
            <form
              onSubmit={handleCreateUser}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}
            >
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

              {/* Role preview */}
              <div
                style={{
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: 'var(--surface-overlay)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)',
                  lineHeight: 1.5,
                }}
              >
                {role === 'admin'
                  ? '🔑 Admin: full access, can manage users and view all data.'
                  : '👁 Viewer: read-only access to incidents and service graph.'}
              </div>

              {formError && <div className="alert alert-error">⚠ {formError}</div>}
              {successMsg && <div className="alert alert-success">✓ {successMsg}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary btn-full"
                style={{ marginTop: 4 }}
              >
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
