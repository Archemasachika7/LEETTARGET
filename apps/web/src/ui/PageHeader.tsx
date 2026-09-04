import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { MonoLabel } from "./Chassis.js";

/** The masthead every route opens with.
 *
 * Before this, every page began with the same `text-xl` heading as the cards
 * beneath it, so nothing on screen said "this is the page you are on" —
 * arriving somewhere new looked identical to scrolling past a section. The
 * display scale, the rule underneath and the channel label above it exist to
 * give a route a top edge you can feel.
 *
 * The rule is a full-width hairline rather than a box: this is a masthead, not
 * another panel competing with the instrument below it. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  /** Mono channel label above the title — the track, section or context. */
  eyebrow?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Controls that belong to the page as a whole (a view switcher, a
   * top-level link), kept on the baseline of the title on wide screens. */
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-border pb-6", className)}>
      {/* The action sits on the title's own row, not the header's outer
       * flex box. Aligning it to the bottom of the whole block instead left
       * it floating beside the description, lined up with nothing — and it
       * moved every time the description changed length. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-2xl">
          {eyebrow && <MonoLabel className="block">{eyebrow}</MonoLabel>}
          <h1 className={cn("text-headline font-semibold text-text", eyebrow ? "mt-2.5" : undefined)}>{title}</h1>
        </div>
        {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
      </div>
      {description && (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-text-muted">{description}</p>
      )}
    </header>
  );
}
