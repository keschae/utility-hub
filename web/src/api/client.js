import { apiBaseUrl } from '../auth/config.js';

/**
 * Error type carrying the HTTP status and the API's structured error body, so
 * callers can distinguish "you are not signed in" (401) from "you are signed
 * in but lack the role" (403). That distinction is the whole point of the
 * authorization demo, so it must not be flattened into a generic failure.
 */
export class ApiError extends Error {
  constructor(status, body, url) {
    super(body?.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = body?.error ?? 'unknown_error';
    this.body = body ?? null;
    this.url = url;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }

  /** Roles the endpoint demanded, when the API reported them on a 403. */
  get requiredRoles() {
    return this.body?.requiredRoles ?? null;
  }

  get heldRoles() {
    return this.body?.heldRoles ?? null;
  }
}

/**
 * Build an API caller bound to a token getter.
 *
 * A token is fetched per request rather than captured once, because MSAL
 * rotates access tokens and `acquireTokenSilent` handles renewal internally.
 * Caching a token in module scope would eventually send an expired one.
 */
export function createApiClient(getToken) {
  async function request(path, { method = 'GET', body, raw = false, signal } = {}) {
    const url = `${apiBaseUrl}${path}`;
    const token = await getToken();

    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      // Error responses should be JSON, but a proxy or crash can return HTML.
      // Never let a parse failure mask the real status code.
      let parsed = null;
      try {
        parsed = await response.json();
      } catch {
        parsed = { error: 'non_json_response', message: await response.text().catch(() => '') };
      }
      throw new ApiError(response.status, parsed, url);
    }

    // Callers that need the raw Response (file downloads) opt out of parsing.
    if (raw) return response;
    if (response.status === 204) return null;
    return response.json();
  }

  return {
    request,
    get: (path, opts) => request(path, { ...opts, method: 'GET' }),
    post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),

    /**
     * Download an attachment response. The bearer token means a plain anchor
     * href cannot be used (no way to attach the header), so the file is fetched
     * into a blob and saved via a temporary object URL.
     */
    async download(path, filename) {
      const response = await request(path, { raw: true });
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Revoking immediately can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
    },
  };
}
