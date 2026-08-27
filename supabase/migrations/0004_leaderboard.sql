-- Leaderboard: lets signed-in users see each other's progress and target
-- lists ("choose our competitions based on what we target and check
-- progress of each other"). Public by default — every signed-in user is
-- visible, matching how LeetCode's own profiles work; there's no opt-out
-- toggle, by design, per the product decision for this feature.
--
-- Mechanically this is additive SELECT policies layered on top of each
-- table's existing "for all" owner-only policy — Postgres OR's multiple
-- permissive policies together for the same command, so these only ever
-- widen SELECT. Every INSERT/UPDATE/DELETE still goes through the
-- original owner-only "for all" policy untouched, so writing someone
-- else's data is still impossible.

alter table profiles add column if not exists display_name text;

create policy "profiles are readable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "targets are readable by authenticated users"
  on targets for select
  to authenticated
  using (true);

create policy "solved_problems are readable by authenticated users"
  on solved_problems for select
  to authenticated
  using (true);

create policy "leetcode_profiles are readable by authenticated users"
  on leetcode_profiles for select
  to authenticated
  using (true);

-- One row per user who has at least one target or solve — a user who's
-- never done either has nothing to show on a leaderboard anyway.
-- `security_invoker` makes the view run with the querying user's own
-- permissions rather than the view owner's, so it only ever surfaces what
-- the policies above already allow rather than silently bypassing RLS.
create or replace view leaderboard
  with (security_invoker = true)
  as
  select
    u.user_id,
    p.display_name,
    p.avatar_url,
    p.bio,
    lp.username as leetcode_username,
    coalesce(s.solved_count, 0) as solved_count,
    coalesce(t.target_count, 0) as target_count,
    coalesce(t.done_count, 0) as done_count
  from (
    select user_id from targets
    union
    select user_id from solved_problems
  ) u
  left join profiles p on p.user_id = u.user_id
  left join leetcode_profiles lp on lp.user_id = u.user_id
  left join (
    select user_id, count(*) as solved_count
    from solved_problems
    group by user_id
  ) s on s.user_id = u.user_id
  left join (
    select
      user_id,
      count(*) as target_count,
      count(*) filter (where status = 'done') as done_count
    from targets
    group by user_id
  ) t on t.user_id = u.user_id;

grant select on leaderboard to authenticated;
