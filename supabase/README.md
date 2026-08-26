# Supabase setup

## 1. Create a project

Create a project at [supabase.com](https://supabase.com) (or run one
locally with the Supabase CLI). Grab the project URL and anon key for
`apps/web/.env.local` (see `apps/web/.env.example`).

## 2. Enable GitHub auth

Dashboard → Authentication → Providers → GitHub. Create a GitHub OAuth App
(Settings → Developer settings → OAuth Apps) pointing its callback URL at
the one Supabase shows on that page, and paste the client id/secret back
into Supabase.

## 3. Apply the schema

With the Supabase CLI, from the repo root:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste each file under `migrations/` into the SQL editor in the
dashboard, in filename order.

## 4. Deploy the LeetCode proxy

```bash
supabase functions deploy leetcode-proxy
```

It expects a JSON POST body of `{ "op": "summary" | "recent", "username":
"...", "limit"?: number }` and returns the raw LeetCode GraphQL response
(same shape whether you call it via this proxy or LeetCode's own endpoint
directly, which is what `packages/shared/src/leetcode.ts` expects — pass
this function's URL as the client's `endpoint` option).

## 5. Daily auto-import (optional)

Backfills every enrolled user's recent LeetCode solves once a day, server
side — no browser tab or extension needs to be open. A user enrolls just
by running the site's manual "Import from LeetCode" once (it saves the
username to `leetcode_profiles`).

```bash
supabase functions deploy daily-import
supabase secrets set CRON_SECRET=$(openssl rand -hex 32)
```

`CRON_SECRET` is optional but strongly recommended — without it, anyone
holding the project's public anon key could trigger a full batch import on
demand (privileged writes fanned out across every enrolled user, plus
repeated hammering of LeetCode's API), not just the scheduled job. `apikey`/
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` don't need setting — Supabase
auto-injects those into every function's environment.

Then, in the SQL editor, enable the two extensions that let Postgres call
an HTTP endpoint on a schedule, and schedule the call. This is
project-specific (embeds your project's URL and the secret above) so it's
a one-time SQL command to run yourself, not a migration file:

```sql
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'daily-leetcode-import',
  '30 15 * * *', -- 9pm IST daily (IST is UTC+5:30; cron runs in UTC)
  $$
  select net.http_post(
    url := 'https://<your-project-ref>.supabase.co/functions/v1/daily-import',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <your-anon-key>',
      'x-cron-secret', '<the-CRON_SECRET-value-from-above>'
    )
  );
  $$
);
```

To confirm it's running: `select * from cron.job_run_details order by start_time desc limit 5;`
after the next scheduled time passes. To stop it:
`select cron.unschedule('daily-leetcode-import');`.

## Notes

- `problems` is a shared catalog table (RLS allows any authenticated user
  to read/insert/update it) — it's append-only, merge-on-conflict-by-slug,
  and holds no per-user data, so this is safe. Every other table is scoped
  to `auth.uid() = user_id` via RLS.
- The extension writes to `solved_problems`/`targets` using a user access
  token from the site's "Extension setup" setup code (see
  `apps/extension/README.md`), not the service role key — it goes through
  the same RLS policies as the web app, and self-refreshes that token
  (`apps/extension/src/lib/supabaseAuth.ts`) rather than needing it
  re-copied after Supabase's ~1hr expiry.
- `daily-import` is the one exception to "everything goes through RLS as
  the user" — it uses the service role key (auto-injected, never stored in
  this repo) to iterate every `leetcode_profiles` row and write on each
  user's behalf. That's a deliberate, narrow bypass for a trusted server
  job with known user_ids, not a general pattern to extend elsewhere.
