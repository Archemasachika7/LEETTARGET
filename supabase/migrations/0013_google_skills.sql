-- Google Skills: a fourth peer track alongside LeetCode/GATE/CAT, covering
-- Google Cloud Skills Boost labs/quests/badges, Coursera Google Career
-- Certificates, and any other skill a learner wants a dated goal against.
--
-- Neither Cloud Skills Boost nor Coursera exposes a free public API, so —
-- per the "don't invent data" rule — there is no sync here. Items are
-- logged by hand, the same honesty GATE/CAT already apply to their own
-- stuck-desk progress. Unlike GATE/CAT's desk, this is a real table rather
-- than device-local storage: a badge earned on one device should still show
-- up on another.

alter table goals drop constraint if exists goals_track_check;
alter table goals add constraint goals_track_check
  check (track in ('leetcode', 'gate', 'cat', 'google-skills'));

create table if not exists skill_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- What kind of thing this is, for grouping/filtering only.
  kind text not null check (kind in ('cloud-skills-boost', 'career-certificate', 'general')),

  title text not null,
  url text,

  status text not null default 'planned' check (status in ('planned', 'in-progress', 'done')),

  -- Optional personal deadline for this one item, separate from any
  -- track-level goal in `goals`.
  target_date date,
  completed_at timestamptz,

  created_at timestamptz not null default now()
);

create index if not exists skill_items_user_id_idx on skill_items (user_id);

alter table skill_items enable row level security;

create policy "users manage their own skill items"
  on skill_items for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
