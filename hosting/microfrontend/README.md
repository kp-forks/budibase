# Budibase App Microfrontend Host

## Run

1. Ensure Budibase is available locally at `http://localhost:10000`.
2. In this folder run:

`npm install`

`npm run dev`

3. Open:

`http://localhost:5173`

The host mounts Budibase without iframes using `mountBudibaseApp(...)`.

## Configure app target

Set the published Budibase app URL in `index.html`:

`window.__BUDIBASE_APP_URL__ = "http://localhost:5173/app/my-workspace"`

Use a published route (`/app/*` or `/app-chat/*`).
The value must be an absolute URL.

## Dev proxy

Vite proxies Budibase services from the same origin:

- `/api/*`
- `/socket/*`
- `/worker/*`
- `/builder/*`
- `/_bb/*` (published-page proxy used to resolve app ID)

App routes (`/app/*`, `/app-chat/*`) remain owned by the host shell.

## Production notes

- Preserve forwarded headers and `Referer` when proxying to Budibase.
- Example nginx config: `hosting/microfrontend/nginx.root.conf`
