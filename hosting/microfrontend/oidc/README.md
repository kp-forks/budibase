# Budibase App Microfrontend Host (OIDC Bridge)

## What this example does

- Mounts Budibase as a non-iframe microfrontend.
- Keeps app routes (`/app/*`, `/app-chat/*`) owned by the host shell.
- Uses a backend token bridge (BFF) for OIDC login via `openid-client`.
- Does not force login by default.
- Exposes a shell `Login` action that triggers OIDC authentication and Budibase session bridging.

## Run

1. Ensure Budibase is available locally at `http://localhost:10000`.
2. In this folder run:

`yarn install`

`cp .env.oidc.example .env`

Set `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` in `.env`.
For bridge mode, `BUDIBASE_TENANT_ID` defaults to `default`.
`BUDIBASE_OIDC_CONFIG_ID` is optional and auto-resolved from
`/api/global/configs/public/oidc?tenantId=<tenantId>` when omitted.

Advanced overrides (optional, only if needed):

- `OIDC_SCOPES` (default: `openid profile email`)
- `OIDC_REDIRECT_URI` (default: `http://localhost:5174/auth/callback`)
- `BUDIBASE_TENANT_ID` (default: `default`)
- `BUDIBASE_OIDC_CONFIG_ID` (default: auto-resolved)
- `BFF_SESSION_TTL_MS` (default: `28800000`)
- `HOST_PORT` (default: `5173`)
- `BFF_PORT` (default: `5174`)
- `HOST_ORIGIN` (default: `http://localhost:5173`)
- `BUDIBASE_ORIGIN` (default: `http://localhost:10000`)
- `BFF_PUBLIC_ORIGIN` (default: `http://localhost:5174`)

`yarn dev:all`

3. Open:

`http://localhost:5174`

## Configure app target

Set `window.__BUDIBASE_APP_URL__` in `index.html`.

Default:

`window.__BUDIBASE_APP_URL__ = "${window.location.origin}/app/microfrontend"`

Requirements:

- absolute URL
- same origin as host shell
- path starts with `/app/` or `/app-chat/`

## Dev proxy

Vite proxies Budibase services from the same origin:

- `/api/*`
- `/socket/*`
- `/worker/*`
- `/_bb/*` (published-page lookup used to resolve app ID)

## Important note

App ID resolution parses `window["##BUDIBASE_APP_ID##"]` from the published app HTML. If that marker changes upstream, update `resolveAppIdFromPublishedPage`.

For OIDC bridge mode, Budibase `platformUrl` must point to the shell/BFF public URL (for local example: `http://localhost:5174`). Otherwise Budibase will generate OIDC callback URLs with `:10000` and redirect away from the shell.

## OIDC token bridge flow

1. Host checks `GET /auth/session` on the BFF.
2. If not logged in, shell still loads and user can click `Login`.
3. `Login` calls `/auth/login?returnTo=<current-host-url>&bridgeBudibase=1`.
4. BFF performs OIDC authorization code flow and stores a local session cookie.
5. BFF starts Budibase OIDC pre-auth flow.
6. After Budibase OIDC returns to `/`, BFF redirects to original `returnTo`.
7. Host mounts Budibase app with bridged session.
8. `Logout` calls BFF `/auth/logout`, which signs out from Budibase and then performs OIDC RP-initiated logout before returning to the host route.

### Production checklist

- User opens host route and gets redirected through IdP only when BFF session is missing.
- User is never redirected to `/builder/auth/login` in this flow.
- Direct deep link works: `/app/<slug>#/employees` (or another internal app route).
- After login redirect, user returns to the same deep link.
- Refresh on deep link still works.
- No iframe is used.
- BFF preserves reverse proxy behavior and forwarded headers to Budibase.
- BFF OIDC integration uses a maintained OIDC client library (not manual token handling).

### Troubleshooting

- If users loop on login, verify OIDC issuer/client settings in `.env`.
- If bridge fails, verify `BUDIBASE_TENANT_ID` and the Budibase OIDC config UUID.
- If deep links return to the wrong location, verify `returnTo` and confirm the host route includes the expected hash/path.
- If session is not detected after login, inspect cookies and same-site/secure behavior in your production domain setup.

## Production notes

- The demo BFF keeps sessions in memory; replace this with Redis or another shared store for production.
- Run the BFF behind HTTPS so secure cookies and IdP redirect URIs are valid in production.

## Related example

For the simplest host pattern without a token bridge/BFF, use:

`/Users/adribb/code/budibase/hosting/microfrontend/simple`
