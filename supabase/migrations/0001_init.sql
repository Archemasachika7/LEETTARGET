-- LeetTarget schema. Assumes Supabase Auth (auth.users) is enabled and
-- GitHub is configured as an OAuth provider for it.

create table if not exists problems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  url text not null,
  difficulty text not null default 'Unknown' check (difficulty in ('Easy', 'Medium', 'Hard', 'Unknown')),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists github_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  owner text not null,
  repo text not null,
  branch text not null default 'main',
  path_template text not null default '{difficulty}/{slug}',
  updated_at timestamptz not null default now()
);

create table if not exists targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id uuid references problems (id) on delete set null,
  custom_title text,
  custom_url text,
  slug text,
  source text not null check (source in ('csv', 'manual', 'leetcode')),
  status text not null default 'pending' check (status in ('pending', 'done')),
  created_at timestamptz not null default now()
);

create index if not exists targets_user_id_idx on targets (user_id);
create index if not exists targets_user_slug_idx on targets (user_id, slug);

create table if not exists solved_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  problem_id uuid not null references problems (id) on delete cascade,
  language text,
  github_path text,
  commit_sha text,
  solved_at timestamptz not null default now(),
  unique (user_id, problem_id)
);

create index if not exists solved_problems_user_id_idx on solved_problems (user_id);

create table if not exists csv_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  filename text not null,
  row_count integer not null,
  imported_at timestamptz not null default now()
);

-- Row-level security: every user only ever sees/writes their own rows.
-- `problems` is a shared catalog, readable by anyone signed in and
-- writable by the service role (or, for now, any authenticated user via
-- the extension's upsert-by-slug — safe because it's an append-only,
-- merge-on-conflict catalog with no per-user data in it).

alter table problems enable row level security;
alter table github_links enable row level security;
alter table targets enable row level security;
alter table solved_problems enable row level security;
alter table csv_imports enable row level security;

create policy "problems are readable by authenticated users"
  on problems for select
  to authenticated
  using (true);

create policy "problems are writable by authenticated users"
  on problems for insert
  to authenticated
  with check (true);

create policy "problems are updatable by authenticated users"
  on problems for update
  to authenticated
  using (true);

create policy "users manage their own github_links"
  on github_links for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own targets"
  on targets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own solved_problems"
  on solved_problems for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage their own csv_imports"
  on csv_imports for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
