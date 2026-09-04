# Chrome Web Store listing — working notes

Everything needed to fill out the Chrome Web Store developer dashboard for
Waypoint. This isn't submitted anywhere automatically — it's the copy to
paste in when someone with a Chrome Web Store developer account (one-time
$5 registration fee, a Google requirement, not a Waypoint one) does the
actual submission.

## Package

```bash
npm run package:ext
```

Produces `apps/extension/release/leettarget-extension-v<version>.zip`,
ready to upload as-is under Package → "Upload new package".

## Store listing copy

**Name:** Waypoint

**Summary** (132 chars max):
> Sync accepted LeetCode solutions to your GitHub repo and track progress
> against your own target list.

**Category:** Developer Tools

**Description:**

> Waypoint watches leetcode.com for accepted submissions and commits the
> solution straight to your own GitHub repository — compatible with
> existing LeetHub-style repos, no migration needed. Pair it with the
> Waypoint dashboard (self-hosted, your own Supabase project) to:
>
> - See how many problems you've solved, and which ones
> - Upload a CSV of target problems and track progress against it
> - Add one-off targets by hand
> - See which GitHub file backs each solved problem, and fix it by hand
>   when the auto-detected path guesses wrong
>
> Waypoint has no server of its own — it talks directly to the GitHub
> repo and (optionally) the Supabase project you configure. See the
> privacy policy for exactly what's read, stored, and sent.

## Single purpose (required by Chrome Web Store policy)

> Detects an accepted LeetCode submission and commits the solution to a
> user-configured GitHub repository.

Everything else (the optional Supabase sync) is in service of that single
purpose — it exists so the companion dashboard can display the same solves,
not as a second unrelated feature.

## Permission justifications

| Permission | Why |
|---|---|
| `storage` | Stores the user's GitHub repo/token and optional Supabase config, entered on the Options page. No alternative API provides this. |
| `host_permissions: leetcode.com/*` | Content script needs to run on LeetCode problem pages to detect accepted submissions — this is the extension's entire reason to exist. |
| `host_permissions: api.github.com/*` | Commits the solved code to the user's configured GitHub repository via the REST API. |
| `host_permissions: *.supabase.co/*` | Optional: syncs the solve to the user's own Supabase project so the Waypoint dashboard can display it. Only used if the user fills in the optional Supabase fields. |

## Privacy

- **Privacy policy:** `PRIVACY.md` in this directory. Needs a public URL
  for the Chrome Web Store form — either the GitHub raw URL
  (`https://raw.githubusercontent.com/<owner>/<repo>/<branch>/apps/extension/PRIVACY.md`)
  or, nicer, a `/privacy` route on the deployed site if one gets added later.
- **Data usage disclosure** (the dashboard's "Privacy practices" tab — answer
  honestly per `PRIVACY.md`):
  - Does this extension collect or use user data? **Yes.**
  - What data: **Authentication information** (the GitHub PAT and optional
    Supabase credentials the user enters), **Website content** (the
    submitted code/problem info read from leetcode.com).
  - Is data sold to third parties? **No.**
  - Is data used for purposes unrelated to the extension's core
    functionality? **No.**
  - Is data used to determine creditworthiness or for lending purposes?
    **No.**

## Assets still needed (not generated in this repo)

- **Screenshots** (1280×800 or 640×400, at least one required): capture the
  Options page filled in, the popup showing a configured repo, and the
  dashboard's Solved tab — these need a live signed-in session, so they
  have to come from someone actually running the extension.
- **Small promo tile** (440×280, optional but recommended).
- Icons are already generated and wired into `manifest.json`
  (`public/icons/icon-{16,32,48,128}.png`).
