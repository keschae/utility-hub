import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/env.js';
import { catalogForRoles } from './config/catalog.js';
import { authenticate } from './middleware/auth.js';
import { mountUtilities } from './utilities/index.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    // No cookies are used; the SPA sends a bearer token. Keeping credentials
    // off avoids widening CORS more than necessary.
    credentials: false,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(morgan(config.isProduction ? 'combined' : 'dev'));

// ---- Public endpoints -------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', authMode: config.authMode });
});

/**
 * Lets the SPA discover how to authenticate instead of duplicating tenant
 * config in the frontend build. In dev mode the SPA uses this to switch on its
 * fake-login UI.
 */
app.get('/api/auth/config', (req, res) => {
  res.json({
    authMode: config.authMode,
    entra:
      config.authMode === 'entra'
        ? {
            tenantId: config.entra.tenantId,
            apiClientId: config.entra.audience,
            scope: `api://${config.entra.audience}/${config.entra.requiredScope}`,
          }
        : null,
  });
});

// ---- Everything below requires a valid token -------------------------------

app.use('/api', authenticate);

/** Who am I, and what can I see? Drives the SPA's navigation. */
app.get('/api/me', (req, res) => {
  res.json({
    user: req.principal,
    utilities: catalogForRoles(req.principal.roles),
  });
});

app.use('/api/utilities', mountUtilities());

// ---- Fallbacks --------------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ error: 'not_found', message: `No route for ${req.method} ${req.path}` });
});

// Express 5 forwards async rejections here automatically.
app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  res.status(500).json({
    error: 'internal_error',
    message: 'Unexpected server error.',
    detail: config.isProduction ? undefined : err.message,
  });
});

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`  AUTH_MODE = ${config.authMode}`);
  if (config.authMode === 'dev') {
    console.log('  WARNING: dev mode trusts unsigned tokens. Never use in production.');
  }
});

export default app;
