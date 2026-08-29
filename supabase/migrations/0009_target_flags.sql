-- Lets a target carry a persistent "flag for review" marker plus a free-text
-- note — e.g. "took AI help, couldn't solve it myself" — so a problem that
-- gave real trouble stays visible after it's eventually solved, not just
-- while it's pending. Independent of `status`: flagging and solving are
-- separate facts about a target, and the flag/note are meant to survive a
-- target moving from pending to done.
alter table targets add column if not exists flagged boolean not null default false;
alter table targets add column if not exists notes text;
