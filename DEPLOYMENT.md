# Live Purrbrews dashboard

The live app runs at `/`, `/inbox`, `/settings`, and `/wall`. The sample screens remain under `/previews/index.html`. Live pages never fall back to sample values.

## Local development

Requires Node.js 22.16 or newer. In PowerShell, from this project folder:

```powershell
npm ci
$env:NODE_ENV = 'development'
$env:PUBLIC_ORIGIN = 'http://127.0.0.1:4174'
$env:APP_ENCRYPTION_KEY = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
node server/index.mjs --local
```

Open http://127.0.0.1:4174. This explicitly disables authentication for a local developer identity, listens only on loopback, and displays setup states until integrations are configured. Never use `--local` on a server. Keep a stable encryption key if you connect mail locally; changing the key makes previously saved credentials unreadable. Stop with Ctrl+C. Run `npm test` for the security and data-contract checks.

## Prepare a private deployment on percolator

1. Keep the running Homepage service in place. Deploy this app at the new `dashboard.${DOMAIN}` hostname first. Use the supplied files from this workspace; no changes have been made to the fleet repository.
2. Copy `.env.example` to `.env`. Generate and save `APP_ENCRYPTION_KEY`, set `DOMAIN` and `PUBLIC_ORIGIN=https://dashboard.<your-domain>`, and configure the immediate Traefik container IP in `AUTH_TRUSTED_PROXY_CIDRS`. Prefer a stable `/32` address. Trust only that proxy; a whole shared subnet lets other containers forge identity headers. If Traefik's address changes, update this setting before restarting.
3. On Linux, restrict `.env` permissions (`chmod 600 .env`). Configure LAN DNS and TLS for the new hostname using the existing Traefik setup. This compose file publishes no host port and adds no Cloudflare tunnel route.
4. Ensure the external Docker network named `proxy` exists on percolator. The existing `authelia@file` middleware must populate `Remote-User`, `Remote-Groups`, and `Remote-Name`, replacing incoming client values. The backend rejects identity headers from untrusted socket addresses.
5. Add an Authelia access rule for `dashboard.<your-domain>` permitting `purrbrews_household` and `purrbrews_admins`. For a dedicated wall account, permit the new `purrbrews_wall_display` group on this hostname too. Follow the existing policy and MFA requirements. The wall account must belong **only** to the wall group, never the household/admin groups. The app enforces wall restrictions on its APIs, independently of the page selected.
6. Populate integration settings below. Then run `docker compose up -d --build` and inspect `docker compose ps` and `docker compose logs --tail=50`. The `/healthz` endpoint checks app availability, not upstream service health.

These instructions prepare deployment; DNS, TLS, Authelia rules, and the Docker network must already be valid before exposing the app. The image was built and smoke-checked locally. Nothing has been deployed to your fleet by this task.

## Home Assistant

Set `HA_URL` to the backend address and `HA_TOKEN` to a dedicated user's long-lived token. Use the [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/). Copy `config/home.example.json` to `config/home.json` and replace every example entity ID with a real one. Restart after changes.

Only listed entities are returned to the browser. Only explicitly allowed `turn_on`, `turn_off`, or scene `activate` actions can run. Lock, alarm, cover, and arbitrary service calls are rejected. `wall: true` allows an entity on the wall; `wallControl: true` additionally allows its configured actions. Carefully review scenes before allowing them, since a scene can affect more than its label suggests. Commands wait for the provider response; the UI then reads actual states rather than optimistically inventing a successful state. State changes are polled, not pushed.

## Actual Budget

Set `ACTUAL_SERVER_URL` to the backend address, `ACTUAL_SYNC_ID` from the budget's advanced settings, and `BUDGET_CURRENCY` to the budget currency. This is one shared household budget; each household account can see category details.

