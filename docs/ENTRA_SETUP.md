# Entra ID setup

This walks through configuring Microsoft Entra ID so the sample runs against a
real tenant instead of the dev shim.

You need **two app registrations**: one for the API (which *exposes* a scope and
*defines* the app roles) and one for the SPA (which *requests* that scope). You
can technically do it with one, but splitting them is the correct model and makes
the audience validation meaningful.

Requires the **Application Administrator** or **Cloud Application
Administrator** role, plus **Groups Administrator** if assigning roles to groups.

---

## 1. Register the API

**Entra admin center → App registrations → New registration**

| Field | Value |
| --- | --- |
| Name | `Utility Hub API` |
| Supported account types | Accounts in this organizational directory only |
| Redirect URI | *leave blank* — an API has no redirect |

Record the **Application (client) ID** and **Directory (tenant) ID** from the
Overview page.

### 1a. Expose the delegated scope

**Expose an API → Add a scope**

When prompted for the Application ID URI, accept the default
`api://<api-client-id>`.

| Field | Value |
| --- | --- |
| Scope name | `access_as_user` |
| Who can consent | Admins and users |
| Admin consent display name | Access Utility Hub as the signed-in user |
| Admin consent description | Allows the app to call the Utility Hub API as the signed-in user. |
| State | Enabled |

The full scope URI is now `api://<api-client-id>/access_as_user`. The API
verifies this value lands in the token's `scp` claim
(`api/src/middleware/auth.js`).

### 1b. Define the app roles

**App roles → Create app role.** Create three, all with **Allowed member types:
Users/Groups**.

| Display name | Value | Description |
| --- | --- | --- |
| Utility Three Access | `Utility3.Access` | Can use Utility Three (reconciliation). |
| Utility Four Access | `Utility4.Access` | Can use Utility Four (financial export). |
| Utility Five Access | `Utility5.Access` | Can use Utility Five (directory audit). |

> The **Value** column must match `requiredRoles` in
> `api/src/config/catalog.js` exactly. It is case-sensitive. A typo here
> produces a silent permanent 403, which is tedious to debug — Utility Five's
> "orphaned roles" finding exists partly to catch this.

Note that `Utility One` and `Utility Two` intentionally have **no role**. They
are gated only by successful authentication (`requiredRoles: []`).

---

## 2. Register the SPA

**App registrations → New registration**

| Field | Value |
| --- | --- |
| Name | `Utility Hub Web` |
| Supported account types | Accounts in this organizational directory only |
| Redirect URI platform | **Single-page application (SPA)** |
| Redirect URI | `http://localhost:5173` |

Selecting the **SPA** platform is important: it enables the authorization code
flow with PKCE and refuses implicit-flow tokens. If you pick "Web" here, MSAL
will fail with a CORS error on the token endpoint.

Record this registration's **Application (client) ID** — it is different from
the API's.

Add your production origin as an extra redirect URI when you deploy. Do **not**
tick the "Access tokens"/"ID tokens" implicit-grant checkboxes; PKCE does not
need them.

### 2a. Grant the SPA permission to call the API

**API permissions → Add a permission → My APIs → `Utility Hub API` → Delegated
permissions → `access_as_user` → Add permissions**

Then click **Grant admin consent for \<tenant\>** to avoid a per-user consent
prompt.

---

## 3. Assign roles to users and groups

Role assignment happens on the **Enterprise application** that backs the API
registration, not on the registration itself.

**Enterprise applications → `Utility Hub API` → Users and groups → Add
user/group**

Pick a user or a security group, then choose the role to assign.

### Prefer assigning roles to groups

Assigning to groups rather than individuals is the model worth adopting:

- Access is managed by group membership, which usually already maps to how your
  org is structured.
- The token looks **identical** either way — Entra resolves group-assigned roles
  into the same flat `roles` claim. The API never sees group IDs and needs no
  Graph call to resolve them.
