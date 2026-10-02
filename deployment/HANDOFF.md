# Deployment handoff — October 2, 2026

Café was deployed on percolator using code pulled from GitHub. Only Café was recreated; the existing Homepage and other fleet services were preserved.

The startup crash was caused by an empty encryption key. The first-run helper confirmed zero saved account files, generated a key on the node, and retained a private environment backup. Proxy trust was also empty; it was set to the immediate Traefik container's address on the proxy network, with a /32 mask. Example hostname settings were replaced using the domain already configured privately on percolator. Secret values and the real domain remain outside Git.

Verified on the node:

- Startup configuration valid.
- Container healthy, restart count zero.
- Internal `/healthz`: HTTP 200.
- Internal `/api/session` without identity: HTTP 401.
- HTTPS `/` and `/api/session` without sign-in: HTTP 401; TLS verification enabled.
- Git checkout clean and synced with GitHub after fixes.

Fix commits: `6a3ffc9` (key diagnostics/repair), `b0a0b0f` (proxy discovery), `3337203` (HTTP checks), `244afb4` (private fleet hostname discovery). The follow-up verification change waits for container health before checking HTTP.

Next: sign in through the browser, connect real integrations as described in DEPLOYMENT.md, and confirm readings against their source applications. Authenticated browser behavior, provider credentials, and a dedicated wall account have not been verified by these unauthenticated checks.

Rollback: stop only Café with the same Compose project/files. Preserve its volume and the encryption key together; do not use `down -v`. Private `.env.backup-*` files were retained on percolator and are ignored by Git.
