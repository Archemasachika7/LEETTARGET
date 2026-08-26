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

Or paste the contents of `migrations/0001_init.sql` into the SQL editor in
the dashboard.

## 4. Deploy the LeetCode proxy

```bash
supabase functions deploy leetcode-proxy
```

It expects a JSON POST body of `{ "op": "summary" | "recent", "username":
"...", "limit"?: number }` and returns the raw LeetCode GraphQL response
(same shape whether you call it via this proxy or LeetCode's own endpoint
directly, which is what `packages/shared/src/leetcode.ts` expects — pass
this function's URL as the client's `endpoint` option).

## Notes

- `problems` is a shared catalog table (RLS allows any authenticated user
  to read/insert/update it) — it's append-only, merge-on-conflict-by-slug,
  and holds no per-user data, so this is safe. Every other table is scoped
  to `auth.uid() = user_id` via RLS.
- The extension writes to `solved_problems`/`targets` using a user access
  token copied from the site (see `apps/extension/README.md`), not the
  service role key — it goes through the same RLS policies as the web app.
