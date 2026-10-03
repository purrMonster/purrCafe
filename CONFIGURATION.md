# Configure Purrbrews Café

Run terminal commands as `barista` on percolator, from `~/apps/purrCafe`. Secrets stay in ignored `.env` and private backups. Application/infrastructure code changes are delivered through GitHub, not copied to nodes.

## 1. Confirm the deployment

```bash
cd ~/apps/purrCafe
git pull --ff-only
python3 deployment/verify.py
```

Expect healthy, zero restarts, internal health HTTP 200, unauthenticated API HTTP 401, and unauthenticated HTTPS access denial or redirect. These checks do not validate signed-in household or wall access.

## 2. Connect Actual first

1. Open your existing Actual website and sign in through OpenID.
2. Open the household budget, then Settings → Show advanced settings → Sync ID. Copy the Sync ID, not the local budget ID.
3. In browser developer tools (F12), open Network and refresh Actual. Select a request under `/sync/` that has an `X-ACTUAL-TOKEN` request header; copy that header's value. Copy only the value. Do not send it in chat or commit it.
4. On this fleet, use Actual's shared Docker-network backend, then run the interactive setup:

```bash
python3 deployment/prepare.py --actual-backend-url http://actualbudget:5006
python3 deployment/configure-actual.py
```

Enter the Sync ID, paste the token into the hidden prompt, choose the actual budget currency, and enter the budget's encryption password only if end-to-end encryption is enabled. This is the budget encryption password, not your Authelia password. The helper defaults to the existing `http://actualbudget:5006` backend if the URL is blank; preserves a custom URL; clears password authentication; preserves Café's key and unrelated settings; backs up `.env` privately; and recreates only Café.

Check the result:

```bash
python3 deployment/verify.py
python3 deployment/integration-status.py
```

Budget should report `ready`. Open Café and compare Room to breathe with expense envelope balances in Actual. Carryover and refunds are included in available balances. If unavailable, check the token, budget sharing/access, Sync ID and encryption password. A token can expire; rerun the helper with a fresh token. Keep OpenID enabled.

## 3. Connect personal Purelymail

Sign into Café using your normal household account, open Settings, and enter your own Purelymail email address and mailbox password. Click Connect mailbox. Open Your inbox and a message preview. The connection is read-only; previews do not load attachments or remote images. Each household member connects their own mailbox while signed into their own account. A wall-only account cannot connect or read mail.

## 4. Configure Home Assistant when entities are ready

The fleet's Home Assistant is on mochaPot, `192.168.0.13`. Grinder, `192.168.0.14`, is not the Home Assistant node.

```bash
nano .env
```

Set `HA_URL=http://192.168.0.13:8123`. Preserve the existing token if valid; otherwise generate a long-lived token in the intended Home Assistant user's profile and paste it into `HA_TOKEN` locally.

For entity selection, use a private configuration file so household choices are not committed:

```bash
cp config/home.json config/home.local.json
printf '\n/config/home.local.json\n' >> .git/info/exclude
nano config/home.local.json
```

Start with one real sensor from Home Assistant's Developer Tools → States:

```json
[
  {"id":"sensor.REPLACE_WITH_REAL_ID","label":"Temperature","area":"Home","wall":true,"actions":[]}
]
```

The uppercase example is deliberately invalid: replace the entire ID with an actual entity ID before starting. Do not assume example sensors exist. Only add device actions after reviewing the real devices. Read-only sensors use `actions: []`; permitted light/switch/fan/media-player controls use `turn_on`/`turn_off`; scenes use `activate`. Wall controls additionally require `wallControl: true`.

The supplied Compose environment explicitly sets `HA_ENTITIES_FILE`, so changing `.env` alone will not override it. Add this mapping to your existing `compose.cafe.local.yaml`, keeping its Café router label:

```yaml
services:
  purrbrews-dashboard:
    environment:
      HA_ENTITIES_FILE: /app/config/home.local.json
    labels:
      traefik.http.routers.purrbrews-dashboard.rule: 'Host(`cafe.${DOMAIN}`)'
```

Then apply and check:

```bash
docker compose -p purrbrews-cafe -f compose.yaml -f compose.cafe.local.yaml config --quiet
docker compose -p purrbrews-cafe -f compose.yaml -f compose.cafe.local.yaml up -d --force-recreate purrbrews-dashboard
python3 deployment/verify.py
python3 deployment/integration-status.py
```

Home should report `ready`, with selectedEntities greater than zero. Compare the sensor value with Home Assistant. Until devices are paired and IDs are selected, Setup needed is expected.

For an Actual failure, `python3 deployment/diagnose-actual.py` tests authentication, download, sync, and normalization using a disposable cache. It prints only the failure stage and an allowlisted error code, never token values or budget contents. The cache is removed afterward. `network-failure` at authentication points to server access; `token-expired` points to the session token; `budget-not-found` points to Sync ID or access; `missing-key` requires the budget's encryption password.

## 5. Gatus requires an infrastructure connection

In the fleet configuration, Gatus runs inside sieve's `sieve_edge` network with no published port. `http://192.168.0.10:8080` is not its backend address. The public Gatus UI is behind interactive Authelia and cannot be used directly by Café's background reader.

A machine-readable route must be designed and committed in the infrastructure repository, then pulled on sieve. It should restrict access to the intended backend client, preserve the existing UI login, and be verified from inside Café. Do not publish port 8080 publicly or remove Authelia to make it work. Once the route exists, set `GATUS_URL` and any required `GATUS_AUTHORIZATION` in Café's private `.env`, recreate Café, and run the status check.

The tracked Gatus config already has fleet checks named percolator, cellar, mochaPot, and grinder, matching Café's names. It does not have a check named sieve. Sieve remains Unknown unless a suitable endpoint is explicitly mapped with `GATUS_FLEET_KEYS`; a reachable app alone is not proof that the whole node is healthy.

## 6. Wall display

`/wall` is the presentation view. For a shared kiosk, create an account belonging only to `purrbrews_wall_display`, add its access rule in the infrastructure Authelia template before the default denial, preserve the existing MFA policy, and deliver the change through Git. An account also in household/admin groups retains personal access. Verify personal API requests are denied before leaving that account signed in on a shared display.

## Status and updates

```bash
python3 deployment/verify.py
python3 deployment/integration-status.py
```

The second command prints configured flags and provider statuses, not tokens, mailbox content, or financial amounts. Provider checks may take up to a minute for Actual.

Before an update, `git status --short` should be clean. Pull code with `git pull --ff-only`, preserve local overrides and `.env`, and rebuild with the same Compose project/files when application code changes. Back up the data volume, `.env`, local entity config, and encryption key together. Do not use `down -v` or regenerate an established encryption key.
