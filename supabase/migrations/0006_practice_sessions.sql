-- Timed practice sessions with a shareable code. A solo timer needs none of
-- this — it's pure client state, started_at + duration counted down in the
-- browser — but a *shared* countdown (multiple people watching the same
-- clock) needs one row everyone can read by code so every client derives
-- the identical remaining time from the same started_at, with no realtime
-- channel required.

create table if not exists practice_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_user_id uuid not null references auth.users (id) on delete cascade,
  label text,
  duration_seconds integer not null check (duration_seconds > 0 and duration_seconds <= 86400),
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_code_idx on practice_sessions (code);

alter table practice_sessions enable row level security;

-- Joining is "know the code" — the code itself is the access control, the
-- same shape as a meeting link. So select is open to any signed-in user
-- (they still need the actual code string to find a row), while only the
-- host can create or remove their own session.
create policy "practice_sessions are readable by authenticated users"
  on practice_sessions for select
  to authenticated
  using (true);

create policy "users create their own practice_sessions"
  on practice_sessions for insert
  to authenticated
  with check (auth.uid() = host_user_id);

create policy "users delete their own practice_sessions"
  on practice_sessions for delete
  to authenticated
  using (auth.uid() = host_user_id);
