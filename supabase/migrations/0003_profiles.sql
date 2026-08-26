-- Display profile (avatar + bio) shown in the site header/profile tab.
-- Separate from auth.users (which Supabase owns) and from
-- leetcode_profiles (which is sync plumbing, not user-facing identity).

create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bio text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "users manage their own profiles"
  on profiles for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Avatar images. Public bucket (avatars are meant to be displayed, not
-- access-controlled) with per-user write access enforced by folder
-- convention: each upload is stored as "{user_id}/{filename}", and the
-- policies below only let a user write inside their own folder.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
