import { Link } from "react-router-dom";
import { useStudyDesk } from "../../lib/studyDesk.js";
import { cn } from "../../lib/cn.js";

/** Waypoint's way into the exam zones, sitting next to the track switcher.
 * On the CAT track it opens the CAT Zone; everywhere else, the GATE Zone. */
export function ZoneLink({ className }: { className?: string }) {
  const { mode } = useStudyDesk();
  const zone = mode === "cat" ? "cat" : "gate";
  return (
    <Link
      to={`/zone/${zone}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 border border-border px-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted transition-colors duration-fast hover:border-brand hover:text-brand",
        className
      )}
    >
      {zone === "cat" ? "CAT" : "GATE"} Zone
      <span aria-hidden>↗</span>
    </Link>
  );
}
