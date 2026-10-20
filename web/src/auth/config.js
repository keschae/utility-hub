/**
 * Auth configuration, derived from build-time env vars.
 *
 * The app runs in one of two modes:
 *
 *   'entra' - real Microsoft Entra ID via MSAL. Selected when the SPA client
 *             ID, tenant ID and API scope are all present.
 *   'dev'   - a local fake-login shim that mints an unsigned token the API
 *             accepts only when it too is in AUTH_MODE=dev. This exists so the
 *             whole app is explorable without a tenant.
 *
 * Mode is inferred rather than set by a flag so you cannot accidentally ship a
 * build that has real credentials but is still using the fake login.
 */
const clientId = import.meta.env.VITE_ENTRA_CLIENT_ID?.trim() ?? '';
const tenantId = import.meta.env.VITE_ENTRA_TENANT_ID?.trim() ?? '';
const apiScope = import.meta.env.VITE_ENTRA_API_SCOPE?.trim() ?? '';

export const authMode = clientId && tenantId && apiScope ? 'entra' : 'dev';

export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/$/, '');

/**
 * MSAL configuration. Only meaningful in 'entra' mode.
 *
 * `sessionStorage` is used for the token cache rather than `localStorage` so
 * tokens do not outlive the browser session. `localStorage` would persist them
 * across tabs and restarts, which is a larger blast radius than this kind of
 * internal tool needs.
 */
export const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    // Keep the user on the page they deep-linked to after redirect.
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

/**
 * The scope set requested when silently acquiring an API access token.
 *
 * IMPORTANT: this requests the API's own custom scope, NOT Graph scopes. The
 * resulting access token has the API as its audience, which is what the API's
 * audience check requires. Requesting only 'openid'/'profile' here would yield
 * a token the API correctly rejects.
 */
export const apiTokenRequest = {
  scopes: apiScope ? [apiScope] : [],
};

/** Scopes requested at interactive login. */
export const loginRequest = {
  scopes: ['openid', 'profile', ...(apiScope ? [apiScope] : [])],
};
