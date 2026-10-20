import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  PublicClientApplication,
  EventType,
  InteractionRequiredAuthError,
} from '@azure/msal-browser';

import { authMode, msalConfig, apiTokenRequest, loginRequest } from './config.js';
import {
  DEV_PERSONAS,
  loadDevSession,
  saveDevSession,
  clearDevSession,
  customPersona,
} from './devAuth.js';

/**
 * One auth interface for the whole app, regardless of backing mode:
 *
 *   { mode, status, account, login, logout, getToken, personas }
 *
 * Components never branch on dev-vs-entra. `getToken()` is the single way to
 * obtain a bearer token, so the API client stays mode-agnostic.
 */
const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Entra-backed implementation
// ---------------------------------------------------------------------------

let msalInstance = null;
/** Created lazily and only once; MSAL must not be constructed in dev mode. */
function getMsalInstance() {
  if (!msalInstance) msalInstance = new PublicClientApplication(msalConfig);
  return msalInstance;
}

function EntraAuthProvider({ children }) {
  const instance = getMsalInstance();
  const [status, setStatus] = useState('initializing');
  const [account, setAccount] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    // MSAL v3+ requires explicit initialize() before any other call, and
    // handleRedirectPromise() must run on every load to complete a redirect.
    instance
      .initialize()
      .then(() => instance.handleRedirectPromise())
      .then((result) => {
        if (cancelled) return;
        const active = result?.account ?? instance.getActiveAccount() ?? instance.getAllAccounts()[0] ?? null;
        if (active) instance.setActiveAccount(active);
        setAccount(active);
        setStatus(active ? 'authenticated' : 'unauthenticated');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setStatus('error');
      });

    const callbackId = instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload?.account) {
        instance.setActiveAccount(event.payload.account);
        setAccount(event.payload.account);
        setStatus('authenticated');
      }
      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        setAccount(null);
        setStatus('unauthenticated');
      }
    });

    return () => {
      cancelled = true;
      if (callbackId) instance.removeEventCallback(callbackId);
    };
  }, [instance]);

  const login = useCallback(() => instance.loginRedirect(loginRequest), [instance]);

  const logout = useCallback(() => instance.logoutRedirect(), [instance]);

  /**
   * Acquire an API access token. Silent first; fall back to interaction only
   * when the library tells us interaction is genuinely required (expired
   * refresh token, new consent, MFA step-up). Blindly redirecting on any error
   * creates redirect loops, so the error type is checked.
   */
  const getToken = useCallback(async () => {
    const active = instance.getActiveAccount();
    if (!active) throw new Error('Not signed in.');
    try {
      const result = await instance.acquireTokenSilent({ ...apiTokenRequest, account: active });
      return result.accessToken;
    } catch (err) {
      if (err instanceof InteractionRequiredAuthError) {
        await instance.acquireTokenRedirect(apiTokenRequest);
        // The redirect navigates away; this is unreachable in practice.
        return null;
      }
      throw err;
    }
  }, [instance]);

  const value = useMemo(
    () => ({
      mode: 'entra',
      status,
      error,
      account: account ? { name: account.name, username: account.username } : null,
      login,
      logout,
      getToken,
      personas: null,
      selectPersona: null,
    }),
    [status, error, account, login, logout, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Dev-backed implementation
// ---------------------------------------------------------------------------

function DevAuthProvider({ children }) {
  const [session, setSession] = useState(() => loadDevSession());

  const selectPersona = useCallback((claims) => {
    setSession(saveDevSession(claims));
  }, []);

  const logout = useCallback(() => {
    clearDevSession();
    setSession(null);
  }, []);

  // In dev mode "login" is choosing a persona, so there is no generic login
  // action; the login screen renders the picker and calls selectPersona.
  const login = useCallback(() => {}, []);

  const getToken = useCallback(async () => {
    const current = loadDevSession();
    if (!current) throw new Error('Not signed in.');
    return current.token;
  }, []);

  const value = useMemo(
    () => ({
      mode: 'dev',
      status: session ? 'authenticated' : 'unauthenticated',
      error: null,
      account: session
        ? { name: session.claims.name, username: session.claims.preferred_username }
        : null,
      login,
      logout,
      getToken,
      personas: DEV_PERSONAS,
      selectPersona,
      customPersona,
    }),
    [session, login, logout, getToken, selectPersona]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }) {
  return authMode === 'entra' ? (
    <EntraAuthProvider>{children}</EntraAuthProvider>
  ) : (
    <DevAuthProvider>{children}</DevAuthProvider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
