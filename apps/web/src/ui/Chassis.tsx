import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

/** A single bordered enclosure that several panels share.
 *
 * The point is that panels are *cells of one instrument*, not separate cards
 * floating on a background — so the outer border is drawn once here and the
 * internal separations are hairline dividers, never gaps. That's the whole
 * difference between a fascia and a pile of rounded rectangles. */
export function Chassis({
  children,
  className,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "form" | "article";
} & Record<string, unknown>) {
  return (
    <Tag className={cn("border border-border bg-surface", className)} {...rest}>
      {children}
    </Tag>
  );
}

/** One cell inside a Chassis. Dividers are applied by the parent grid
 * (`divide-x divide-y`), so a Panel never draws its own border — otherwise
 * adjacent cells would double up to 2px and the fascia would look assembled
 * rather than machined. */
export function Panel({
  children,
  className,
  mark,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  /** Draws the registration crosshair at the top-left corner. */
  mark?: boolean;
  interactive?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative p-5",
        mark && "crosshair",
        interactive && "transition-colors duration-fast hover:bg-elevated",
        className
      )}
    >
      {children}
    </div>
  );
}

/** The thin strip that runs along the top or bottom of a chassis carrying
 * status text — the readout band on a piece of equipment. Mono, uppercase,
 * quiet. */
export function TelemetryBar({
  left,
  right,
  className,
  position = "top",
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
  position?: "top" | "bottom";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2",
        "font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted",
        position === "top" ? "border-b border-border bg-elevated" : "border-t border-border",
        className
      )}
    >
      <div className="flex items-center gap-4">{left}</div>
      <div className="flex items-center gap-4">{right}</div>
    </div>
  );
}

/** An indexed micro-label: `01 // ACCEPTANCE`. The index gives the eye a
 * reading order across a dense fascia, the way channels are numbered on
 * hardware. */
export function MonoLabel({
  index,
  children,
  className,
}: {
  index?: number | string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted",
        className
      )}
    >
      {index !== undefined && (
        <span className="text-text-muted/60">
          {typeof index === "number" ? String(index).padStart(2, "0") : index} //{" "}
        </span>
      )}
      {children}
    </span>
  );
}

/** A status pip. Square, because a circle reads as a bullet and this is
 * meant to read as an indicator lamp. */
export function StatusDot({ tone = "success", className }: { tone?: "success" | "warning" | "danger" | "muted"; className?: string }) {
  const tones = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    muted: "bg-text-muted",
  };
  return <span aria-hidden className={cn("h-1.5 w-1.5 shrink-0", tones[tone], className)} />;
}
