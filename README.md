# Utility Hub

A reference implementation of a **framework for a collection of utilities**,
where access to each utility is controlled by **Microsoft Entra ID app roles**.

- Every authenticated user can use the *open* utilities (One, Two).
- The *restricted* utilities (Three, Four, Five) each require a specific app
  role, so one user may hold Utility Three while another holds Four and Five.
- Authorization is enforced **server-side on every request**. The UI's
  navigation is a convenience, not the security boundary.

It runs with no Entra tenant out of the box, using a dev-mode persona picker, so
you can explore the whole role model immediately.

---

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | React 19 + Vite 7, React Router 7, MSAL Browser 4 |
| Backend | Express 5 (ESM), `jose` for JWT validation |
| Auth | Entra ID, authorization code + PKCE, app roles in the `roles` claim |

### Why React + Express rather than Next.js

Kept deliberately as two applications:

- **The security boundary stays in one obvious place.** Authorization is a role
  check on each API route. Next.js offers middleware, server components and
  route handlers as three different places auth can live, each with different
  Entra token handling — more surface area to get subtly wrong.
- **These utilities are interactive tools, not content.** Next.js's core value
  is SSR/SSG for SEO and first paint. Everything here is behind a login and
  user-specific, so there is no SEO and nothing cacheable to gain.
- **MSAL is cleanest in a pure SPA.** `msal-browser` with PKCE is the
  well-trodden Entra path. Under Next.js you either run MSAL client-only
  (defeating the point of Next.js) or move to a confidential-client session-cookie
  flow, which is more moving parts and a different app-registration shape.
- **The API stays reusable.** A standalone Express API can later serve a CLI, a
  Power Automate flow, or a second frontend.

The real cost is two dev servers, two deploys and CORS config. That is a small,
known price. Because the utilities are plain Express routers, moving them into
Next.js route handlers later is mostly re-mounting them — this is not a one-way
door.

---

## Quick start (no Entra tenant needed)

Two terminals:

```bash
# terminal 1 — API on :4000
cd api
cp .env.example .env
npm install
npm run dev
```

```bash
# terminal 2 — web on :5173
cd web
npm install
npm run dev
```

Open <http://localhost:5173>. Pick a persona:

| Persona | Roles | Sees |
| --- | --- | --- |
| Dana Basic | *none* | Utility One, Two |
| Raj Reconciler | `Utility3.Access` | One, Two, Three |
| Fay Finance | `Utility4.Access`, `Utility5.Access` | One, Two, Four, Five |
| Ada Admin | all three | all five |

There is also a custom-user builder to tick any role combination.

`.env` is optional for the API — it defaults to `AUTH_MODE=dev`.

### Try the authorization model

1. Sign in as **Raj**. Utility Four appears under "No access" in the sidebar.
2. Open it anyway and click **"Call the API anyway (expect 403)"**.
3. You get a real `403` from Express, showing the required and held roles.

That escape hatch is deliberate: it demonstrates the server enforces access
independently of whether the UI hid the link.

### Switching to a real tenant

See **[docs/ENTRA_SETUP.md](docs/ENTRA_SETUP.md)** for app registrations, the
exposed scope, app-role definitions and group assignment. The web app switches
to Entra mode automatically once the `VITE_ENTRA_*` vars are set.

---

## How authorization works

```
Browser                    Express API                  Entra ID
   |                            |                           |
   |-- sign in (PKCE) ------------------------------------->|
   |<- access token (aud=API, roles=[...], scp=...) --------|
   |                            |                           |
   |-- GET /api/me ------------>|                           |
   |   Bearer <token>           |-- fetch JWKS (cached) --->|
   |                            |   verify sig/iss/aud/scp  |
   |<- { user, utilities[] } ---|                           |
   |                            |
   |-- POST /api/utilities/utility-three/reconcile -------->|
   |                            |   requireRoles(['Utility3.Access'])
   |<- 200 or 403 --------------|
```

Three layers, in order of authority:

