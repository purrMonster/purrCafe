# purrCafe

A small, private household dashboard: home sensors and switches (Home Assistant), the month's budget (Actual Budget), each person's own inbox (any IMAP server), fleet reachability (Gatus) and a directory of your self-hosted services. It runs behind a reverse proxy with forward-auth SSO (built and tested with Traefik + Authelia) and has a separate wall-display view that never sees personal data.

![Live dashboard](docs/images/live-dashboard.jpg)

- **No framework, four runtime dependencies.** Plain Node 22 server, plain JS front end.
- **Nothing environment-specific in code.** Hostnames, endpoints, nodes, locale and currency come from `.env` and two JSON files in `config/`.
- **Read-only by default.** Home Assistant actions must be listed per entity; mail is opened read-only; the budget is never edited.

## Quick start (local, no auth)

```sh
npm ci
APP_ENCRYPTION_KEY=$(node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))") \
NODE_ENV=development node server/index.mjs --local
```

Open http://127.0.0.1:4174. `--local` disables authentication and listens on loopback only; never use it on a server. Every integration shows a setup state until configured.

## Deploy

```sh
cp .env.example .env                                   # fill in PUBLIC_HOSTNAME, key, proxy trust, integrations
cp config/services.example.json config/services.json   # your shortcuts
cp config/home.example.json config/home.json           # your Home Assistant entities (or leave out)
docker compose up -d --build
python3 deployment/verify.py
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full setup and [docs/CONFIGURATION.md](docs/CONFIGURATION.md) for each integration. All settings are listed in [.env.example](.env.example).

## Layout

| Path | What |
| --- | --- |
| `server/` | HTTP server, integrations, security checks, tests (`npm test`) |
| `app/` | Live front end |
| `config/` | `*.example.json` templates; your real `home.json` / `services.json` stay untracked |
| `deployment/` | Server-side helper scripts that never print secrets (`npm run test:deploy`) |
| `previews/` | Static design mockups with sample data (`npm run preview`, port 4173) |
| `verification/` | Fictional-data UI fixture for browser checks |
| `docs/` | Deployment, configuration, verification history, runbook |

## Tests

```sh
npm test             # server tests
npm run test:deploy  # deployment helper tests (Python 3)
```
