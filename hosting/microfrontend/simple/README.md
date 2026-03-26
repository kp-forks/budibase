# Budibase App Microfrontend Host (Simple)

Use this example when you do not need an OIDC token bridge/BFF.

## What this example does

- Mounts Budibase as a non-iframe microfrontend.
- Keeps app routes (`/app/*`, `/app-chat/*`) owned by the host shell.
- Checks Budibase session with `GET /api/global/self`.
- Redirects to Budibase login (`/builder/auth/login`) if session is missing.

## Run

1. Ensure Budibase is available locally at `http://localhost:10000`.
2. In this folder run:

`yarn install`

`yarn dev`

3. Open:

`http://localhost:5173`

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
- `/builder/*`
- `/_bb/*` (published-page lookup used to resolve app ID)

## Related example

For silent platform-initiated login using an OIDC bridge, use:

`/Users/adribb/code/budibase/hosting/microfrontend/oidc`
