import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { IncidentListPage } from './pages/IncidentListPage.js';
import { IncidentDetailPage } from './pages/IncidentDetailPage.js';
import { GraphPage } from './pages/GraphPage.js';
import { ManageUsersPage } from './pages/ManageUsersPage.js';

function RequireAuth({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role !== 'admin') return <Navigate to="/incidents" replace />;
  return <>{children}</>;
}

function Layout({ children }: { children: ReactNode }) {
  const { role, logout } = useAuth();
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#fafafa' }}>
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 1.5rem',
          height: 52,
          background: '#1a1a2e',
          color: '#fff',
          gap: 4,
        }}
      >
        <strong style={{ marginRight: '1.5rem', letterSpacing: '0.03em' }}>TraceLens</strong>
        <NavLink to="/incidents" style={navLinkStyle}>
          Incidents
        </NavLink>
        <NavLink to="/graph" style={navLinkStyle}>
          Graph
        </NavLink>
        {role === 'admin' && (
          <NavLink to="/users" style={navLinkStyle}>
            Users
          </NavLink>
        )}
        <button
          onClick={logout}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'rgba(255,255,255,0.7)',
            padding: '4px 14px',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Sign out
        </button>
      </nav>
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1.5rem' }}>{children}</main>
    </div>
  );
}

function navLinkStyle({ isActive }: { isActive: boolean }): React.CSSProperties {
  return {
    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
    textDecoration: 'none',
    padding: '4px 12px',
    borderRadius: 4,
    fontWeight: isActive ? 600 : 400,
    background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
  };
}

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/incidents"
            element={
              <RequireAuth>
                <Layout>
                  <IncidentListPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <RequireAuth>
                <Layout>
                  <IncidentDetailPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/graph"
            element={
              <RequireAuth>
                <Layout>
                  <GraphPage />
                </Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAdmin>
                <Layout>
                  <ManageUsersPage />
                </Layout>
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/incidents" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