The pinned [Actual API](https://actualbudget.org/docs/api/) supports `sessionToken` authentication. For the existing OpenID setup, use a current Actual session token as `ACTUAL_SESSION_TOKEN`, obtained locally from your signed-in Actual client or by your administrator. Treat it as a credential; never paste it into chat or the frontend. Set `ACTUAL_PASSWORD` only for a server that already uses password authentication. Do not disable OpenID to make the dashboard work. Tokens may expire; replace the token and restart when sync becomes unavailable. Set `ACTUAL_ENCRYPTION_PASSWORD` if the budget uses end-to-end encryption.

The dashboard calls init, downloadBudget, sync, and getBudgetMonth only. It has no transaction or budget editing endpoint. Amounts are integer minor units from Actual; expense balances retain carryover and refunds. Budget data is cached on disk in the private data volume. Available is not assumed to equal this month's assigned minus activity. No bank-account details are exposed. The wall API removes categories entirely.

## Personal Purelymail inboxes

Each household user opens `/settings` and enters their own mailbox credentials. The backend connects only to `imap.purelymail.com:993` with TLS, per [Purelymail's technical setup](https://imap.purelymail.com/docs/setup/technical). A read-only INBOX lock prevents changing read flags. No outgoing mail, attachments, remote images, or HTML execution are supported. Message previews are plain text and capped at 1 MB source / 50,000 text characters. The latest 25 messages are listed; the unread count covers INBOX.

Credentials are verified before being encrypted with AES-256-GCM under the server encryption key. Files are keyed by the authenticated username hash. Users cannot select another user's stored mailbox. Disconnect removes the saved credentials. Protect both the data volume and encryption key; the Actual cache itself is not encrypted by the dashboard. IMAP previews are fetched on demand and are not saved by this app.

## Gatus and shortcuts

Set `GATUS_URL` to a backend-only, authenticated or network-restricted connection to sieve's Gatus. Its web UI is behind interactive Authelia, so an ordinary UI URL is not a usable server credential. Do not expose port 8080 publicly as a workaround. An infrastructure change to supply this connection must be reviewed separately. `GATUS_AUTHORIZATION` optionally supplies an Authorization header for an already configured backend route.

The [Gatus API](https://github.com/TwiN/gatus#api) is read-only. The five fleet names are matched exactly, case-insensitively, or mapped using `GATUS_FLEET_KEYS`, for example `{"percolator":"fleet_percolator"}`. Missing or older-than-five-minute results remain Unknown. Reachability does not prove application or backup health. No backup success is inferred.

Set `DOMAIN` and review `config/services.json` to confirm your real hostnames. A `url` can override a service without a `host`; `admin: true` hides a shortcut from household accounts. Services without a configured web endpoint stay disabled. Shortcut access also relies on each destination's own Authelia/app rules. Restart after registry changes.

## Operations and rollback

- Preserve `dashboard-data` and the encryption key together in restricted backups. Include `.env` and `config/` securely. Verify restores; no backup status is claimed by this application.
- `docker compose down` stops this deployment without deleting the named data volume. Do not use `down -v` unless intentionally deleting saved mailbox credentials and the budget cache.
- Keep the existing Homepage hostname until the new app has been validated. Rolling back means routing users to the existing Homepage and stopping this container.
- Updates: review dependency changes, run checks, rebuild, then restart. Do not deploy sample previews as if they were live data.
- Configure the wall kiosk URL to `https://dashboard.<your-domain>/wall` only after its dedicated wall account and session work. A household user's wall page is a presentation choice; a wall-only account is the privacy boundary.
- Live service authentication, DNS/TLS, Authelia, and the fleet deployment require validation in your environment. The Docker image has been built and checked locally.

## Validation performed

- Nineteen automated checks passed on Windows and inside the production image, including HTTP proxy trust, denied wall routes, CSRF protection, action allowlists, mailbox encryption/isolation, budget normalization, bounded IMAP reads, cache invalidation, and malformed/stale Gatus readings.
- The Docker image built locally with pinned dependencies and a pinned Node base image.
- A temporary container with no network, a read-only filesystem, dropped capabilities, and no-new-privileges successfully opened native SQLite, returned HTTP 200 from health, and returned HTTP 401 for unauthenticated API access. It was removed after the check.
- The local UI was checked at desktop and phone widths, including service search, settings, theme support, and the wall view. No browser errors were reported in that pass.
- Real Home Assistant, Actual, Purelymail and Gatus authentication, production DNS/TLS, Authelia policy, and deployment on percolator remain unverified until credentials and host configuration are supplied locally.

See [VERIFICATION.md](VERIFICATION.md) for the October 2 review, commands, fixes, UI checks, and remaining commissioning work.
