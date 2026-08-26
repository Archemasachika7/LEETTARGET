# LeetTarget extension

Manifest V3 extension that detects accepted LeetCode submissions, commits
the solution to your GitHub repo (LeetHub-style), and optionally syncs the
solve to your LeetTarget account.

## How it works

- `src/inject.ts` runs in the page's **MAIN** world (it needs to see
  LeetCode's own `fetch` calls) and patches `fetch` to catch the submit
  request (for the code + language) and the subsequent "Accepted" poll
  response, then dispatches a `leettarget:solved` `CustomEvent`.
- `src/content.ts` runs in the isolated content-script world, listens for
  that event, and relays it to the background service worker via
  `chrome.runtime.sendMessage` (only the isolated world has `chrome.runtime`).
- `src/background.ts` commits the solution to GitHub via the GitHub REST
  API, then best-effort syncs the solve to Supabase. The GitHub commit never
  depends on the Supabase sync succeeding.

## Build

From the repo root:

```bash
npm install
npm run build:ext
```

This bundles everything into `apps/extension/dist/`.

## Load it

1. Open `chrome://extensions`.
2. Enable "Developer mode" (top right).
3. Click "Load unpacked" and select `apps/extension/dist`.
4. Click the LeetTarget icon → Options, and fill in:
   - A GitHub personal access token with `repo` scope (Settings →
     Developer settings → Personal access tokens on GitHub). This is the
     one thing that's always manual — it never leaves the extension.
   - Everything else — GitHub `owner/repo`/branch, and (optionally) the
     Supabase config to also sync solves into the dashboard — comes from
     pasting the setup code generated on the site's "Repo mapping" tab
     into the "Paste setup code from the site" box and clicking Apply. It
     includes a refresh token, so the extension keeps syncing past
     Supabase's ~1hr access-token expiry without you having to re-copy
     anything.
5. Solve a problem on `leetcode.com` — an accepted submission should commit
   to your repo within a couple seconds.

Re-run `npm run build:ext` and click the reload icon on
`chrome://extensions` after making changes.

## Packaging for the Chrome Web Store

```bash
npm run package:ext
```

Builds and zips `dist/` into `apps/extension/release/leettarget-extension-v<version>.zip`,
with `manifest.json` at the archive root as the store expects. See
`STORE_LISTING.md` for the listing copy, permission justifications, and
what's still needed (screenshots) before an actual submission, and
`PRIVACY.md` for the privacy policy the store submission form requires a
public URL for.
