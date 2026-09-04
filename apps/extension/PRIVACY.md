# Waypoint Extension — Privacy Policy

_Last updated: 2026-08-26_

Waypoint is self-hosted by design: there is no Waypoint-operated server.
The extension talks directly to services **you** configure — your own
GitHub repository and, optionally, your own Supabase project — and to
LeetCode's own pages. This document describes exactly what the extension
reads, stores, and sends, and to whom.

## What the extension observes

On `leetcode.com/problems/*` pages only, the extension watches for an
accepted ("Accepted") submission and reads:

- the problem's title and URL slug
- the language and source code you submitted
- the time of the solve

It does not read anything else on LeetCode's site, and it does not run on
any other website.

## What the extension stores locally

Configured via the extension's Options page, stored in `chrome.storage.sync`
(which Chrome syncs across your own signed-in browser instances, the same
as bookmarks — this data is not visible to Waypoint or anyone else):

- the GitHub repository (`owner/repo`, branch, path template) you point it at
- a GitHub personal access token you provide
- (optional) a Supabase project URL, anon key, your Waypoint user id, and
  a Supabase access token, if you choose to also sync solves to the
  Waypoint dashboard

None of this is transmitted to any server operated by Waypoint, because
none exists.

## Who the extension sends data to

- **GitHub** (`api.github.com`) — when you solve a problem, the extension
  commits the code + a generated file path to the repository you
  configured, using the personal access token you provided. This is the
  only outbound use of your GitHub token.
- **Your own Supabase project** (`*.supabase.co`) — only if you've filled
  in the optional Supabase fields in the extension's options. When set,
  the extension writes the solved-problem record to your project's
  database, using your access token, so the Waypoint dashboard (which
  also only talks to your Supabase project) can display it.
- **LeetCode** (`leetcode.com`) — the extension observes page activity but
  does not send LeetCode any additional data beyond what your normal
  submission already sends.

No analytics, tracking, or advertising code is included. No data is sold
or shared with any third party beyond the two services above, both of
which you configure yourself and both of which are already services you
have an account with.

## Data retention and deletion

- Local extension settings: cleared by removing the extension, or by
  clearing its storage in `chrome://extensions`.
- GitHub commits: governed by your own repository — delete the commits or
  the repo as you would any other.
- Supabase rows (if used): governed by your own project — delete rows via
  the dashboard's table editor, or delete the project entirely.

## Changes to this policy

If this policy changes, the update will be reflected in this file's "Last
updated" date and in the corresponding commit history.

## Contact

Questions or concerns: open an issue on the project's GitHub repository.
