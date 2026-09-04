# Waypoint — Project Plan

## 1. Vision

Waypoint is a website + browser extension pair that tracks a user's LeetCode
progress, mirrors solved solutions into a GitHub repo (the way LeetHub does),
and lets the user set and track **targets** — problems they intend to solve —
either individually, in bulk via CSV upload, or pulled in automatically from
LeetCode's own data.

Two pieces work together:

- **Extension** — runs on `leetcode.com`, detects accepted submissions,
  commits the solution to the user's GitHub repo (LeetHub-style), and reports
  the solve back to the Waypoint backend so the site stays in sync without
  the user doing anything extra.
- **Site (web app)** — the dashboard. Connect a GitHub repo, see solved vs.
  targeted problems, upload a CSV of target problems, add one-off targets by
  hand, and see solution-file mapping (which GitHub file backs which
  problem).

## 2. Core Features

1. **Progress fetch** — how many problems solved, and which ones.
   - Primary source: the extension observing real-time submissions.
   - Secondary/backfill: LeetCode's public (unofficial) GraphQL API, queried
     by username, since it's free and requires no auth for public profile
     stats (`solvedProblem`, recent AC submissions, per-difficulty counts).
2. **GitHub repo mapping** — user points Waypoint at the GitHub repo their
   solutions live in (their existing LeetHub repo works as-is).
   - **Solution mapping**: problem → path of the solution file in that repo
     (auto-detected from LeetHub's commit conventions, e.g.
     `difficulty/problem-slug/solution.ext`; user can override manually).
   - **Question mapping**: problem → canonical LeetCode metadata (title,
     slug, url, difficulty, tags), used to match CSV rows, extension events,
     and manual entries to the same problem record.
3. **CSV targets**
   - Upload a CSV with a question-name column and a link column (plain URL,
     or an Excel `=HYPERLINK(url,"label")` formula — both supported).
   - Parsed rows become **targets** for the user; already-solved ones are
     marked done automatically via the question mapping.
   - **Update map**: re-upload a CSV (or edit inline) to update/replace an
     existing target list without losing solve history.
4. **Manual targets** — add a single problem to your target list from the
   site (paste a LeetCode link or search the canonical problem list).
5. **LeetCode API integration** — optional, best-effort use of LeetCode's
   free public GraphQL endpoint to pull profile stats and recent AC
   submissions, proxied through a backend function (browser CORS blocks
   direct calls from the site).

## 3. Non-goals (v1)

- Not scraping/mirroring LeetCode problem statements (linking out is enough).
- Not supporting non-GitHub solution stores (GitLab etc.) in v1.
- Not building our own submission judge — LeetCode remains source of truth
  for "is this solved."

## 4. Architecture

```
leettarget/
  apps/
    web/         React + Vite + TypeScript + Tailwind dashboard, talks to Supabase
    extension/   Manifest V3 extension (content + background + popup + options)
  packages/
    shared/      Types, CSV parser, LeetCode client, GitHub client — used by both apps
  supabase/
    migrations/  Postgres schema (Supabase Auth for GitHub login)
    functions/   Edge function: LeetCode GraphQL proxy (CORS workaround)
```

**Why Supabase**: gives us Postgres + GitHub OAuth + row-level security +
edge functions for free/cheap, without hand-rolling an auth server. The site
talks to Supabase directly from the browser using RLS-scoped rows; only the
LeetCode proxy needs a server-side hop.

**Why the extension commits directly to GitHub**: this is what makes it
LeetHub-compatible — users who already have a LeetHub repo don't need to
migrate anything. The extension holds a GitHub PAT (v1) or OAuth App token
(v2) in `chrome.storage`, scoped to `repo` contents write on the one repo the
user picked in the options page.

### Data flow

1. User signs in on the site (GitHub OAuth via Supabase Auth) and either:
   - picks/confirms the GitHub repo used for solutions, or
   - uploads a CSV of target problems, or
   - adds a target manually.
2. User installs the extension, opens its options page, pastes the same
   GitHub repo + a PAT, and (optionally) signs in with the same account so
   the extension can push solve events to Supabase.
3. On an accepted LeetCode submission, the content script extracts
   `{slug, title, language, code, timestamp}`, the background script:
   - commits/updates the file in the mapped GitHub path,
   - upserts a `solved_problems` row (and marks matching `targets` as done)
     via the Supabase REST API.
