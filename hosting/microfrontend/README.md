# Budibase Microfrontend Examples

Two reference integrations are provided:

- `oidc/`: host + OIDC token bridge (BFF) for platform-initiated login flows.
- `simple/`: host-only integration without a token bridge.

Use:

- `/Users/adribb/code/budibase/hosting/microfrontend/oidc` when you need a backend-mediated OIDC bridge.
- `/Users/adribb/code/budibase/hosting/microfrontend/simple` when Budibase login/session handling is enough on its own.

Both examples resolve app metadata through Budibase endpoint:

- `GET /api/microfrontend/bootstrap?appPath=/app/<workspace-url>`

This bootstrap endpoint is available only for Enterprise licenses.
