# Changelog

## 1.1.0 — 2026-10-14

First published release image: `ghcr.io/purrmonster/purrcafe:1.1.0` (linux/amd64).

### Changed
- Every deployment-specific value now comes from `.env` or untracked JSON. Nothing is hardcoded in code:
  - `PUBLIC_HOSTNAME`: a single setting for the Traefik router and the origin check.
  - `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_PROVIDER_NAME`: any IMAP server. Mail is hidden until set.
  - `FLEET_NODES`: which Gatus endpoints to show. Empty shows all of them.
  - `TIMEZONE` and `LOCALE`: defaults are now `UTC` and `en`. `BUDGET_CURRENCY` is required once Actual is configured.
  - `PROXY_NETWORK`, `TRAEFIK_ENTRYPOINT`, `TRAEFIK_AUTH_MIDDLEWARE`: Compose wiring, defaulting to the previous values.
  - `CAFE_IMAGE`: which published image to run.
- `config/services.json` and `config/home.json` are no longer tracked; only `*.example.json` are. Missing files mean "nothing configured".
- The deployment helpers share one module and no longer name containers, compose files, server paths or backends.
- New layout: mockups in `previews/`, docs in `docs/`, shared CSS in `app/styles.css`.

### Fixed
- handlebars 4.7.9 → 4.7.10 (critical advisories, via `@actual-app/core`).
- Static files resolve from the app root rather than the working directory.
- The healthcheck follows `PORT`.
- `configure-home.py` no longer appends to `.git/info/exclude` on every run.

### Added
- CI on every PR: server and helper tests, `npm audit`, and the tests run inside a fresh image build.
- Image publishing: `:edge` from main, and `:X.Y.Z` / `:X.Y` / `:latest` from release tags only.

### Upgrading from 1.0.0
Follow [docs/DEPLOYMENT.md → Migrating from the pre-cleanup layout](docs/DEPLOYMENT.md#migrating-from-the-pre-cleanup-layout). In short:
1. Copy `config/services.json` aside **before** `git pull`, then put it back afterwards. Rename `config/home.local.json` to `config/home.json`.
2. In `.env`, add `PUBLIC_HOSTNAME`, `CAFE_IMAGE=ghcr.io/purrmonster/purrcafe:1.1.0`, `TIMEZONE`, `LOCALE`, `BUDGET_CURRENCY`, `MAIL_IMAP_HOST` and `FLEET_NODES` to keep your current behaviour.
3. Delete `compose.cafe.local.yaml`, then run `docker compose pull && docker compose up -d` and `python3 deployment/verify.py`.

The Compose project, the data volume and the encryption key are unchanged, so saved mailboxes and the budget cache carry over.

## 1.0.0 — 2026-10-02
Initial private deployment.
