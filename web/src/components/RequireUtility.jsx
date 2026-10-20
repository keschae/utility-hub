import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession, useUtility } from '../api/SessionProvider.jsx';
import { Loading, RoleChips } from './Common.jsx';

/**
 * Client-side gate for a utility route.
 *
 * Deliberately NOT a hard block. When the user lacks the role it explains the
 * denial and still offers a "call the API anyway" button, so you can observe
 * the server returning 403 rather than taking the UI's word for it.
 *
 * The UI gate is UX. The API's `requireRoles` middleware is the security
 * boundary. Keeping the escape hatch here makes that separation visible and
 * testable instead of theoretical.
 */
export function RequireUtility({ id, children }) {
  const { loading } = useSession();
  const utility = useUtility(id);
  const [override, setOverride] = useState(false);

  if (loading) return <Loading />;

  if (!utility) {
    return (
      <div className="card">
        <h2>Unknown utility</h2>
        <p className="muted">
          No utility with id <code className="mono">{id}</code> is present in the
          catalog returned by the API.
        </p>
        <Link to="/">Back to dashboard</Link>
      </div>
    );
  }

  if (!utility.allowed && !override) {
    return (
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>{utility.name}</h2>
          <span className="badge denied">No access</span>
        </div>

        <div className="alert warn" style={{ marginTop: 14 }}>
          <strong>You do not have the role required for this utility.</strong>
          <div style={{ marginTop: 8 }}>
            Required: <RoleChips roles={utility.requiredRoles} />
          </div>
          <div className="muted" style={{ marginTop: 10 }}>
            In Entra ID this role is granted by assigning your account — or a
            group you belong to — to the matching app role on the API app
            registration. After an assignment change you must obtain a new token
            (sign out and in) because roles are baked into the issued token.
          </div>
        </div>

        <p className="muted">
          This screen is the client-side gate. To prove the server enforces it
          independently, call the endpoint anyway and inspect the response:
        </p>
        <div className="row">
          <button className="secondary" onClick={() => setOverride(true)}>
            Call the API anyway (expect 403)
          </button>
          <Link to="/" className="nav-link" style={{ flex: '0 0 auto' }}>
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {override && !utility.allowed && (
        <div className="alert warn">
          <strong>Override active.</strong> The UI gate is bypassed on purpose.
          Requests below will be rejected by the API with 403.
        </div>
      )}
      {children}
    </>
  );
}