1. **Token validation** (`api/src/middleware/auth.js`) — verifies signature
   against the tenant JWKS, plus issuer, **audience** and the `scp` scope. The
   audience check is what stops a token minted for a different app in the same
   tenant from being replayed here.
2. **Role enforcement** (`requireRoles`) — mounted per utility from the catalog.
   **This is the security boundary.**
3. **UI projection** (`/api/me`) — the server tells the client which utilities
   it may use, purely so navigation can be rendered. Tampering with it gains
   nothing, because layer 2 re-checks every call.

Roles arrive as a flat `roles` claim whether assigned to the user directly or to
a group. Assigning to **groups** is recommended — the token is identical, and it
avoids the `groups` overage claim that would otherwise force a Graph lookup per
request.

---

## Layout

```
api/
  src/
    config/
      catalog.js        # SINGLE SOURCE OF TRUTH: utilities -> required roles
      env.js            # env parsing; refuses dev auth in production
    middleware/auth.js  # JWT validation + requireRoles() guard factory
    utilities/
      index.js          # mounts each router with its guard, from the catalog
      utility{One..Five}.js
    server.js
web/
  src/
    auth/
      config.js         # infers 'dev' vs 'entra' from env
      AuthProvider.jsx  # one auth interface over MSAL or the dev shim
      devAuth.js        # DEV ONLY: mints unsigned tokens for personas
    api/
      client.js         # fetch wrapper; ApiError exposes isForbidden
      SessionProvider.jsx
    components/
      AppShell.jsx      # role-aware sidebar
      RequireUtility.jsx# client gate + deliberate 403 override
      Common.jsx
    pages/              # Login, Dashboard
    utilities/
      registry.js       # catalog id -> component + route
      Utility{One..Five}.jsx
docs/ENTRA_SETUP.md
```

---

## Adding a utility

Authorization is catalog-driven, so wiring cannot be silently forgotten — the
API refuses to start if a router and catalog entry disagree.

1. **`api/src/config/catalog.js`** — add an entry. `requiredRoles: []` makes it
   open; `['Utility6.Access']` makes it restricted.
2. **`api/src/utilities/utilitySix.js`** — export an Express router. It does not
   need its own role check; `mountUtilities()` applies the guard.
3. **`api/src/utilities/index.js`** — register it in `IMPLEMENTATIONS`.
4. **`web/src/utilities/UtilitySix.jsx`** — build the UI.
5. **`web/src/utilities/registry.js`** — map the id to the component.
6. For a restricted utility, create the matching app role in Entra (and add the
   value to `ALL_KNOWN_ROLES` so it appears in the dev persona builder).

Required roles are intentionally **not** duplicated in the frontend. The server
is the only place that decides.

---

## Security notes

- `AUTH_MODE=dev` trusts unsigned tokens. The API **refuses to boot** with
  `AUTH_MODE=dev` and `NODE_ENV=production`.
- Tokens cache in `sessionStorage`, not `localStorage`, so they do not outlive
  the browser session.
- `heldRoles` is echoed on 403 responses to make experimenting easier. It is
  suppressed when `NODE_ENV=production`; drop it entirely if you consider it
  informational.
- Role changes in Entra do not take effect until a new token is issued — roles
  are baked in at sign-in. Sign out and back in.
- Sample data in Utilities Four and Five is hardcoded. Real implementations need
  their own authorization checks on the underlying *data*, since a role grants
  access to the utility, not automatically to every record it can reach.

---

## Verified behavior

The access matrix below was confirmed end to end through the Vite dev proxy,
comparing what `/api/me` advertises against live endpoint calls:

| Persona | U1 | U2 | U3 | U4 | U5 |
| --- | --- | --- | --- | --- | --- |
| Dana (no roles) | 200 | 200 | 403 | 403 | 403 |
| Raj (`Utility3.Access`) | 200 | 200 | 200 | 403 | 403 |
| Fay (`Utility4/5.Access`) | 200 | 200 | 403 | 200 | 200 |
| Ada (all) | 200 | 200 | 200 | 200 | 200 |

Unauthenticated and malformed-token requests both return 401.
