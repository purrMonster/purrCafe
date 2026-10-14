# Standalone deployment

Runs the published image `ghcr.io/purrmonster/purrcafe` without cloning the repo or building anything.

## Prerequisites
- Docker with Compose v2.
- Traefik attached to an external Docker network (default `proxy`), with TLS for your hostname.
- A forward-auth middleware (default `authelia@file`) that **replaces** `Remote-User`, `Remote-Groups` and `Remote-Name`. The app refuses every request that doesn't come through it.
- An SSO access rule for the hostname, allowing the groups in `AUTH_*_GROUP`.

## Install
```sh
# on the server, in an empty directory such as ~/apps/purrcafe
cp .env.example .env && chmod 600 .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # or: openssl rand -hex 32
#   -> paste into APP_ENCRYPTION_KEY, then set PUBLIC_HOSTNAME and AUTH_TRUSTED_PROXY_CIDRS
cp config/services.example.json config/services.json   # edit to your services
cp config/home.example.json config/home.json           # optional; replace every example ID, or delete it
docker compose config --quiet                          # catches missing settings
docker compose pull && docker compose up -d
docker compose ps                                      # wait for "healthy"
```

Check it: `https://<PUBLIC_HOSTNAME>/` should send you to SSO, and after signing in you should see setup states for anything not configured yet. Integration settings are documented in [docs/CONFIGURATION.md](../docs/CONFIGURATION.md).

## Update / roll back
Change `CAFE_IMAGE` in `.env` to the new (or previous) version, then `docker compose pull && docker compose up -d`.

## Back up
Back up the `dashboard-data` volume, `.env` (it holds the encryption key) and `config/`, all together. Never run `docker compose down -v` unless you mean to delete saved mailboxes.

The Python helpers in `deployment/` expect a full repo checkout. With this folder alone, use `docker compose` directly.
