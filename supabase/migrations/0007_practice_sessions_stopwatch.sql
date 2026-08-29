-- Lets a shared session be an open-ended stopwatch (count up, no end)
-- instead of always being a countdown to a fixed duration — a solo timer
-- got this for free (it's client-only), a shared one needs the column to
-- allow "no duration" too.

alter table practice_sessions alter column duration_seconds drop not null;

alter table practice_sessions drop constraint if exists practice_sessions_duration_seconds_check;
alter table practice_sessions add constraint practice_sessions_duration_seconds_check
  check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 86400));
