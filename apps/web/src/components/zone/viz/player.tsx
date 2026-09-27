import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ZButton } from "../primitives.js";
import { cn } from "../../../lib/cn.js";

const SPEEDS = [
  { label: "0.5×", ms: 1100 },
  { label: "1×", ms: 600 },
  { label: "2×", ms: 280 },
  { label: "4×", ms: 110 },
];

/** Replays a precomputed trace. `resetKey` restarts it when the input or the
 * algorithm changes, so the stage never shows step 40 of a trace that no
 * longer exists. */
export function usePlayer(length: number, resetKey: string) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [resetKey]);

  useEffect(() => {
    if (!playing) return;
    if (index >= length - 1) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setIndex((i) => Math.min(i + 1, length - 1)), SPEEDS[speed].ms);
    return () => window.clearTimeout(id);
  }, [playing, index, length, speed]);

  const step = useCallback((delta: number) => {
    setPlaying(false);
    setIndex((i) => Math.max(0, Math.min(length - 1, i + delta)));
  }, [length]);

  const togglePlay = useCallback(() => {
    // Pressing play at the end starts over rather than doing nothing.
    setIndex((i) => (i >= length - 1 ? 0 : i));
    setPlaying((p) => !p);
  }, [length]);

  return { index: Math.min(index, Math.max(0, length - 1)), playing, speed, setSpeed, step, togglePlay, setIndex };
}

export type Player = ReturnType<typeof usePlayer>;

export function PlayerControls({ player, length, note, children }: {
  player: Player;
  length: number;
  note: string;
  children?: ReactNode;
}) {
  const { index, playing, speed, setSpeed, step, togglePlay, setIndex } = player;
  return (
    <div
      className="flex flex-col gap-3"
      onKeyDown={(e) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
        if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
        if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
      }}
    >
      <p className="min-h-[40px] border-l-2 border-z-accent pl-3 font-plex text-[13px] leading-5 text-z-ink" aria-live="polite">
        {note}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ZButton onClick={() => step(-1)} disabled={index === 0} aria-label="Previous step">←</ZButton>
        <ZButton variant="solid" onClick={togglePlay} className="w-20">{playing ? "Pause" : index >= length - 1 ? "Replay" : "Play"}</ZButton>
        <ZButton onClick={() => step(1)} disabled={index >= length - 1} aria-label="Next step">→</ZButton>
        <input
          type="range"
          min={0}
          max={Math.max(0, length - 1)}
          value={index}
          onChange={(e) => setIndex(Number(e.target.value))}
          aria-label="Scrub through the steps"
          className="mx-1 min-w-[120px] flex-1 accent-[rgb(var(--z-accent))]"
        />
        <span className="font-plex text-[11px] tabular-nums text-z-muted">
          {index + 1}/{length}
        </span>
        <div className="flex border border-z-ink/25" role="group" aria-label="Speed">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setSpeed(i)}
              aria-pressed={speed === i}
              className={cn(
                "h-9 px-2 font-plex text-[11px] transition-colors",
                speed === i ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Parses "5, 3, 8" into numbers, dropping anything that isn't one. */
export function parseNumbers(text: string, max = 16): number[] {
  return text
    .split(/[\s,]+/)
    .map((x) => Number(x))
    .filter((x) => Number.isFinite(x) && Math.abs(x) < 1000)
    .map((x) => Math.round(x))
    .slice(0, max);
}

export function randomNumbers(n: number, lo = 1, hi = 99): number[] {
  return Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="font-plex text-[10px] uppercase tracking-[0.14em] text-z-faint">{label}</span>
      <span className="font-plex text-lg tabular-nums text-z-ink">{value}</span>
    </div>
  );
}
