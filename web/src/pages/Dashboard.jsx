import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useSession } from '../api/SessionProvider.jsx';
import { AccessBadge, RoleChips } from '../components/Common.jsx';
import { UTILITY_COMPONENTS } from '../utilities/registry.js';

export default function Dashboard() {
  const { mode } = useAuth();
  const { user, utilities } = useSession();

  const allowed = utilities.filter((u) => u.allowed);
  const denied = utilities.filter((u) => !u.allowed);

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 6 }}>Signed in as {user?.name}</h2>
        <div className="muted">{user?.username}</div>

        <div style={{ marginTop: 14 }}>
          <span className="muted">App roles in your token: </span>
          <RoleChips roles={user?.roles} empty="none — only open utilities are available" />
        </div>

        <div className="muted" style={{ marginTop: 14 }}>
          You can access <strong>{allowed.length}</strong> of {utilities.length}{' '}
          utilities.
          {mode === 'dev' && ' Sign out to switch personas and compare.'}
        </div>
      </div>

      <h3>Available to you</h3>
      <div className="grid">
        {allowed.map((u) => (
          <div className="util-card" key={u.id}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <h3>{u.name}</h3>
              <AccessBadge utility={u} />
            </div>
            <p>{u.description}</p>
            {UTILITY_COMPONENTS[u.id] ? (
              <Link to={`/${UTILITY_COMPONENTS[u.id].path}`}>Open →</Link>
            ) : (
              <span className="muted">No UI registered for this utility.</span>
            )}
          </div>
        ))}
      </div>

      {denied.length > 0 && (
        <>
          <h3 style={{ marginTop: 28 }}>Restricted — you lack the required role</h3>
          <div className="grid">
            {denied.map((u) => (
              <div className="util-card denied" key={u.id}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <h3>{u.name}</h3>
                  <AccessBadge utility={u} />
                </div>
                <p>{u.description}</p>
                <div>
                  <span className="muted" style={{ fontSize: '0.8rem' }}>
                    Requires:{' '}
                  </span>
                  <RoleChips roles={u.requiredRoles} />
                </div>
                {UTILITY_COMPONENTS[u.id] && (
                  <Link to={`/${UTILITY_COMPONENTS[u.id].path}`}>
                    Try anyway (see the 403) →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
