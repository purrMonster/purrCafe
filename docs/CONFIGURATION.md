# Configuring integrations

Run commands on the server from the checkout. Secrets stay in the untracked `.env`; the helpers back it up privately before every change and never print secret values. Each integration is optional: an unconfigured one shows "Setup needed" instead of invented data.

Check progress at any time:

```sh
python3 deployment/verify.py
python3 deployment/integration-status.py   # configured flags and statuses only, no data
```

## Actual Budget

Settings: `ACTUAL_SERVER_URL`, `ACTUAL_SYNC_ID`, `ACTUAL_SESSION_TOKEN` *or* `ACTUAL_PASSWORD`, optional `ACTUAL_ENCRYPTION_PASSWORD`, and `BUDGET_CURRENCY` (required once Actual is set).

1. Use a backend URL the container can reach directly, e.g. Actual's service name on a shared Docker network. A public URL behind interactive SSO will fail with `network-failure`.
2. In Actual: Settings → Show advanced settings → **Sync ID**.
3. With OpenID sign-in, use a session token. In the browser's developer tools (Network tab), copy the `X-ACTUAL-TOKEN` header value from a `/sync/` request. Treat it as a password.
4. Run the guided setup (it asks for the backend URL only if it isn't set yet):

   ```sh
   python3 deployment/configure-actual.py
   ```

   To change only the backend later: `python3 deployment/prepare.py --actual-backend-url http://<actual-backend>:5006`.

The dashboard only calls `init`, `downloadBudget`, `sync` and `getBudgetMonth`; it cannot edit the budget. Amounts are integer minor units; available balances include carryover and refunds.

If the budget stays unavailable, `python3 deployment/diagnose-actual.py` runs each stage in a disposable cache and prints only the failing stage and an allowlisted error code: `network-failure` means the server isn't reachable, `token-expired` means the token needs refreshing, and `budget-not-found` means the Sync ID is wrong.

## Personal mail (IMAP)

Set `MAIL_IMAP_HOST` (TLS on `MAIL_IMAP_PORT`, default 993) and optionally `MAIL_PROVIDER_NAME` for the UI label. Each household member then signs in, opens **Settings** and connects their own mailbox.

- Credentials are verified, then encrypted with AES-256-GCM under `APP_ENCRYPTION_KEY`, in one file per user (keyed by a hash of the SSO username). Disconnecting deletes the file.
- The INBOX is opened read-only; previews are plain text, with no attachments or remote images.
- Wall-only accounts cannot connect or read mail.

## Home Assistant

Set `HA_URL` (reachable from the container) and `HA_TOKEN` (a long-lived token for a dedicated, least-privileged user).

Select entities without committing them:

```sh
python3 deployment/configure-home.py --url http://<home-assistant>:8123 --entities sensor.example_temperature,weather.home
```

The helper checks the token and that each entity exists, rejects location entities (`zone.`, `person.`, `device_tracker.`), writes `config/home.json` read-only (no actions) and recreates the container. To allow controls, edit `config/home.json`:

- `actions`: `turn_on` / `turn_off` for `light`, `switch`, `fan`, `media_player`; `activate` for `scene`. Locks, alarms, covers and arbitrary services are always rejected.
- `wall: true` shows the entity on the wall; `wallControl: true` also lets the wall run its actions.

Weather entities show temperature, unit and humidity only.

## Gatus fleet status

Set `GATUS_URL` to a backend route the container can reach (plus `GATUS_AUTHORIZATION` if it needs one). Don't point it at an SSO-protected UI or publish Gatus's port to get around that; add a proper backend route in your infrastructure instead.

- `FLEET_NODES=node-a,node-b` fixes which names are shown and in what order. Leave it empty to show every endpoint Gatus reports (up to 24).
- `GATUS_FLEET_KEYS={"node-a":"group_node-a"}` maps a node to an exact Gatus key when names differ.
- Results older than five minutes, missing or dated in the future show as Unknown. Reachability is not proof that a node is healthy.

## Service shortcuts

Edit `config/services.json` (start from `config/services.example.json`). Each entry has `name`, `group`, and either `host` (combined with `DOMAIN`) or a full `url`. `admin: true` hides it from household accounts; `note` explains an entry without a web interface. Shortcuts rely on each destination's own authentication.

## Wall display

`/wall` is the presentation view. For a shared kiosk, create an account that belongs only to the wall group and add it to the hostname's access rule. Confirm that `/api/mail` returns 403 for it before mounting the screen. A household member opening `/wall` is only a layout choice; the wall-only account is the privacy boundary.

## Display settings

`TIMEZONE` (IANA name, default `UTC`) and `LOCALE` (BCP 47, default `en`) control dates and number formatting, e.g. `LOCALE=en-IN` for lakh/crore grouping.
