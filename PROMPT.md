# Product Prompt

This document is the working spec for Waypoint, distilled from the
original ask so future work (human or AI-assisted) has a single source of
truth for *what* to build. Engineering conventions live in `CLAUDE.md`;
architecture and phasing live in `Plan.md`. This file is the product intent.

## Original ask (paraphrased)

> Build a site + browser extension that fetches how many LeetCode problems a
> user has completed, and which ones. The site should have a way to view and
> save that progress, mapping problems to the GitHub repo the user already
> uses to save solutions (like LeetHub does) — solution mapping and question
> mapping. A CSV can be uploaded (question name + hyperlinked link columns)
> and gets parsed into individual targets for the user; there should be an
> "update map" option to refresh that later. If LeetCode has a free API,
> use it too. Also let the user add a new target question directly on the
> site, not just via CSV.

## Feature checklist (acceptance-level)

- [x] **Progress fetch**: given a signed-in user (or a LeetCode username),
      show count of problems solved and the list of which ones. (Dashboard
      reads live `solved_problems`/`targets`; "Import from LeetCode" pulls a
      username's public counts.)
- [x] **GitHub repo mapping**: user provides `owner/repo` (+ branch); system
      stores it and can resolve a problem → file path within that repo.
      (`RepoMappingForm` on the site, mirrored in the extension's options.)
- [x] **Solution mapping**: for each solved problem, know (or infer) which
      file in the repo holds the solution. (`buildSolutionPath` +
      `solved_problems.github_path`/`commit_sha`.)
- [x] **Question mapping**: canonical problem record (title/slug/url/
      difficulty) that CSV rows, extension events, and manual entries all
      resolve to, so the same problem is never duplicated. (`problems`
      table, upserted by slug from every entry point.)
- [x] **CSV upload → targets**: parse a CSV of `question name, link`
      (plain URL or Excel `HYPERLINK()` formula) into individual target
      rows for the user. (`CsvUploader` + `packages/shared/src/csv.ts`.)
- [x] **Update map**: re-upload or edit the target list later without
      wiping solve history; already-solved targets stay marked solved.
      (`replaceCsvTargets` only touches pending CSV-sourced rows.)
- [x] **Manual add**: add a single target question from the site UI
      (paste a link), no CSV required. (`AddTargetForm`; target deletion is
      also in — `TargetsTable`'s Remove button.)
- [x] **LeetCode API (if free)**: pull profile stats / solved list from
      LeetCode's public GraphQL endpoint as a backfill/import option.
      (`ImportLeetCode` via the `leetcode-proxy` edge function.)
- [x] **Extension parity with LeetHub**: still commits accepted solutions to
      the user's GitHub repo, so switching to Waypoint costs nothing versus
      using LeetHub alone. (`background.ts` commits to GitHub independent of
      whether the Supabase sync succeeds.)

All of the above are implemented in code but not yet exercised against a
live LeetCode submission end-to-end (see `Plan.md`'s M1/M2 status) — the
scaffolding sandbox this was built in can't reach external hosts to verify
the full round trip. Next real step is someone running it for real.

## Explicit non-asks

- No re-implementation of LeetCode's judge or problem statements.
- No support for solution stores other than GitHub in v1.
- No requirement to keep LeetCode API usage — it's a "nice if free" add-on,
  not load-bearing (extension-observed submissions are the primary source of
  truth since they can't disappear if LeetCode changes an unofficial API).

## How to use this file

When picking up work, check the checklist above against `Plan.md`'s
milestones to see what's implemented vs. planned. Update the checkboxes as
features land; keep this file's scope stable — if the product ask changes,
edit here first, then adjust `Plan.md`.
