-- LeetTarget: optional cloud persistence for the GATE/CAT study desk.
--
-- This file is intentionally NOT in supabase/migrations/ because it is meant
-- to be run manually later, once you decide to move local study-desk data to
-- Supabase. Run the whole file in the Supabase SQL Editor, or rename it with a
-- chronological migration prefix and include it in `supabase db push`.
--
-- Expected attachment storage path:
--   <authenticated-user-id>/<study-question-id>/<attachment-id>-<filename>
--
-- The existing product continues to work locally until the web client is wired
-- to this schema. This SQL prepares the secure, owner-scoped cloud layer only.

begin;

create extension if not exists pgcrypto;

create table if not exists public.study_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- GATE and CAT remain distinct from canonical LeetCode targets.
  track text not null check (track in ('gate', 'cat')),
  title text not null check (char_length(trim(title)) between 1 and 140),
  subject text not null check (char_length(trim(subject)) between 1 and 100),
  note text check (note is null or char_length(note) <= 500),
  answer text check (answer is null or char_length(answer) <= 4000),
  method text check (method is null or char_length(method) <= 4000),
  status text not null default 'stuck' check (status in ('stuck', 'revisit', 'cleared')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_questions_user_track_created_idx
  on public.study_questions (user_id, track, created_at desc);

create table if not exists public.study_question_attachments (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.study_questions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null check (char_length(trim(file_name)) between 1 and 180),
  content_type text not null default 'application/octet-stream' check (char_length(content_type) <= 140),
  byte_size bigint not null check (byte_size between 0 and 12582912),
  created_at timestamptz not null default now()
);

create index if not exists study_question_attachments_question_idx
  on public.study_question_attachments (question_id, created_at);

alter table public.study_questions enable row level security;
alter table public.study_question_attachments enable row level security;

-- These rows are deliberately private: they can contain personal notes,
-- answers, screenshots and preparation material.
drop policy if exists "users manage their own study questions" on public.study_questions;
create policy "users manage their own study questions"
  on public.study_questions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users manage their own study attachments" on public.study_question_attachments;
create policy "users manage their own study attachments"
  on public.study_question_attachments for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keeps `updated_at` trustworthy when a learner changes status, answer, note
-- or method. Safe to create once and reuse on this table only.
create or replace function public.set_study_question_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_questions_set_updated_at on public.study_questions;
create trigger study_questions_set_updated_at
  before update on public.study_questions
  for each row
  execute function public.set_study_question_updated_at();

-- Private storage for raw study material. `file_size_limit` matches the
-- client-side 12 MB limit; MIME types are open by design to permit PNG/JPG,
-- PDFs, text files and other preparation formats.
insert into storage.buckets (id, name, public, file_size_limit)
values ('study-materials', 'study-materials', false, 12582912)
on conflict (id) do update
  set public = false,
      file_size_limit = 12582912;

-- The first folder in every object path must be the authenticated user's ID.
-- This lets a learner read/write only their own uploads even if they know
-- another attachment's object path.
drop policy if exists "users view their own study material" on storage.objects;
create policy "users view their own study material"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users upload their own study material" on storage.objects;
create policy "users upload their own study material"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update their own study material" on storage.objects;
create policy "users update their own study material"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own study material" on storage.objects;
create policy "users delete their own study material"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'study-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;

-- After running this file, use the client migration step to copy existing local
-- study-desk entries into `study_questions` and each attachment into the
-- private `study-materials` bucket. Keep the JSON backup import/export control
-- as a user-controlled safety net even after cloud sync is enabled.
