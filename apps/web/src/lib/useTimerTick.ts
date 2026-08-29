import { useEffect, useState } from "react";

export interface TimerTick {
  /** Seconds since `startedAt`. Always present. */
  elapsedSeconds: number;
  /** Only meaningful for a countdown (`durationSeconds` given) — seconds
   * left, floored at 0. Equal to `elapsedSeconds` for a stopwatch. */
  remainingSeconds: number;
  /** A stopwatch is never "done" — it just keeps counting up until you
   * stop it, so this is always false when `durationSeconds` is absent. */
  done: boolean;
  isStopwatch: boolean;
}

/** Ticks once a second, deriving elapsed/remaining time from a fixed start
 * point each tick rather than counting a local number up or down — so a
 * shared session matches everyone else's regardless of when each client's
 * tab became active, and nothing drifts from a throttled background tab
 * (it recomputes from wall-clock time every tick, it doesn't accumulate
 * error by adding/subtracting 1 each interval). */
export function useTimerTick(startedAt: string | undefined, durationSeconds: number | undefined): TimerTick {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt) return { elapsedSeconds: 0, remainingSeconds: 0, done: true, isStopwatch: false };

  const elapsedSeconds = Math.max(0, Math.round((now - new Date(startedAt).getTime()) / 1000));
  const isStopwatch = !durationSeconds;
  if (isStopwatch) return { elapsedSeconds, remainingSeconds: elapsedSeconds, done: false, isStopwatch: true };

  const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  return { elapsedSeconds, remainingSeconds, done: remainingSeconds <= 0, isStopwatch: false };
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
