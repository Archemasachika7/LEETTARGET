import { cn } from "../../lib/cn.js";

/** The LeetTarget mark: a target whose outer ring is drawn as an incomplete
 * arc (progression toward a goal, not a finished circle) closing around a
 * checkmark at the bullseye (the solve that lands it). Deliberately a
 * geometric target rather than anything resembling a weapon sight — this is a
 * developer training tool, and the motif is precision and progress.
 *
 * Strokes use `currentColor` for the ring and the brand token for the arc, so
 * the mark inherits its surroundings in both themes and needs no variants. */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("h-6 w-6", className)}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {/* Full ring, faint — the whole target. */}
      <circle cx="12" cy="12" r="9.25" className="stroke-current opacity-25" strokeWidth="1.75" />
      {/* Progress arc — ~72% of the ring, gap opening at the top right. */}
      <circle
        cx="12"
        cy="12"
        r="9.25"
        className="stroke-brand"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="41.8 16.3"
        transform="rotate(-105 12 12)"
      />
      {/* Bullseye: the checkmark that lands it. */}
      <path
        d="M8.4 12.15 11 14.75 15.9 9.5"
        className="stroke-brand"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark plus wordmark. "Leet" in regular weight, "Target" in semibold — the
 * emphasis falls on the half of the name that says what the product does. */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} title="LeetTarget" />
      <span className="text-[15px] tracking-tight text-text">
        Leet<span className="font-semibold">Target</span>
      </span>
    </span>
  );
}
