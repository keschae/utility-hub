import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider.jsx';
import { createApiClient } from './client.js';

/**
 * Fetches `/api/me` once per sign-in and shares the result: the authenticated
 * principal plus the server-projected utility catalog.
 *
 * The catalog's `allowed` flags come from the API, not from client-side logic.
 * The client never decides access on its own -- it renders what the server
 * says, and the server re-checks on every utility call regardless.
 */
const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const { status, getToken, mode } = useAuth();
  const api = useMemo(() => createApiClient(getToken), [getToken]);

  const [state, setState] = useState({ loading: true, data: null, error: null });

  const refresh = useCallback(async () => {
    setState({ loading: true, data: null, error: null });
    try {
      const data = await api.get('/api/me');
      setState({ loading: false, data, error: null });
    } catch (error) {
      setState({ loading: false, data: null, error });
    }
  }, [api]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setState({ loading: false, data: null, error: null });
      return;
    }
    refresh();
  }, [status, refresh, mode]);

  const value = useMemo(
    () => ({
      api,
      loading: state.loading,
      error: state.error,
      user: state.data?.user ?? null,
      utilities: state.data?.utilities ?? [],
      refresh,
    }),
    [api, state, refresh]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>.');
  return ctx;
}

/** Convenience: the API client alone. */
export function useApi() {
  return useSession().api;
}

/** Look up one utility's catalog entry by id. */
export function useUtility(id) {
  const { utilities } = useSession();
  return utilities.find((u) => u.id === id) ?? null;
}
