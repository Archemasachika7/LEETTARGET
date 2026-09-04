import { cn } from "../../lib/cn.js";

/** The Waypoint mark: a point plotted above a measured datum line.
 *
 * A waypoint is a fixed position you navigate toward — which is what this
 * product now tracks, whether the destination is an exam date, a placement
 * season or a problem count. The diamond is the marker used for a plotted
 * position on a navigation chart; the ruled line beneath it with its tick
 * marks is the datum that position is measured against. Together they say
 * "a known point, a known distance out" rather than the old target's "aim and
 * hit", which only ever described the LeetCode half of the app.
 *
 * Strokes use `currentColor` for the chassis and the brand token for the
 * marker itself, so the mark inherits its surroundings in both themes without
 * needing variants. */
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

      {/* The plotted marker. */}
      <path
        d="M12 3.25 18.4 9.6 12 15.95 5.6 9.6Z"
        className="stroke-brand"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      {/* Position dot at its centre. */}
      <circle cx="12" cy="9.6" r="1.85" className="fill-brand" />

      {/* Drop line down to the datum — the measured distance. */}
      <path d="M12 15.95V20.4" className="stroke-current opacity-30" strokeWidth="1.5" strokeLinecap="round" />

      {/* Datum line with end ticks, the way a dimension is drawn. */}
      <path
        d="M4.4 20.4h15.2M4.4 18.9v3M19.6 18.9v3"
        className="stroke-current opacity-30"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Mark plus wordmark. "Way" regular, "point" semibold — the emphasis lands
 * on the half of the name that means "a fixed thing you're heading toward". */
export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={markClassName} title="Waypoint" />
      <span className="text-[15px] tracking-tight text-text">
        Way<span className="font-semibold">point</span>
      </span>
    </span>
  );
}
