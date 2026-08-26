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

## Project status

Early scaffold — core structure, types, CSV parsing, and the extension's
submission-detection + GitHub-commit path are in place. Live Supabase wiring
and the LeetCode API backfill are next; track progress against
[`PROMPT.md`](./PROMPT.md)'s checklist and [`Plan.md`](./Plan.md)'s
milestones.

## License

Unlicensed for now — add one before any public release.
