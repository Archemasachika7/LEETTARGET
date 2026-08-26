# CLAUDE.md

Guidance for Claude Code (or any agent) working in this repository.

## What this repo is

LeetTarget: a website + browser extension for tracking LeetCode progress and
mapping solved problems to a GitHub repo. Full product spec in `PROMPT.md`,
architecture/milestones in `Plan.md`. Read both before making non-trivial
changes — they're the source of truth for scope, not this file.

## Layout

```
apps/web/          Vite + React + TS + Tailwind dashboard (talks to Supabase)
apps/extension/    Manifest V3 extension (content/background/popup/options)
packages/shared/   Types, CSV parser, LeetCode client, GitHub client
supabase/          SQL migrations + the LeetCode-proxy edge function
```

`packages/shared` is imported by both apps as `@leettarget/shared` via npm
workspaces (`file:` link, not published). If you change its public API,
check both `apps/web` and `apps/extension` for call sites.

## Commands

```bash
npm install            # installs all workspaces
npm run dev:web         # Vite dev server for the site
npm run build:web       # production build of the site
npm run build:ext       # esbuild bundle of the extension into apps/extension/dist
npm run typecheck       # tsc --noEmit across all workspaces
```

There is no test suite yet — if you add non-trivial logic (especially to
`packages/shared`, e.g. the CSV parser or GitHub path resolution), add a
lightweight test alongside it rather than leaving it unverified.

## Conventions

- TypeScript everywhere, strict mode on. No `any` unless genuinely
  unavoidable (external untyped payloads — narrow it at the boundary).
- Shared logic (parsing, API clients, types) belongs in `packages/shared`,
  not duplicated between `apps/web` and `apps/extension`.
- The extension talks to GitHub and Supabase directly from the background
  service worker — it does not go through the web app's dev server.
- The web app talks to Supabase directly from the client (RLS-scoped), not
  through a hand-rolled API layer. The one exception is the LeetCode GraphQL
  proxy (`supabase/functions/leetcode-proxy`) — browsers can't call LeetCode
  directly due to CORS, so that hop has to be server-side.
- Keep the extension LeetHub-compatible: it should still commit accepted
  solutions to the user's GitHub repo even if LeetTarget's own sync fails —
  don't make the GitHub commit depend on the Supabase call succeeding.
- Don't add a backend framework (Express/Next API routes/etc.) for
  CRUD that Supabase + RLS already covers. Only add a server-side function
  when something genuinely can't run in the browser (CORS, secrets).

## Working with the plan/prompt docs

- `PROMPT.md` has a feature checklist — treat it as the acceptance criteria
  for "is this done." Update checkboxes as features land.
- `Plan.md` has milestones (M0–M4) and open questions. If you resolve an
  open question (e.g. picking PAT vs. GitHub App auth), update that section
  rather than leaving the decision only in code/commit history.
- If the product ask changes, edit `PROMPT.md` first, then reconcile
  `Plan.md`, rather than letting code and docs drift apart.
