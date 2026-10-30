import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
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

const PAGE_TITLES: Record<string, string> = {
  '/incidents': 'Incidents',
  '/graph': 'Service Graph',
  '/users': 'User Management',
};

function Topbar() {
  const location = useLocation();
  const base = '/' + location.pathname.split('/')[1];
  const title = PAGE_TITLES[base] ?? 'TraceLens';
  const isDetail = location.pathname.startsWith('/incidents/') && location.pathname !== '/incidents';

  return (
    <div className="topbar">
      <div className="topbar-title">
        {isDetail ? (
          <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
            Incidents&nbsp;
            <span style={{ color: 'var(--text-muted)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Detail</span>
          </span>
        ) : (
          title
        )}
      </div>
      <div className="topbar-actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="status-dot status-dot-live" />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Live</span>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  const { role, logout } = useAuth();
  const initials = role === 'admin' ? 'AD' : 'VI';
  const displayName = role === 'admin' ? 'Admin' : 'Viewer';

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔭</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">TraceLens</span>
          <span className="sidebar-logo-tagline">Alert → Root Cause</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Investigation</span>

        <NavLink
          to="/incidents"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span className="nav-link-icon">⚡</span>
          <span className="nav-link-label">Incidents</span>
        </NavLink>

        <NavLink
          to="/graph"
          className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
        >
          <span className="nav-link-icon">🕸️</span>
          <span className="nav-link-label">Service Graph</span>
        </NavLink>

        {role === 'admin' && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>
              Administration
            </span>
            <NavLink
              to="/users"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <span className="nav-link-icon">👥</span>
              <span className="nav-link-label">Users</span>
            </NavLink>
          </>
        )}

        {/* Divider before system info */}
        <div style={{ flex: 1 }} />

        {/* System status card */}
        <div
          style={{
            margin: '8px 4px',
            padding: '12px 14px',
            background: 'rgba(34,197,94,0.07)',
            border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="status-dot status-dot-live" />
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--low-light)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              System Online
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
            Ingestion API active
          </div>
        </div>
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{displayName}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
          <button
            className="btn-logout"
            onClick={logout}
            title="Sign out"
            data-tooltip="Sign out"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-content">
        <Topbar />
        <main className="page-body">{children}</main>
      </div>
    </div>
  );
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
                <Layout><IncidentListPage /></Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/incidents/:id"
            element={
              <RequireAuth>
                <Layout><IncidentDetailPage /></Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/graph"
            element={
              <RequireAuth>
                <Layout><GraphPage /></Layout>
              </RequireAuth>
            }
          />
          <Route
            path="/users"
            element={
              <RequireAdmin>
                <Layout><ManageUsersPage /></Layout>
              </RequireAdmin>
            }
          />
          <Route path="*" element={<Navigate to="/incidents" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
