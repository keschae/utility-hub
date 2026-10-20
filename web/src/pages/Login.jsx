import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { ALL_KNOWN_ROLES } from '../utilities/registry.js';

/**
 * Sign-in screen. In 'entra' mode it is a single redirect button. In 'dev' mode
 * it is a persona picker, which doubles as the control panel for experimenting
 * with different role combinations.
 */
export default function Login() {
  const { mode, status, error, login, personas, selectPersona, customPersona } = useAuth();
  const [customName, setCustomName] = useState('Custom User');
  const [customRoles, setCustomRoles] = useState([]);

  if (status === 'initializing') {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="spinner">Initializing sign-in…</div>
        </div>
      </div>
    );
  }

  const toggleRole = (role) => {
    setCustomRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 style={{ marginTop: 0 }}>Utility Hub</h1>

        {mode === 'entra' ? (
          <>
            <p className="muted">
              Sign in with your organizational account. Access to individual
              utilities is determined by the app roles assigned to you or your
              groups in Microsoft Entra ID.
            </p>
            {error && (
              <div className="alert error">
                <strong>Sign-in error:</strong> {error.message}
              </div>
            )}
            <button onClick={login} style={{ width: '100%', marginTop: 8 }}>
              Sign in with Microsoft
            </button>
          </>
        ) : (
          <>
            <div className="alert warn">
              <strong>Dev mode — no real authentication.</strong>
              <div style={{ marginTop: 6 }}>
                The API is running with <code>AUTH_MODE=dev</code> and accepts
                unsigned tokens. Pick a persona to explore how role-based access
                behaves. Configure <code>VITE_ENTRA_*</code> in{' '}
                <code>web/.env.local</code> to switch to real Entra ID.
              </div>
            </div>

            <h3 style={{ marginBottom: 8 }}>Preset personas</h3>
            {personas?.map((p) => (
              <button
                key={p.id}
                className="persona"
                onClick={() => selectPersona(p.claims)}
              >
                {p.label}
                <small>{p.description}</small>
              </button>
            ))}

            <h3 style={{ marginTop: 20, marginBottom: 8 }}>Or build a custom user</h3>
            <div className="field">
              <label htmlFor="custom-name">Display name</label>
              <input
                id="custom-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Roles to include in the token</label>
              <div className="chips">
                {ALL_KNOWN_ROLES.map((role) => (
                  <label
                    key={role}
                    className="chip"
                    style={{ cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}
                  >
                    <input
                      type="checkbox"
                      style={{ width: 'auto', margin: 0 }}
                      checked={customRoles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </div>
            <button
              className="secondary"
              style={{ width: '100%' }}
              onClick={() => selectPersona(customPersona(customName, customRoles))}
            >
              Sign in as custom user
            </button>
          </>
        )}
      </div>
    </div>
  );
}
