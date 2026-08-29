-- Backs the public "Sync everyone" button (Leaderboard) with a cooldown so
-- repeated clicks from different users can't hammer LeetCode's API or the
-- database with overlapping full imports. A single row, written only by the
-- sync-all-profiles edge function (service role, bypasses RLS) — clients
-- only ever read it, to show "last synced X ago".
create table if not exists sync_state (
  id boolean primary key default true,
  constraint sync_state_singleton check (id),
  last_synced_at timestamptz,
  last_summary text
);

insert into sync_state (id) values (true) on conflict (id) do nothing;

alter table sync_state enable row level security;

create policy "sync_state is readable by authenticated users"
  on sync_state for select
  to authenticated
  using (true);
