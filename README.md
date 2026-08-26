# LeetTarget

Track your LeetCode progress, map solved problems to the GitHub repo you
already commit solutions to (LeetHub-compatible), and set solve **targets**
one at a time or in bulk via CSV.

See [`Plan.md`](./Plan.md) for architecture/milestones and
[`PROMPT.md`](./PROMPT.md) for the product spec this was built against.

## What's in here

- **`apps/web`** — the dashboard (React + Vite + TypeScript + Tailwind).
  Connect your GitHub repo, upload a CSV of targets, add targets by hand,
  and see your solved/target mapping.
- **`apps/extension`** — a Manifest V3 browser extension for `leetcode.com`.
  Detects accepted submissions, commits the solution to your GitHub repo
  (like LeetHub), and syncs the solve to LeetTarget so the dashboard stays
  current automatically.
- **`packages/shared`** — types, the CSV parser, a minimal LeetCode client,
  and a minimal GitHub REST client, shared by both apps.
- **`supabase`** — Postgres schema + an edge function that proxies
  LeetCode's public GraphQL API (browsers can't call it directly due to
  CORS).

## Features

- Fetches how many problems you've solved, and which ones, from live
  extension activity and (optionally) LeetCode's public API.
- Maps each solved problem to the GitHub file that holds its solution.
- Upload a CSV (`Question,Link` — plain URL or Excel `HYPERLINK()` formula)
  to set a batch of targets; re-upload anytime to update the map without
  losing solve history.
- Add a single target from the site, no CSV needed.
- Works alongside an existing LeetHub-style repo — no migration required.

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project (for the site's database + GitHub OAuth) — see
  `supabase/README.md`.
- A GitHub personal access token with `repo` scope (for the extension to
  commit solutions) — a full GitHub App flow is on the roadmap, see
  `Plan.md`.

### Install

```bash
npm install
```

This installs all workspaces (`apps/web`, `apps/extension`,
`packages/shared`) via npm workspaces.

### Run the web app

```bash
cp apps/web/.env.example apps/web/.env.local
# fill in your Supabase URL + anon key
npm run dev:web
```

### Build the extension

```bash
npm run build:ext
```

Then load `apps/extension/dist` as an unpacked extension in Chrome
(`chrome://extensions` → Developer mode → Load unpacked). See
`apps/extension/README.md` for the options-page setup (GitHub repo + PAT).

### Database

Apply the schema in `supabase/migrations/0001_init.sql` to your Supabase
project (`supabase db push` from the Supabase CLI, or paste it into the SQL
editor). See `supabase/README.md` for the edge function deploy steps.

## Deploying the site (Vercel)

`apps/web` is a static Vite build with no server-side code of its own (auth,
DB, and the LeetCode proxy all live in Supabase), so a static host works
fine — Vercel's free tier is a reasonable default:

1. Import the repo in Vercel and set **Root Directory** to `apps/web`. This
   repo is an npm-workspaces monorepo — `apps/web/vercel.json` explicitly
   `cd`s to the repo root for install/build so the `@leettarget/shared`
   workspace link resolves correctly, independent of Vercel's monorepo
   auto-detection.
2. Add the environment variables from `apps/web/.env.example`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally
   `VITE_LEETCODE_PROXY_URL`) in the Vercel project's Settings →
   Environment Variables.
3. Deploy. Once you have the `*.vercel.app` URL (or a custom domain), add it
   to your Supabase project's **Authentication → URL Configuration** (Site
   URL / Redirect URLs) — same requirement as `http://localhost:5173` for
   local dev, just for the deployed origin. Skipping this step is the most
   common way GitHub sign-in silently fails post-deploy.

## Project status

Core structure, the CSV/GitHub/LeetCode clients, and the extension's
submission-detection + GitHub-commit path are in place. GitHub OAuth and the
schema are live against a real Supabase project; "Import from LeetCode" is
code-complete but needs `leetcode-proxy` deployed to do anything. Not yet
exercised end-to-end: a real extension solve syncing to that project, and a
production deploy. Track progress against [`PROMPT.md`](./PROMPT.md)'s
checklist and [`Plan.md`](./Plan.md)'s milestones.

## License

Unlicensed for now — add one before any public release.
