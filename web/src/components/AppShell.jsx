import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useSession } from '../api/SessionProvider.jsx';
import { UTILITY_COMPONENTS } from '../utilities/registry.js';

/**
 * Header + role-aware sidebar. The sidebar is rendered from the catalog the
 * server returned, so navigation automatically reflects the caller's roles
 * without any client-side role logic.
 */
export default function AppShell({ children }) {
  const { mode, account, logout } = useAuth();
  const { utilities } = useSession();

  const allowed = utilities.filter((u) => u.allowed);
  const denied = utilities.filter((u) => !u.allowed);

  const linkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`;

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Utility Hub</h1>
        {mode === 'dev' && <span className="badge mode">DEV AUTH</span>}
        <div className="spacer" />
        {account && (
          <span className="muted">
            {account.name}
            {account.username ? ` · ${account.username}` : ''}
          </span>
        )}
        <button className="secondary" onClick={logout}>
          {mode === 'dev' ? 'Switch persona' : 'Sign out'}
        </button>
      </header>

      <div className="app-body">
        <nav className="sidebar">
          <NavLink to="/" end className={linkClass}>
            Dashboard
          </NavLink>

          {allowed.length > 0 && <div className="sidebar-heading">Your utilities</div>}
          {allowed.map((u) =>
            UTILITY_COMPONENTS[u.id] ? (
              <NavLink
                key={u.id}
                to={`/${UTILITY_COMPONENTS[u.id].path}`}
                className={linkClass}
              >
                {u.name}
                <span className="nav-sub">{u.open ? 'open to all' : 'role granted'}</span>
              </NavLink>
            ) : null
          )}

          {denied.length > 0 && <div className="sidebar-heading">No access</div>}
          {denied.map((u) =>
            UTILITY_COMPONENTS[u.id] ? (
              <NavLink
                key={u.id}
                to={`/${UTILITY_COMPONENTS[u.id].path}`}
                className={({ isActive }) =>
                  `${linkClass({ isActive })} denied`
                }
              >
                {u.name}
                <span className="nav-sub">needs {u.requiredRoles.join(' or ')}</span>
              </NavLink>
            ) : null
          )}
        </nav>

        <main className="content">{children}</main>
      </div>
    </div>
  );
}
