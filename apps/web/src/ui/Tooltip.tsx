import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

/** CSS-only tooltip — shown on hover *and* keyboard focus, so icon-only
 * controls stay discoverable without a pointer. The label is also the
 * element's accessible name via `aria-label` on the trigger, so screen
 * readers don't depend on the visual tooltip at all.
 *
 * Deliberately not a positioning library: these only ever appear below a
 * small control in the header, where a fixed offset is enough. */
export function Tooltip({
  label,
  children,
  className,
  side = "bottom",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  side?: "bottom" | "top";
}) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap border border-border bg-elevated px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-text-secondary opacity-0 transition-opacity duration-fast",
          "group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "bottom" ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]"
        )}
      >
        {label}
      </span>
    </span>
  );
}
