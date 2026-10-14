# Deploying purrCafe

The live app serves `/`, `/inbox`, `/settings` and `/wall`; sample mockups stay under `/previews/index.html`. Live pages never fall back to sample values.

## Requirements

- Docker with Compose v2, on a host that already runs Traefik.
- An external Docker network shared with Traefik (default name `proxy`, set `PROXY_NETWORK` otherwise).
- A forward-auth middleware (default `authelia@file`, set `TRAEFIK_AUTH_MIDDLEWARE`) that **replaces** incoming `Remote-User`, `Remote-Groups` and `Remote-Name` headers.
- DNS and TLS for the dashboard hostname through your existing Traefik setup. Compose publishes no host port.

## First deployment

1. Clone the repository on the server and copy the templates:

   ```sh
   cp .env.example .env && chmod 600 .env
   cp config/services.example.json config/services.json
   cp config/home.example.json config/home.json   # optional; replace every example ID
   ```

2. In `.env`, set at least `PUBLIC_HOSTNAME`, `APP_ENCRYPTION_KEY` and `AUTH_TRUSTED_PROXY_CIDRS`. The helpers below can fill some of these without printing secrets:

   ```sh
   python3 deployment/prepare.py --hostname dashboard.<your-domain> --domain <your-domain>
   python3 deployment/prepare.py --repair-unused-key        # only before any mailbox is saved
   python3 deployment/prepare.py --configure-proxy traefik  # trusts that container's IP on PROXY_NETWORK, /32
   ```

   Trust only the immediate proxy. A whole shared subnet lets any container on it forge identity headers. If the proxy container is recreated with a new address, update this setting before restarting.

3. Add an access rule for the hostname in your SSO that permits `purrbrews_household` and `purrbrews_admins` (rename with `AUTH_*_GROUP`). For a wall kiosk, also permit `purrbrews_wall_display`. The wall account must belong **only** to that group; any household or admin membership grants personal access.

4. Configure integrations (see [CONFIGURATION.md](CONFIGURATION.md)), then start and check:

   ```sh
   docker compose up -d --build
   python3 deployment/verify.py
   python3 deployment/integration-status.py
   ```

`/healthz` reports app availability only, not upstream health.

## Configuration files

| File | Purpose | Tracked |
| --- | --- | --- |
| `.env` | Hostname, secrets, integration endpoints, display settings | No |
| `config/services.json` | Service shortcuts. `host` + `DOMAIN` → `https://host.DOMAIN`; or a full `url`; `admin: true` hides it from household accounts | No |
| `config/home.json` | Home Assistant entities and allowed actions | No |
| `compose.override.yaml` | Optional host-only Compose tweaks, auto-loaded | No |

`config/` is mounted read-only into the container. Missing JSON files mean "nothing configured", not an error.

## Operations

- **Back up together:** the `dashboard-data` volume, `.env` (it holds the encryption key) and `config/`. Saved mailboxes cannot be read without the original key. Verify a restore before relying on it.
- **Stop:** `docker compose down`. Never `down -v` unless you mean to delete saved mailboxes and the budget cache.
- **Update:** `git pull --ff-only`, run `npm test` if you changed code, `docker compose up -d --build`, then `python3 deployment/verify.py`.
- **Roll back:** check out the previous tag or commit and rebuild. The data volume format has not changed between versions.

## Migrating from the pre-cleanup layout

Older deployments used `PUBLIC_ORIGIN`, a tracked `config/services.json`, `config/home.local.json` and a `compose.cafe.local.yaml` override run with `-p purrbrews-cafe`. Before pulling this version:

```sh
cp config/services.json /tmp/services.json            # git pull removes the tracked copy
git pull --ff-only
cp /tmp/services.json config/services.json
[ -f config/home.local.json ] && mv config/home.local.json config/home.json
```

Then in `.env`:

- Add `PUBLIC_HOSTNAME=<the host from PUBLIC_ORIGIN>`. Remove `PUBLIC_ORIGIN`, or keep it identical (they must agree).
- Add `TIMEZONE`, `LOCALE` (e.g. `en-IN` for lakh grouping) and `BUDGET_CURRENCY` explicitly. The defaults are now `UTC`, `en` and no currency.
- Add `MAIL_IMAP_HOST` (and `MAIL_PROVIDER_NAME` if you want it shown). Mail is hidden until it is set.
- Add `FLEET_NODES=<comma-separated Gatus names>` to keep a fixed list; empty shows every endpoint.

Finally remove `compose.cafe.local.yaml`: its router label and entity-file path are now covered by `PUBLIC_HOSTNAME` and `config/home.json`. The Compose project name is still `purrbrews-cafe`, so the existing data volume is reused.
