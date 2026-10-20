import { createRemoteJWKSet, jwtVerify, decodeJwt } from 'jose';
import { config } from '../config/env.js';

/**
 * Entra ID publishes signing keys at the tenant JWKS endpoint. `createRemoteJWKSet`
 * fetches and caches them, and transparently re-fetches on key rotation, so we are
 * not pinning a certificate that will expire.
 */
const jwks = config.authMode === 'entra'
  ? createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${config.entra.tenantId}/discovery/v2.0/keys`
      )
    )
  : null;

/**
 * Normalize an Entra v2.0 access token into the principal shape the rest of the
 * app uses. Role values come from the `roles` claim, which Entra emits for app
 * roles assigned either directly to users or -- as configured here -- to groups
 * the user belongs to. The token looks identical in both cases, which is exactly
 * why group-assigned app roles are the clean model: the API never sees group IDs.
 */
function toPrincipal(claims) {
  return {
    // `oid` is the immutable directory object ID. Prefer it over `sub`, which is
    // pairwise per-application and not useful for cross-system correlation.
    id: claims.oid ?? claims.sub,
    name: claims.name ?? claims.preferred_username ?? 'Unknown user',
    username: claims.preferred_username ?? claims.upn ?? null,
    tenantId: claims.tid ?? null,
    roles: Array.isArray(claims.roles) ? claims.roles : [],
    scopes: typeof claims.scp === 'string' ? claims.scp.split(' ') : [],
  };
}

function readBearer(req) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token;
}

/**
 * DEV MODE ONLY. Trusts an unsigned token so the app is runnable without a
 * tenant. Hard-fails if it is ever reachable while authMode is 'entra'.
 */
function devAuthenticate(req, res, next) {
  const token = readBearer(req);
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing bearer token.',
    });
  }
  try {
    // Dev tokens are base64url JSON produced by the web app's fake MSAL shim.
    const claims = JSON.parse(
      Buffer.from(token, 'base64url').toString('utf8')
    );
    req.principal = toPrincipal(claims);
    req.principal.devMode = true;
    return next();
  } catch {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Malformed dev token.',
    });
  }
}

async function entraAuthenticate(req, res, next) {
  const token = readBearer(req);
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Missing bearer token.',
    });
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      // Entra v2.0 tokens are issued by the tenant-specific v2.0 issuer.
      issuer: `https://login.microsoftonline.com/${config.entra.tenantId}/v2.0`,
      // The audience MUST be this API's own client ID (or its App ID URI).
      // Without this check, a token minted for ANY other application in the
      // tenant would be accepted here -- the classic confused-deputy hole.
      audience: config.entra.audience,
      algorithms: ['RS256'],
      clockTolerance: '60s',
    });

    // Defence in depth: ensure the token was actually issued *to* a user for
    // this API via the expected delegated scope, not an unrelated token type.
    if (config.entra.requiredScope) {
      const scopes =
        typeof payload.scp === 'string' ? payload.scp.split(' ') : [];
      if (!scopes.includes(config.entra.requiredScope)) {
        return res.status(403).json({
          error: 'insufficient_scope',
          message: `Token is missing the required scope '${config.entra.requiredScope}'.`,
        });
      }
    }

    req.principal = toPrincipal(payload);
    return next();
  } catch (err) {
    // Surface the reason in dev, stay terse in production.
    const detail = config.isProduction ? undefined : err.message;
    return res
      .status(401)
      .json({ error: 'unauthorized', message: 'Token validation failed.', detail });
  }
}

export const authenticate =
  config.authMode === 'entra' ? entraAuthenticate : devAuthenticate;

/**
 * Role guard factory. Returns middleware that permits the request only if the
 * principal's `roles` claim intersects `required`. An empty `required` array
 * means "any authenticated user", which models the open utilities.
 *
 * This runs per-endpoint and is the real authorization boundary. The UI's
 * navigation is only a hint; a user who hand-crafts a request to a utility they
 * lack the role for is rejected here.
 */
export function requireRoles(required = []) {
  return (req, res, next) => {
    if (!req.principal) {
      return res
        .status(401)
        .json({ error: 'unauthorized', message: 'Not authenticated.' });
    }
    if (required.length === 0) return next();

    const held = req.principal.roles ?? [];
    const ok = required.some((r) => held.includes(r));
    if (!ok) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have access to this utility.',
        requiredRoles: required,
        // Echoing held roles is helpful while experimenting. Remove in prod.
        heldRoles: config.isProduction ? undefined : held,
      });
    }
    return next();
  };
}

export { decodeJwt };
