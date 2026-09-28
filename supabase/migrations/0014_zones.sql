-- Exam zones: the GATE DA zone and the CAT zone.
--
-- Three things a learner keeps per zone: how far through the syllabus they are
-- (a checklist), the work they've been handed (assignments, with a file), and
-- when they plan to do it (a schedule). All of it syncs, so the same checklist
-- shows up on every device, which the old device-local study desk couldn't do.
--
-- Topic ids come from packages/shared/src/zones.ts. They're plain text rather
-- than a foreign key because the syllabus lives in code, not in a table: it
-- changes once a year when the organising institute republishes it.

create table if not exists zone_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  exam text not null check (exam in ('gate-da', 'cat')),
  topic_id text not null check (char_length(topic_id) between 1 and 80),
  -- No 'todo' row: an untouched topic simply has no row, so clearing a tick
  -- deletes rather than updates.
  status text not null check (status in ('studied', 'revised')),
  updated_at timestamptz not null default now(),
  primary key (user_id, exam, topic_id)
);

create table if not exists zone_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam text not null check (exam in ('gate-da', 'cat')),
  title text not null check (char_length(trim(title)) between 1 and 140),
  note text check (note is null or char_length(note) <= 1000),
  due_on date,
  -- Optional attachment in the private `zone-files` bucket, stored under
  -- {user_id}/{exam}/..., which is what the storage policies below check.
  storage_path text unique,
  file_name text check (file_name is null or char_length(file_name) <= 180),
  content_type text check (content_type is null or char_length(content_type) <= 140),
  byte_size bigint check (byte_size is null or byte_size between 0 and 20971520),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists zone_assignments_user_exam_idx on zone_assignments (user_id, exam, created_at desc);

create table if not exists zone_schedule (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exam text not null check (exam in ('gate-da', 'cat')),
  title text not null check (char_length(trim(title)) between 1 and 140),
  kind text not null default 'study' check (kind in ('study', 'revision', 'mock', 'deadline')),
  -- A calendar day, read as local midnight (same reasoning as goals.target_date).
  on_date date not null,
  topic_id text check (topic_id is null or char_length(topic_id) <= 80),
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists zone_schedule_user_exam_idx on zone_schedule (user_id, exam, on_date);

alter table zone_progress enable row level security;
alter table zone_assignments enable row level security;
alter table zone_schedule enable row level security;

create policy "users manage their own zone progress"
  on zone_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Checklist progress is visible to other signed-in users, the same trade the
-- leaderboard makes for solve counts (migration 0004): comparing coverage with
-- friends is the point of syncing it. Assignments and schedules stay private.
create policy "zone progress is readable by authenticated users"
  on zone_progress for select
  to authenticated
  using (true);

create policy "users manage their own zone assignments"
  on zone_assignments for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own zone schedule"
  on zone_schedule for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- One row per person per zone. security_invoker means the view only ever
-- shows what the policies above already allow.
create or replace view zone_board
  with (security_invoker = true)
  as
  select
    zp.exam,
    zp.user_id,
    p.display_name,
    p.avatar_url,
    lp.username as leetcode_username,
    count(*) as studied,
    count(*) filter (where zp.status = 'revised') as revised,
    max(zp.updated_at) as last_active
  from zone_progress zp
  left join profiles p on p.user_id = zp.user_id
  left join leetcode_profiles lp on lp.user_id = zp.user_id
  group by zp.exam, zp.user_id, p.display_name, p.avatar_url, lp.username;

grant select on zone_board to authenticated;

-- Private files: assignment sheets, solutions, scanned notes. 20 MB matches
-- the column check above and the client-side limit.
insert into storage.buckets (id, name, public, file_size_limit)
values ('zone-files', 'zone-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = 20971520;

create policy "users read their own zone files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'zone-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users upload their own zone files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'zone-files' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own zone files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'zone-files' and (storage.foldername(name))[1] = auth.uid()::text);