- It sidesteps the `groups`-claim overage problem entirely. If you instead put
  raw group IDs in the token, a user in many groups triggers an overage claim
  (`_claim_names`/`_claim_sources`) and you are forced into a Graph lookup on
  every request.

Assigning roles to groups requires an Entra ID P1 or P2 licence. Without one,
assign roles to users directly — everything else works the same.

A suggested group layout matching the sample data in Utility Five:

| Group | Role |
| --- | --- |
| `SG-UtilityHub-Reconcilers` | `Utility3.Access` |
| `SG-UtilityHub-Finance` | `Utility4.Access`, `Utility5.Access` |
| `SG-UtilityHub-Admins` | `Utility3.Access`, `Utility4.Access`, `Utility5.Access` |

Assign the same group to multiple roles by repeating the Add user/group step —
a group can hold more than one role.

---

## 4. Configure the application

**`api/.env`** (copy from `api/.env.example`):

```ini
AUTH_MODE=entra
PORT=4000
CORS_ORIGIN=http://localhost:5173
ENTRA_TENANT_ID=<directory-tenant-id>
ENTRA_API_CLIENT_ID=<API-app-client-id>
ENTRA_REQUIRED_SCOPE=access_as_user
```

**`web/.env.local`** (copy from `web/.env.example`):

```ini
VITE_API_BASE_URL=
VITE_ENTRA_CLIENT_ID=<SPA-app-client-id>
VITE_ENTRA_TENANT_ID=<directory-tenant-id>
VITE_ENTRA_API_SCOPE=api://<API-app-client-id>/access_as_user
```

Two things to get right:

- `VITE_ENTRA_CLIENT_ID` is the **SPA's** client ID; `ENTRA_API_CLIENT_ID` is
  the **API's**. Swapping them is the single most common mistake and produces an
  audience-validation 401.
- `VITE_ENTRA_API_SCOPE` must be the full URI including `api://`, not just the
  scope name.

The web app switches from dev mode to Entra mode automatically once all three
`VITE_ENTRA_*` values are present — there is no separate flag to set. Restart
the Vite dev server after editing `.env.local`; Vite only reads env files at
startup.

---

## 5. Verify

1. Restart both servers. The API should log `AUTH_MODE = entra` with no dev-mode
   warning.
2. Load the SPA. You should be redirected to a real Microsoft sign-in page.
3. After signing in, the dashboard shows your roles. Users with no assigned
   roles see only Utility One and Two.
4. Open a restricted utility you lack, click **"Call the API anyway"**, and
   confirm a real 403 from the server.

To inspect the token, paste it into [jwt.ms](https://jwt.ms). Check that:

- `aud` equals your **API's** client ID (not the SPA's)
- `scp` contains `access_as_user`
- `roles` contains the values you expect
- `iss` is `https://login.microsoftonline.com/<tenant-id>/v2.0`

---

## Troubleshooting

**401, detail "unexpected 'aud' claim value"**
The token's audience is not the API. Usually `VITE_ENTRA_API_SCOPE` is wrong, or
it is requesting a Graph scope. The scope must be your `api://.../access_as_user`
URI.

**401, detail mentioning signature or key**
Check `ENTRA_TENANT_ID`. The API fetches signing keys from that tenant's JWKS
endpoint, so a wrong tenant means no matching key.

**403 with an empty `heldRoles`**
Authentication worked but the token carries no `roles` claim. Either no role is
assigned, or — most often — the user signed in *before* the assignment was made.

**Roles changed but the app disagrees**
Roles are embedded in the token at issuance; they do not refresh live. Sign out
and in to mint a new token. Note that `sessionStorage` caching means closing the
tab also clears it.

**`AADSTS50011` redirect URI mismatch**
The browser's origin is not in the SPA registration's redirect URI list. It must
match exactly, including scheme and port, with no trailing slash.

**CORS error on the token endpoint**
The SPA registration is on the "Web" platform instead of "Single-page
application". Remove the URI and re-add it under the SPA platform.

**`AADSTS65001` consent required**
Grant admin consent on the SPA's API permissions, or let the user consent
interactively.
