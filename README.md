# Purrbrews household dashboard

## Live dashboard

The production application is now separate from these mockups. See [DEPLOYMENT.md](DEPLOYMENT.md) for local development, Authelia access, Home Assistant, Actual Budget, Purelymail, Gatus, and Docker deployment. Live pages run on port 4174; the standalone mockup server below remains on port 4173.

## Launch directly — no installation needed

1. Open this folder in File Explorer: `C:\Users\jyotirmoyc\Desktop\Projects\homepage`.
2. Double-click `index.html` to open the preview gallery in your browser.
3. Choose the overview, inbox, or wall display. Try the theme toggle and click a message or budget detail button.

No build, dependencies, server, or internet connection is required. Keep the HTML pages, `styles.css`, and `mockups.js` together when moving the previews.

## Launch with a local preview server

If you prefer a localhost URL, use the included server. It requires Node.js and no npm installation. Run these commands in PowerShell:

```powershell
Set-Location 'C:\Users\jyotirmoyc\Desktop\Projects\homepage'
node .\preview-server.cjs
```

Open **http://127.0.0.1:4173/index.html** in your browser. Keep the terminal open while browsing; press **Ctrl+C** in that terminal to stop the server. The server listens only on your computer.

If port 4173 is already in use, the preview may already be running at that URL. To launch another instance on port 4174:

```powershell
node .\preview-server.cjs 4174
```

Then open **http://127.0.0.1:4174/index.html**. If `node` is not recognized, use the direct-open method above.

## Screens and interactions

- `dashboard-overview.html`: household overview, sample device switches, budget drawer, message drawers, fleet details, and searchable service directory.
- `dashboard-inbox.html`: fictional personal inbox with a message detail drawer.
- `wall-display.html`: larger touch controls and aggregate budget values, without personal mail or category details.

The theme toggle persists across pages when browser storage is available. Drawers close with the close button or Escape. On small screens they occupy the full viewport.

The refreshed design uses a coffee-house editorial style, original inline home illustrations, an expense-envelope ring, and tactile mail and service panels. Try **Morning**, **Reading**, and **Wind down** to change the sample devices together. Individual switches clear the selected scene. All artwork is embedded; no fonts, images, or libraries are downloaded.

Financial amounts, email messages, time, device states, and node availability are illustrative. Backup verification is marked incomplete based on the supplied Purrbrews README. No credentials are collected and no live service is contacted.
