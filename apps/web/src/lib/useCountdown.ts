import { useEffect, useState } from "react";

export interface Countdown {
  remainingSeconds: number;
  done: boolean;
}

/** Ticks once a second, deriving remaining time from a fixed start point
 * each tick rather than counting a local number down — so a shared
 * session's countdown matches everyone else's regardless of when each
 * client's tab became active, and a solo timer doesn't drift from a
 * throttled background tab (it recomputes from wall-clock time every
 * tick, it doesn't accumulate error by subtracting 1 each interval). */
export function useCountdown(startedAt: string | undefined, durationSeconds: number | undefined): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  if (!startedAt || !durationSeconds) return { remainingSeconds: 0, done: true };

  const elapsed = (now - new Date(startedAt).getTime()) / 1000;
  const remainingSeconds = Math.max(0, Math.round(durationSeconds - elapsed));
  return { remainingSeconds, done: remainingSeconds <= 0 };
}

export function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
