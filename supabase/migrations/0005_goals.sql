-- Personal practice goals. The dashboard's "what should I do today?" needs a
-- number to measure against, and nothing in the schema held one — solve
-- counts alone can't say whether a day went well.
--
-- One row per user, created on first save (or by onboarding). Deliberately
-- not defaulted into existence for every user: the absence of a row is what
-- tells the dashboard onboarding hasn't happened yet.

create table if not exists user_goals (
  user_id uuid primary key references auth.users (id) on delete cascade,

  -- The two cadences the dashboard reports against.
  daily_target integer not null default 3 check (daily_target between 1 and 50),
  weekly_target integer not null default 15 check (weekly_target between 1 and 350),

  -- Why they're practising — set during onboarding, used to phrase the
  -- dashboard's framing rather than to gate any functionality.
  focus text check (focus in ('interview', 'competitive', 'fundamentals', 'general')),

  -- Optional long-term goal, separate from the daily/weekly cadence.
  goal_total integer check (goal_total > 0),
  goal_deadline date,

  onboarded_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table user_goals enable row level security;

-- Goals are private: unlike profiles/targets/solves (which migration 0004
-- opened up for the leaderboard), there's no reason for one user to read
-- another's targets-per-day.
create policy "users manage their own goals"
  on user_goals for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
