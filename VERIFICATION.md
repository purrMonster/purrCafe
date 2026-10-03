# Purrbrews verification report

## October 3, 2026 repass

- 19 application tests passed again on Windows and inside the deployed Linux container.
- Six isolated Actual setup-helper tests passed on Windows and Linux: secret-free output, backups and permissions, preserved custom backend, duplicate-setting rejection, token validation, noninteractive-input rejection, and password character preservation.
- Current production dependency audit: zero known vulnerabilities.
- Deployed Café: healthy, restart count zero, internal health HTTP 200, unauthenticated API HTTP 401, verified HTTPS, and browser-style requests redirect to Authelia.
- Live configuration diagnosis: Actual settings unset; Home Assistant URL/token present with zero entities selected; Gatus configured but unavailable. Home Assistant pointed at the wrong fleet node; the configuration guide identifies mochaPot as the correct target. Gatus's configured LAN port is not published by its service.
- Setup fix: require an interactive terminal before prompting for credentials.
- Added a provider-status-only diagnostic and CONFIGURATION.md. Changes delivered via GitHub. No credentials or real domain committed. The repass did not change fleet routing or inject integration credentials.

Authenticated browser sessions, real Actual authentication/budget totals, personal mailbox connections, and an eventual Gatus backend route remain to be verified after configuration. The frontend code is unchanged since the recorded desktop/tablet/phone fixture review below.

Reviewed October 2, 2026 (Asia/Calcutta).

## Completion status

The application and deployment package are implemented and locally verified. Production commissioning remains unfinished: real integration credentials, entity IDs, trusted proxy address, DNS/TLS, Authelia policies, and deployment on percolator have not been supplied or exercised. No fleet configuration was modified.

## Issues fixed during the review

- IMAP errors and disconnects now fail the request safely, with an overall 45-second deadline and connection cleanup.
- Email source size is checked before downloading and bounded while streaming. Invalid IDs and mailbox generation changes are rejected.
- Closing a message drawer cancels its pending display; a late response cannot reopen it. Closing also clears message content.
- Fleet normalization ignores malformed timestamps before choosing the latest valid reading; stale, missing, and future readings remain Unknown.
- Clearing a cache during an in-flight read prevents that old response from becoming a fresh cached reading.
- Actual amounts must be safe integers, including aggregate totals. Null and overflowing amounts are rejected.
- Upstream JSON responses are bounded during streaming, rather than after downloading the entire response.
- Invalid email dates render as unavailable timestamps instead of breaking the inbox.

## Automated verification

| Check | Result |
| --- | --- |
| `npm test` | 19 passed, 0 failed on Windows |
| Current production dependency audit | 0 known vulnerabilities reported |
| Production Docker build | Successful with locked dependencies and pinned Node base |
| All 19 tests inside production image | Passed with no network, read-only filesystem, dropped capabilities, and no-new-privileges |
| Compose validation using `.env.example` | Passed; no live `.env` loaded |

The tests cover proxy identity trust, unauthenticated access, wall data restrictions, personal route denial, mutation origin checks, action allowlists, credential encryption and isolation, budget normalization, connection failures, size limits, fleet timestamps, and cache invalidation. The Actual test imports a disposable offline budget in a worker and reads it through the native library; it does not connect to the household budget.

Reproduce from this workspace:

```powershell
npm test
npm audit --omit=dev
docker build -t purrbrews-dashboard:1.0.0 .
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges --tmpfs /tmp:size=128m,mode=1777 --entrypoint node purrbrews-dashboard:1.0.0 --test 'server/*.test.mjs'
docker compose --env-file .env.example -f compose.yaml config --no-env-resolution --quiet
```

An audit is a snapshot of known dependency advisories, not proof that the application has no vulnerabilities.

## Browser verification

Used the real frontend with a disposable localhost fixture containing explicitly fictional values. The fixture is separate from the production backend and is not included in the image.

- Budget drawer shows category details and closes with Escape.
- Email drawer renders HTML-looking text as text; no image element is created.
- Closing during a delayed message load keeps the drawer closed after the response arrives.
- Device control refreshes the state returned by the fixture API.
- Service search displays its empty result state.
- Phone (390 × 844) and tablet (768 × 1024) views have no horizontal document overflow.
- Tablet wall view omits mail content and expense category details.
- Desktop (1440 × 1000) layout and dark/light theme switch were visually checked.
- No warning or error console messages were reported in the fixture pass.
- Restarted the live local app and confirmed missing integrations display setup states, with no invented readings.

The fictional screenshot is [verification/ui-review.png](verification/ui-review.png). To repeat UI checks, run `node verification/ui-fixture.mjs`, open `http://127.0.0.1:4175`, and stop with Ctrl+C. Never deploy this verification fixture.

## Remaining commissioning checks

Follow [DEPLOYMENT.md](DEPLOYMENT.md), then verify with real credentials locally:

1. Home Assistant entity IDs, permitted commands, actual state refresh, and failure handling.
2. Actual server authentication, encrypted budget sync if enabled, and totals against the Actual client.
3. Purelymail credentials, real read-only previews, mailbox isolation across two signed-in users, and disconnect.
4. Gatus backend access and mapping of the five fleet endpoints.
5. Traefik socket trust, forwarded identity headers, DNS/TLS, and Authelia access policies.
6. Dedicated wall-only account: personal APIs denied, aggregate budget only, and reviewed wall controls.
7. Persistent volume backup and restore with the original encryption key, restart behavior, and fleet reachability.

Local tests and fixture UI checks do not establish these end-to-end production results. Backup health is deliberately shown as needing verification until a real monitor is implemented.
