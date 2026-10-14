# Runbook

## 2026-10-14 — Verification and cleanup (branch `cleanup/config-and-hygiene`)

- Verified: 21 server + 6 helper tests passed on `main`. `npm audit` flagged critical handlebars 4.7.9 (via `@actual-app/core`); bumped to 4.7.10.
- Stopped tracking `SKILLS/` (76 MB of vendored third-party repos the app never loads).
- Removed hardcoded values from code. All of these are now settings:
  - IMAP host: `MAIL_IMAP_HOST`, `MAIL_IMAP_PORT`, `MAIL_PROVIDER_NAME`.
  - Fleet node list: `FLEET_NODES`; empty shows every Gatus endpoint.
  - Locale, time zone and currency: `LOCALE`, `TIMEZONE`, `BUDGET_CURRENCY`. Defaults are neutral and currency is now required with Actual.
  - Dashboard hostname: `PUBLIC_HOSTNAME`, shared by Traefik and the origin check.
  - Traefik wiring: `PROXY_NETWORK`, `TRAEFIK_ENTRYPOINT`, `TRAEFIK_AUTH_MIDDLEWARE`.
  - Deployment helpers no longer name the container, compose files, fleet paths, the proxy container or the Actual backend.
- Household config (`config/services.json`, `config/home.json`) is no longer tracked; only `*.example.json` are. The image ships no household config.
- Moved previews to `previews/`, docs and images to `docs/`, shared CSS to `app/styles.css`. Static files now resolve from the app root, not the working directory. The healthcheck follows `PORT`.
- Evidence: 26 server tests and 7 helper tests pass; all 26 also pass inside the built image with no network and a read-only filesystem. Smoke container: healthy, `/healthz` 200, `/api/session` 401. Fixture UI checked at desktop and phone widths with no console errors.
- Not verified: a live deployment with the new settings. That needs the migration steps in DEPLOYMENT.md on the server.

**Where we stopped / next step:** PR open for review. After merge: migrate `.env` on the server (DEPLOYMENT.md → "Migrating"), then start the Docker image stage (image size, multi-arch, registry, tags), then the release.
