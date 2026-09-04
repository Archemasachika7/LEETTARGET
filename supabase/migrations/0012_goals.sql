-- Dated goals, per track.
--
-- `user_goals` (migration 0005) holds a daily/weekly cadence for LeetCode and
-- nothing else — there was no way to say "GATE is on 8 February" or "500
-- problems before placements start", which is the shape almost every real
-- commitment actually has: a date, and optionally an amount to reach by it.
--
-- Kept as its own table rather than more columns on `user_goals` because a
-- person has several of these at once across different tracks, and 0005 is
-- explicitly one row per user.
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Which workspace this goal belongs to. Matches the app's track switcher;
  -- a goal is always read in the context of one track's progress.
  track text not null check (track in ('leetcode', 'gate', 'cat')),

  title text not null,

  -- A plain calendar date, not a timestamp: "the exam is on the 8th" is a
  -- date on a wall calendar, and storing an instant would make it drift by a
  -- day for anyone west of UTC. The client parses it as local midnight.
  target_date date not null,

  -- Nullable on purpose. A goal with no count is a pure date marker (the exam
  -- itself) — the app shows it a countdown and deliberately no percentage,
  -- rather than inventing a denominator it has no source for.
  target_count integer check (target_count > 0),

  -- What one unit is, for display only: "problems", "topics", "mocks".
  unit text,

  created_at timestamptz not null default now(),

  -- Archived rather than deleted, so a passed exam stays in the record
  -- instead of vanishing from the history of what was being worked toward.
  archived_at timestamptz
);

create index if not exists goals_user_id_idx on goals (user_id);

alter table goals enable row level security;

-- Private, like `user_goals` — the leaderboard exposes solve counts, not what
-- someone is privately working toward or how far behind they are on it.
create policy "users manage their own goals"
  on goals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
