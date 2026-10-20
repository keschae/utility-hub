import { ApiError } from '../api/client.js';

/** Access-state badge derived from the server-provided catalog entry. */
export function AccessBadge({ utility }) {
  if (!utility) return null;
  if (utility.open) return <span className="badge open">Open</span>;
  return utility.allowed ? (
    <span className="badge granted">Role granted</span>
  ) : (
    <span className="badge denied">No access</span>
  );
}

export function RoleChips({ roles, empty = 'none' }) {
  if (!roles?.length) return <span className="muted">{empty}</span>;
  return (
    <span className="chips">
      {roles.map((r) => (
        <span className="chip" key={r}>
          {r}
        </span>
      ))}
    </span>
  );
}

/**
 * Renders an error with the 401/403 distinction made explicit, because that
 * difference is the core thing this sample is meant to demonstrate.
 */
export function ErrorNotice({ error }) {
  if (!error) return null;

  if (error instanceof ApiError && error.isForbidden) {
    return (
      <div className="alert error">
        <strong>403 Forbidden — blocked by the API.</strong>
        <div style={{ marginTop: 6 }}>{error.message}</div>
        {error.requiredRoles && (
          <div style={{ marginTop: 8 }}>
            Required role(s): <RoleChips roles={error.requiredRoles} />
          </div>
        )}
        {error.heldRoles && (
          <div style={{ marginTop: 6 }}>
            Your role(s): <RoleChips roles={error.heldRoles} />
          </div>
        )}
        <div className="muted" style={{ marginTop: 8 }}>
          This response came from the server, not the UI. Hiding the navigation
          link is cosmetic; this check is the actual security boundary.
        </div>
      </div>
    );
  }

  if (error instanceof ApiError && error.isUnauthorized) {
    return (
      <div className="alert error">
        <strong>401 Unauthorized.</strong> {error.message}
        <div className="muted" style={{ marginTop: 6 }}>
          The token is missing, expired or failed validation. Try signing out
          and back in.
        </div>
      </div>
    );
  }

  return (
    <div className="alert error">
      <strong>{error instanceof ApiError ? `Error ${error.status}` : 'Error'}:</strong>{' '}
      {error.message}
    </div>
  );
}

export function Loading({ label = 'Loading…' }) {
  return <div className="spinner">{label}</div>;
}

/** Collapsible raw-JSON view, so you can inspect exactly what the API returned. */
export function JsonBlock({ value, label = 'Raw API response' }) {
  if (value === null || value === undefined) return null;
  return (
    <details style={{ marginTop: 14 }}>
      <summary className="muted" style={{ cursor: 'pointer' }}>
        {label}
      </summary>
      <pre className="output" style={{ marginTop: 8 }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

/** Standard page header for a utility, showing its access state and roles. */
export function UtilityHeader({ utility, title, children }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>{utility?.name ?? title}</h2>
        <AccessBadge utility={utility} />
      </div>
      {utility?.description && (
        <p className="muted" style={{ marginBottom: 0 }}>
          {utility.description}
        </p>
      )}
      {!utility?.open && utility?.requiredRoles?.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <span className="muted">Requires: </span>
          <RoleChips roles={utility.requiredRoles} />
        </div>
      )}
      {children}
    </div>
  );
}
