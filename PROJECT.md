---
project: purrCafe
status: paused
status_reason: v1.1.0 released and CI green; no commits since 2026-10-15 and the live migration to 1.1.0 is not recorded as done
resume_trigger: Roastmaster confirms what runs on percolator after the October node rebuild and gives the go-ahead to deploy 1.1.0
last_activity: 2026-10-15
last_reviewed: 2026-10-23
repo: https://github.com/purrMonster/purrCafe
related: ["[[purrbrews]]"]
tags: [project]
---

# purrCafe

## What it is
A small, private household dashboard for the purrBrews fleet: Home Assistant sensors and switches, the month's budget (Actual Budget), per-person IMAP inboxes, fleet reachability (Gatus) and a directory of self-hosted services, plus a wall-display view with no personal data. Runs behind a reverse proxy with forward-auth SSO (Traefik + Authelia).
Stack: plain Node 22 server, plain JS front end, 4 runtime deps, Docker image on GHCR, Python deployment helpers.

## Current state
| Area | State | Evidence |
|---|---|---|
| Code | built: all settings externalised to `.env` + untracked JSON | [main @ 7eedb49](https://github.com/purrMonster/purrCafe/commit/7eedb4980acbf633b039de8e8ae942698f144999), [CHANGELOG 1.1.0](CHANGELOG.md) |
| Release | v1.1.0, image `ghcr.io/purrmonster/purrcafe:1.1.0` (amd64); `:edge` from main | [release v1.1.0](https://github.com/purrMonster/purrCafe/releases/tag/v1.1.0), [runbook 2026-10-14 "Released v1.1.0"](docs/runbook.md#2026-10-14--released-v110) |
| Deployment | 1.0.0 (pre-cleanup) ran on percolator as of 2026-10-03; 1.1.0 not deployed; current state unknown | [HANDOFF Oct 3](docs/HANDOFF.md), [runbook "Where we stopped"](docs/runbook.md#2026-10-14--released-v110) |
| Tests / CI | passing: 26 server + 7 helper tests (re-run 2026-10-23); `ci` and `image` green on main 2026-10-15 | [ci.yml](.github/workflows/ci.yml), [image.yml](.github/workflows/image.yml), [Actions](https://github.com/purrMonster/purrCafe/actions) |

## Open points
1. Migrate percolator to 1.1.0 per [DEPLOYMENT.md → Migrating](docs/DEPLOYMENT.md#migrating-from-the-pre-cleanup-layout) and run `deployment/verify.py`. Owner step; needs his go-ahead.
2. No live verification of 1.1.0 with real integrations yet ([runbook](docs/runbook.md)).
3. Gatus backend route was unavailable at last check ([HANDOFF Oct 3](docs/HANDOFF.md), [VERIFICATION Oct 3](docs/VERIFICATION.md)).
4. Home Assistant: only weather is selected; device entities and allowed actions still to pair and list ([HANDOFF Oct 3](docs/HANDOFF.md)).
5. Not yet verified: signed-in browser session, budget totals against the Actual client, personal mailbox connections, a dedicated wall account ([VERIFICATION](docs/VERIFICATION.md)).

## Branches
- `ci/image-and-tests`: merged as PR #2, 0 commits ahead of main. Stale, safe to delete.
- `docs/readme-badges-screenshot`: merged as PR #3, 0 ahead. Stale.
- `release/v1.1.0`: merged as PR #4, 0 ahead. Stale.
- `docs/runbook-v1.1.0`: merged as PR #5, 0 ahead. Stale.

## Key decisions
- 2026-10-03 · Actual reached over the shared Docker network backend instead of its public HTTPS URL · [HANDOFF Oct 3](docs/HANDOFF.md)
- 2026-10-14 · No environment-specific values in code; household config untracked, only `*.example.json` · [runbook cleanup entry](docs/runbook.md#2026-10-14--verification-and-cleanup-branch-cleanupconfig-and-hygiene)
- 2026-10-14 · Stop tracking vendored `SKILLS/` reference repos · [runbook cleanup entry](docs/runbook.md#2026-10-14--verification-and-cleanup-branch-cleanupconfig-and-hygiene)
- 2026-10-14 · Publish to GHCR, amd64 only; `:edge` from main, versioned tags from `vX.Y.Z` only; deploy pinned releases, never `:edge` · [runbook CI entry](docs/runbook.md#2026-10-14--ci-and-image-publishing-branch-ciimage-and-tests)
- 2026-10-14 · Keep the image unslimmed (option A, ~110 MB pull); distroless not worth losing the shell · [runbook CI entry](docs/runbook.md#2026-10-14--ci-and-image-publishing-branch-ciimage-and-tests)
- 2026-10-14 · Standalone `deploy/` stack for image-only installs · [commit 312913e](https://github.com/purrMonster/purrCafe/commit/312913e)

## How to resume
1. Orient: README, newest [runbook](docs/runbook.md) entry, `git log -10`, Actions status.
2. Check what Café container (if any) runs on percolator now; record it in the runbook.
3. Fresh install or migration: follow [DEPLOYMENT.md](docs/DEPLOYMENT.md) with `CAFE_IMAGE=ghcr.io/purrmonster/purrcafe:1.1.0`, then `python3 deployment/verify.py`.
4. Reconnect integrations one at a time per [CONFIGURATION.md](docs/CONFIGURATION.md); write a dated runbook entry with evidence.

## Decisions to remake
- Actual backend URL and `FLEET_NODES`: both were chosen against the pre-rebuild fleet; re-check container names, networks and Gatus endpoints before redeploying.
- [HANDOFF.md](docs/HANDOFF.md) and [VERIFICATION.md](docs/VERIFICATION.md) are historical; decide whether to keep them in `docs/` or move them to an archive folder once 1.1.0 is verified.

## Questions for Roastmaster
- Did the October node wipe/rebuild remove the 1.0.0 deployment on percolator, or is it still running? Nothing in the repo records either.
- Is purrCafe paused under the weekly-only purrBrews cadence, or still active outside it?
- Delete the four merged remote branches above? (Not done; deletion needs your go-ahead.)
- The repo has no AGENTS.md or CLAUDE.md. Should one be created (see the PR proposal)?
- `package.json` is still named `purrbrews-dashboard`; intended, or rename to `purrcafe`?
- Is the Gatus backend route reachable after the rebuild?

## Card history
- 2026-10-23 · created by Claude (Opus 5.5)
