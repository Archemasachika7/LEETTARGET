-- Doubts forum: a shared archive of questions and their solutions, grouped
-- into subjects (PDSA, GATE, CAT, or anything else a user names) and
-- optionally tied to a specific LeetCode problem. Subject creation is open
-- rather than curated — anyone can start one — so the slug is normalised on
-- write (lowercased, punctuation stripped) and unique, to stop "PDSA",
-- "pdsa" and "P.D.S.A." fragmenting into three separate subjects.

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Every doubt author is implicitly a member (see the trigger below), and
-- membership is what "anyone in that subject" (this feature's visibility
-- model) actually checks — join a subject once, see every doubt in it from
-- then on.
create table if not exists subject_members (
  subject_id uuid not null references subjects (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (subject_id, user_id)
);

create table if not exists doubts (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  -- Optional link to a canonical LeetCode problem, so a doubt can be
  -- surfaced from that problem's own context (Practice/Roadmap) as well as
  -- from its subject's feed. Doubts aren't only about LeetCode, so this is
  -- nullable rather than the join key.
  problem_id uuid references problems (id) on delete set null,
  title text not null,
  question_text text,
  solution_text text,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- No check requiring question_text/problem_id: a doubt can legitimately
  -- carry only an uploaded question screenshot, and doubt_images is a
  -- separate table inserted after this row — a same-row CHECK can't see it.
  -- The client (NewDoubtForm) enforces "title + at least one of text /
  -- image / problem link" instead.
);

create index if not exists doubts_subject_id_idx on doubts (subject_id);
create index if not exists doubts_problem_id_idx on doubts (problem_id);

-- `kind` is what drives the reveal panel client-side: question images
-- render immediately, solution images stay behind the "review solution"
-- toggle.
create table if not exists doubt_images (
  id uuid primary key default gen_random_uuid(),
  doubt_id uuid not null references doubts (id) on delete cascade,
  uploaded_by uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('question', 'solution')),
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists doubt_images_doubt_id_idx on doubt_images (doubt_id);

-- Posting a doubt implies membership — nobody should have to join, then
-- separately post, to end up visible in their own subject's feed.
create or replace function handle_new_doubt()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into subject_members (subject_id, user_id)
  values (new.subject_id, new.author_id)
  on conflict (subject_id, user_id) do nothing;
  return new;
end;
$$;

create trigger doubts_author_joins_subject
  after insert on doubts
  for each row execute function handle_new_doubt();

alter table subjects enable row level security;
alter table subject_members enable row level security;
alter table doubts enable row level security;
alter table doubt_images enable row level security;

-- Subjects themselves are a public directory (you need to see a subject to
-- decide whether to join it); creation is open to any signed-in user.
create policy "subjects are readable by authenticated users"
  on subjects for select
  to authenticated
  using (true);

create policy "users create subjects"
  on subjects for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Membership rows are how a user tracks "my subjects" — readable by anyone
-- (so member counts / directory listings work), but a user only ever
-- inserts/deletes their own row, and the subject's creator can also remove
-- a member (the minimum moderation lever short of touching content).
create policy "subject_members are readable by authenticated users"
  on subject_members for select
  to authenticated
  using (true);

create policy "users join subjects themselves"
  on subject_members for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users leave subjects, or the subject creator removes a member"
  on subject_members for delete
  to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() in (select created_by from subjects where id = subject_id)
  );

-- Doubts are visible only to members of that subject — "anyone in that
-- subject" per the product decision, not a fully open forum.
create policy "doubts are readable by subject members"
  on doubts for select
  to authenticated
  using (auth.uid() in (select user_id from subject_members where subject_id = doubts.subject_id));

-- Not gated on prior membership: subjects are open-join anyway (anyone can
-- join freely), so requiring it here would just be friction — and it would
-- actually be a bug, since the auto-join trigger above only runs *after*
-- this insert succeeds, so a first-time poster would never satisfy a
-- membership check evaluated at insert time. Posting a doubt is itself how
-- you join, same as the trigger already assumes.
create policy "authenticated users post doubts as themselves"
  on doubts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "authors edit their own doubts"
  on doubts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "authors or the subject creator delete a doubt"
  on doubts for delete
  to authenticated
  using (
    auth.uid() = author_id
    or auth.uid() in (select created_by from subjects where id = doubts.subject_id)
  );

-- Images inherit the same subject-membership visibility as their doubt.
create policy "doubt_images are readable by subject members"
  on doubt_images for select
  to authenticated
  using (
    auth.uid() in (
      select sm.user_id
      from doubts d
      join subject_members sm on sm.subject_id = d.subject_id
      where d.id = doubt_images.doubt_id
    )
  );

create policy "subject members attach images to a doubt"
  on doubt_images for insert
  to authenticated
  with check (
    auth.uid() = uploaded_by
    and auth.uid() in (
      select sm.user_id
      from doubts d
      join subject_members sm on sm.subject_id = d.subject_id
      where d.id = doubt_images.doubt_id
    )
  );

create policy "uploaders or the doubt's author delete an image"
  on doubt_images for delete
  to authenticated
  using (
    auth.uid() = uploaded_by
    or auth.uid() in (select author_id from doubts where id = doubt_images.doubt_id)
  );

-- Private bucket, unlike `avatars` — a doubt screenshot can carry a name, an
-- email, or paid course material, and a public bucket's URL works for
-- anyone on the internet, not just subject members. Files are fetched via
-- signed URLs, scoped by the same subject-membership check as the row
-- above, keyed off the storage path's own {subject_id}/{doubt_id}/{file}
-- layout via storage.foldername.
insert into storage.buckets (id, name, public)
values ('doubt-images', 'doubt-images', false)
on conflict (id) do nothing;

create policy "subject members read doubt-images objects"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'doubt-images'
    and (storage.foldername(name))[1]::uuid in (select subject_id from subject_members where user_id = auth.uid())
  );

create policy "subject members upload doubt-images objects"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'doubt-images'
    and (storage.foldername(name))[1]::uuid in (select subject_id from subject_members where user_id = auth.uid())
  );

create policy "uploaders delete their own doubt-images objects"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'doubt-images' and owner = auth.uid());
