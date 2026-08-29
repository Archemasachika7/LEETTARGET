-- Upgrades the plain boolean flag from 0009 to a severity level: a target
-- can be flagged yellow ("needed help, want to revisit") or red ("seriously
-- stuck"), on top of plain "no flag". Deliberately no green level — green
-- already means "done" via `status`, and a flag is about difficulty, not
-- completion, so a third "all good" flag would just collide with that.
alter table targets add column if not exists flag_level text not null default 'none'
  check (flag_level in ('none', 'yellow', 'red'));

-- Carry forward anything already flagged under the old boolean — yellow is
-- the safer default severity for data we can't otherwise distinguish.
update targets set flag_level = 'yellow' where flagged = true and flag_level = 'none';

alter table targets drop column if exists flagged;
