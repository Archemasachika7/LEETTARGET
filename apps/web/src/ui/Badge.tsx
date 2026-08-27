import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface text-text-secondary border-border",
  brand: "bg-brand/10 text-brand border-brand/25",
  success: "bg-success/10 text-success border-success/25",
  warning: "bg-warning/10 text-warning border-warning/25",
  danger: "bg-danger/10 text-danger border-danger/25",
  info: "bg-info/10 text-info border-info/25",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

/** Difficulty reads as an ordinal tier, so it uses the single-hue ramp from
 * the tokens (light → dark as difficulty rises) rather than the semantic
 * status colors — green/red here would wrongly imply "good/bad". */
const DIFFICULTY_DOT: Record<Difficulty, string> = {
  Easy: "bg-easy",
  Medium: "bg-medium",
  Hard: "bg-hard",
  Unknown: "bg-unknown",
};

export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[12px] text-text-secondary", className)}>
      <span className={cn("h-2 w-2 shrink-0", DIFFICULTY_DOT[difficulty])} aria-hidden />
      {difficulty}
    </span>
  );
}
