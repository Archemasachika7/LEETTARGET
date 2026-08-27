import { useEffect, useRef, useState } from "react";
import { cn } from "../lib/cn.js";

/** Counts from the previous value to the next one instead of snapping, so a
 * progress change reads as movement rather than a repaint. Honours reduced
 * motion by jumping straight to the target. */
export function AnimatedNumber({
  value,
  className,
  duration = 700,
}: {
  value: number;
  className?: string;
  duration?: number;
}) {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = value;
    if (from === value) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Same ease-out curve as the CSS motion tokens, so a number counting up
      // and the bar beside it decelerate together.
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={cn("tnum", className)}>{shown}</span>;
}

export function ProgressBar({
  value,
  max,
  className,
  tone = "brand",
  label,
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "brand" | "success";
  label?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("h-1 w-full overflow-hidden bg-border/60", className)}
    >
      <div
        className={cn(
          "h-full transition-[width] duration-progress ease-smooth",
          tone === "success" ? "bg-success" : "bg-brand"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** A progress meter drawn as discrete ticks rather than a continuous fill —
 * the segmented LED bar on a piece of equipment. Reads as a *count* out of a
 * fixed scale, which is what these values are, and gives the eye something to
 * measure against that a smooth bar doesn't. */
export function SegmentBar({
  value,
  max,
  segments = 28,
  className,
  tone = "brand",
  label,
}: {
  value: number;
  max: number;
  segments?: number;
  className?: string;
  tone?: "brand" | "success" | "warning";
  label?: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  const lit = Math.round(ratio * segments);
  const litTone =
    tone === "success" ? "bg-success" : tone === "warning" ? "bg-warning" : "bg-brand";

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn("flex h-2 w-full gap-px", className)}
    >
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-full flex-1 transition-colors duration-progress",
            i < lit ? litTone : "bg-border/70"
          )}
        />
      ))}
    </div>
  );
}

/** Circular counterpart to ProgressBar — used where progress *is* the
 * headline (today's target) rather than a supporting detail. Pure SVG +
 * stroke-dashoffset, no charting dependency. */
export function ProgressRing({
  value,
  max,
  size = 72,
  strokeWidth = 6,
  children,
  className,
  label,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  className?: string;
  label?: string;
}) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const complete = pct >= 1;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
      >
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={strokeWidth} className="stroke-surface" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className={cn(
            "transition-[stroke-dashoffset] duration-progress ease-smooth",
            complete ? "stroke-success" : "stroke-brand"
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</div>
    </div>
  );
}

/** Label above, value below — the two-line stat used across the dashboard.
 * The value is monospace and tabular so a row of stats stays aligned. */
export function Stat({
  label,
  value,
  sub,
  className,
  animate,
}: {
  label: string;
  value: string | number;
  sub?: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-text">
        {animate && typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[12px] text-text-muted">{sub}</div>}
    </div>
  );
}
