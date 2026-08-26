-- Stores the LeetCode username each user wants auto-imported. Populated
-- whenever a manual "Import from LeetCode" succeeds (see
-- apps/web/src/lib/api.ts's importFromLeetCode) — running one manual
-- import enrolls a user in the daily auto-import. Read server-side by the
-- daily-import edge function via the service role key, which bypasses the
-- RLS below by design (it's a trusted server context iterating known
-- user_ids, not a user-facing query path).

create table if not exists leetcode_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  updated_at timestamptz not null default now()
);

alter table leetcode_profiles enable row level security;

create policy "users manage their own leetcode_profiles"
  on leetcode_profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
