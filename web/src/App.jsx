import { Navigate, Route, Routes } from 'react-router-dom';

import { useAuth } from './auth/AuthProvider.jsx';
import { SessionProvider, useSession } from './api/SessionProvider.jsx';
import AppShell from './components/AppShell.jsx';
import { ErrorNotice, Loading } from './components/Common.jsx';
import { RequireUtility } from './components/RequireUtility.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import { UTILITY_COMPONENTS } from './utilities/registry.js';

/** Routed content, rendered only once /api/me has resolved. */
function AuthenticatedApp() {
  const { loading, error, user } = useSession();

  if (loading) return <Loading label="Loading your profile and utility catalog…" />;

  // A failure here (API down, token rejected) must not render an empty shell
  // with no explanation.
  if (error || !user) {
    return (
      <div className="card">
        <h2>Could not load your session</h2>
        <ErrorNotice error={error} />
        <p className="muted">
          Confirm the API is running and that its <code>AUTH_MODE</code> matches
          the web app's configuration.
        </p>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {Object.entries(UTILITY_COMPONENTS).map(([id, { path, Component }]) => (
          <Route
            key={id}
            path={`/${path}`}
            element={
              <RequireUtility id={id}>
                <Component />
              </RequireUtility>
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  const { status } = useAuth();

  if (status === 'initializing') return <Loading label="Initializing…" />;
  if (status === 'error') return <Login />;
  if (status !== 'authenticated') return <Login />;

  // SessionProvider is mounted only when authenticated so /api/me is never
  // called without a token.
  return (
    <SessionProvider>
      <AuthenticatedApp />
    </SessionProvider>
  );
}
