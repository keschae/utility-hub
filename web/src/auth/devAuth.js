/**
 * DEV-MODE AUTH SHIM. Not security. Not for production.
 *
 * Mints an unsigned "token" that is simply base64url-encoded JSON claims,
 * matching what the API's `devAuthenticate` middleware decodes. This lets you
 * experiment with the entire role-based authorization model -- including being
 * denied -- without registering anything in a real tenant.
 *
 * The API refuses to start with AUTH_MODE=dev when NODE_ENV=production, so this
 * pathway cannot be left open by accident in a deployed backend.
 */

const STORAGE_KEY = 'utility-hub.devSession';

/**
 * Preset personas covering the access patterns worth exercising:
 * no roles, a single role, a disjoint single role, and multi-role.
 */
export const DEV_PERSONAS = [
  {
    id: 'basic',
    label: 'Dana Basic',
    description: 'No app roles. Sees only the two open utilities.',
    claims: {
      oid: '00000000-0000-0000-0000-00000000da1a',
      name: 'Dana Basic',
      preferred_username: 'dana.basic@contoso.example',
      roles: [],
    },
  },
  {
    id: 'reconciler',
    label: 'Raj Reconciler',
    description: 'Utility3.Access — open utilities plus Utility Three.',
    claims: {
      oid: '00000000-0000-0000-0000-00000000ra71',
      name: 'Raj Reconciler',
      preferred_username: 'raj.reconciler@contoso.example',
      roles: ['Utility3.Access'],
    },
  },
  {
    id: 'finance',
    label: 'Fay Finance',
    description: 'Utility4.Access + Utility5.Access — but NOT Utility Three.',
    claims: {
      oid: '00000000-0000-0000-0000-00000000fa77',
      name: 'Fay Finance',
      preferred_username: 'fay.finance@contoso.example',
      roles: ['Utility4.Access', 'Utility5.Access'],
    },
  },
  {
    id: 'admin',
    label: 'Ada Admin',
    description: 'All three restricted roles.',
    claims: {
      oid: '00000000-0000-0000-0000-00000000ada0',
      name: 'Ada Admin',
      preferred_username: 'ada.admin@contoso.example',
      roles: ['Utility3.Access', 'Utility4.Access', 'Utility5.Access'],
    },
  },
];

/** base64url-encode a UTF-8 JSON payload, without Node's Buffer. */
function encodeClaims(claims) {
  const json = JSON.stringify(claims);
  // Round-trip through percent-encoding so non-ASCII names survive btoa.
  const utf8 = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of utf8) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Build a dev token. `tid`/`scp` are included so the principal shape the API
 * produces closely mirrors a real Entra token, making the dev and entra code
 * paths behave the same downstream.
 */
export function createDevToken(claims) {
  const now = Math.floor(Date.now() / 1000);
  return encodeClaims({
    tid: '00000000-0000-0000-0000-0000000d3v00',
    scp: 'access_as_user',
    iat: now,
    exp: now + 3600,
    ...claims,
  });
}

export function loadDevSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.claims) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDevSession(claims) {
  const session = { claims, token: createDevToken(claims) };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearDevSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Create an ad-hoc persona from a free-form role list, for experimentation. */
export function customPersona(name, roles) {
  return {
    oid: '00000000-0000-0000-0000-0000000cu570',
    name: name || 'Custom User',
    preferred_username: 'custom.user@contoso.example',
    roles,
  };
}
