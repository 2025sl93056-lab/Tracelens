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

function Sidebar() {
  const { role, logout } = useAuth();
  const initials = role === 'admin' ? 'AD' : 'VI';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">🔭</div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">TraceLens</span>
          <span className="sidebar-logo-tagline">Alert → Root Cause</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <span className="sidebar-section-label">Investigation</span>

        <NavLink to="/incidents" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-link-icon">⚡</span>
          <span className="nav-link-label">Incidents</span>
        </NavLink>

        <NavLink to="/graph" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-link-icon">🕸️</span>
          <span className="nav-link-label">Service Graph</span>
        </NavLink>

        {role === 'admin' && (
          <>
            <span className="sidebar-section-label" style={{ marginTop: 8 }}>Administration</span>
            <NavLink to="/users" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <span className="nav-link-icon">👥</span>
              <span className="nav-link-label">Users</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{role === 'admin' ? 'Admin' : 'Viewer'}</div>
            <div className="sidebar-user-role">{role}</div>
          </div>
          <button className="btn-logout" onClick={logout} title="Sign out">
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
