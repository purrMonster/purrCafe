# Runbook

## 2026-10-14 — Released v1.1.0

- He created tag `v1.1.0` on `a540211` and the GitHub release by hand; this session isn't allowed to push tags or create releases.
- The image workflow on the tag succeeded. GHCR now has `1.1.0`, `1.1`, `latest`, `edge` and `sha-*`; the package is public.
- Pulled `:1.1.0` anonymously and ran it read-only. It came up healthy, with labels `version=1.1.0` and `revision=a540211`.

**Where we stopped / next step:** percolator is still on the pre-cleanup deployment. Migrate it per the release notes (copy `services.json` aside before pulling, add the new `.env` settings, `CAFE_IMAGE=ghcr.io/purrmonster/purrcafe:1.1.0`, `docker compose pull && up -d`, `verify.py`). Not yet verified: a live deployment of 1.1.0 with real integrations.

## 2026-10-14 — Release 1.1.0 prepared (branch `release/v1.1.0`)

- Bumped `package.json` and `package-lock.json` to 1.1.0. Added `CHANGELOG.md`; its 1.1.0 section is the release notes.
- PR #3 is merged: README screenshot fixed, badges added. The GHCR package is public; `:edge` and `:sha-4ed5bea` are published.

**Where we stopped / next step:** merge this PR, then tag `v1.1.0` on the merge commit (only on his go-ahead). That publishes `:1.1.0`, `:1.1` and `:latest`. Create the GitHub release from the CHANGELOG section, then migrate percolator.

## 2026-10-14 — CI and image publishing (branch `ci/image-and-tests`)

- Added `.github/workflows/ci.yml`. It runs on PRs and main: server tests, helper tests, `npm audit` (high and above), then an image build with the tests run inside it.
- Added `.github/workflows/image.yml`, which publishes `ghcr.io/purrmonster/purrcafe` for amd64.
  - A push to main publishes `:edge` and `:sha-<short>`.
  - A `vX.Y.Z` tag publishes `:X.Y.Z`, `:X.Y` and `:latest`, after checking that the tag matches `package.json`.
  - Release images are kept separate from edge builds.
- All actions are pinned to commit SHAs. actionlint is clean.
- Image size: kept as-is on purpose (option A). About 589 MB on disk and about 110 MB to pull. Most of it is the Node base image plus Actual's dependencies. A distroless base would save 100–150 MB but drops the shell; not worth it.
- `CAFE_IMAGE` selects the release to pull; leaving it unset still builds locally.

**Where we stopped / next step:** merge the PR and confirm the first `:edge` push and the package's visibility. Then the release: bump `package.json` to 1.1.0, tag `v1.1.0`, and write release notes that include the migration steps.

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
