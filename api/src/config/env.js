import 'dotenv/config';

const authMode = (process.env.AUTH_MODE ?? 'dev').toLowerCase();

if (!['dev', 'entra'].includes(authMode)) {
  throw new Error(`AUTH_MODE must be 'dev' or 'entra', got '${authMode}'.`);
}

const isProduction = process.env.NODE_ENV === 'production';

// Refuse to boot in a state where the app looks secure but is not.
if (isProduction && authMode === 'dev') {
  throw new Error(
    'Refusing to start: AUTH_MODE=dev with NODE_ENV=production. ' +
      'Dev mode trusts unsigned tokens and must never run in production.'
  );
}

const entra = {
  tenantId: process.env.ENTRA_TENANT_ID ?? '',
  // The audience of tokens this API accepts == this API app registration's
  // client ID. MSAL may also mint tokens with the App ID URI as audience.
  audience: process.env.ENTRA_API_CLIENT_ID ?? '',
  // Delegated scope exposed by the API, e.g. "access_as_user".
  requiredScope: process.env.ENTRA_REQUIRED_SCOPE ?? 'access_as_user',
};

if (authMode === 'entra') {
  const missing = ['tenantId', 'audience'].filter((k) => !entra[k]);
  if (missing.length) {
    throw new Error(
      `AUTH_MODE=entra requires ENTRA_TENANT_ID and ENTRA_API_CLIENT_ID. Missing: ${missing.join(', ')}`
    );
  }
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  authMode,
  isProduction,
  entra,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
};