4. The site reads `problems`, `targets`, and `solved_problems` for the signed
   in user and renders progress + target mapping.

## 5. Data model (Postgres / Supabase)

- `problems` — canonical LeetCode catalog: `slug`, `title`, `url`,
  `difficulty`, `tags[]`.
- `github_links` — one row per user: `owner`, `repo`, `branch`,
  `path_template`.
- `targets` — `user_id`, `problem_id` (nullable if custom), `custom_title`,
  `custom_url`, `source` (`csv` | `manual` | `leetcode`), `status`
  (`pending` | `done`), `created_at`.
- `solved_problems` — `user_id`, `problem_id`, `language`, `github_path`,
  `commit_sha`, `solved_at`.
- `csv_imports` — `user_id`, `filename`, `row_count`, `imported_at` (audit
  trail for "update map").

## 6. CSV format

```csv
Question,Link
Two Sum,https://leetcode.com/problems/two-sum/
Add Two Numbers,"=HYPERLINK(""https://leetcode.com/problems/add-two-numbers/"",""Add Two Numbers"")"
```

Parser accepts either a plain URL in the link column or an Excel
`HYPERLINK()` formula (common when the sheet was authored in Excel/Sheets and
exported to CSV). The LeetCode slug is derived from the URL and used as the
join key against `problems`.

## 7. Milestones

- **M0 — Scaffold** (done): monorepo, shared package, Supabase schema,
  extension skeleton that detects submissions and commits to GitHub, web app
  with CSV upload + manual add + repo mapping UI.
- **M1 — Auth & sync** (mostly done): GitHub OAuth is live and confirmed
  working end-to-end on a real deployed site (sign-in, dashboard render,
  all tabs) against a real Supabase project. The extension's Supabase sync
  self-refreshes its access token now (site's "Repo mapping" tab has an
  "Extension setup" section generating a one-paste setup code with both an
  access and refresh token, plus the repo mapping) rather than breaking
  after Supabase's ~1hr token expiry. Not yet exercised: an actual
  extension-to-Supabase solve sync against a real project (needs a real
  LeetCode submission — see `apps/extension/README.md`).
- **M2 — LeetCode API backfill** (code done, not deployed): `leetcode-proxy`
  edge function, proxy-aware `packages/shared/src/leetcode.ts`, and an
  "Import from LeetCode" button on the dashboard that upserts `problems`/
  `solved_problems` and marks matching targets done. Still needs
  `supabase functions deploy leetcode-proxy` and `VITE_LEETCODE_PROXY_URL`
  set before it does anything (the UI hides itself until then). Also now
  has a scheduled variant — `daily-import` (a `pg_cron`-triggered edge
  function using the service role key) auto-imports every enrolled user's
  recent solves once a day (9pm IST by default), so it doesn't rely on
  someone remembering to click Import. A manual import enrolls the
  username automatically (`leetcode_profiles`). Needs its own deploy +
  `pg_cron`/`pg_net` schedule, documented in `supabase/README.md`.
- **M3 — Polish** (done): target deletion (`TargetsTable`'s Remove button),
  CSV re-upload diff preview (`CsvUploader` shows added/removed/unchanged
  before saving), a solved-by-difficulty progress chart
  (`DifficultyBreakdown`), and a solution-file mapping override UI (the
  "Solved" tab's `SolutionMappingTable` — corrects a wrong auto-detected
  GitHub path per solve) are all in.
- **M4 — Ship** (mostly done): hosted site is live on Vercel
  (`https://leetprodetails.vercel.app`, config in `apps/web/vercel.json`).
  Extension packaging is ready — real icons, `npm run package:ext` zips a
  store-uploadable archive, `apps/extension/STORE_LISTING.md` has the
  listing copy/permission justifications and `PRIVACY.md` has the privacy
  policy the store submission form requires a URL for. Still needs a human
  with a Chrome Web Store developer account: actual screenshots from a live
  session, and the submission itself.

## 8. Open questions (need a decision before M1/M2)

- GitHub auth in the extension: user-supplied PAT (simple, works today) vs.
  a GitHub App/OAuth flow (nicer UX, more setup). Plan defaults to PAT for
  v1.
- Which LeetCode endpoint to standardize on for backfill — this is an
  unofficial API and can change; the proxy should fail soft.
- Hosting for the web app (Vercel/Netlify/GitHub Pages) — not blocking for
  local dev.
