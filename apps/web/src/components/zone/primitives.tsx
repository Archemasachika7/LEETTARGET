import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import type { TopicStatus } from "@leettarget/shared";
import { cn } from "../../lib/cn.js";

/** The portfolio's section label:
 *
 *   01  /  SYLLABUS  ──────────────────────────────■   meta
 *
 * The rule and square end node read as a dimension line on a drawing. */
export function SheetLabel({ index, label, meta, id }: { index: string; label: string; meta?: ReactNode; id?: string }) {
  return (
    <div id={id} className="flex scroll-mt-24 items-center gap-3 font-plex text-[11px] uppercase tracking-[0.14em]">
      <span className="text-z-accent">{index}</span>
      <span className="text-z-faint" aria-hidden>
        /
      </span>
      <h2 className="text-z-ink">{label}</h2>
      <span className="h-px flex-1 bg-z-ink/25" aria-hidden />
      <span className="h-2 w-2 shrink-0 bg-z-ink" aria-hidden />
      {meta && <span className="hidden max-w-[45%] truncate normal-case tracking-normal text-z-muted sm:inline">{meta}</span>}
    </div>
  );
}

/** A hairline slot with a square slider, labelled with the current state. */
export function SlideSwitch({ on, onToggle, labels, ariaLabel }: {
  on: boolean;
  onToggle: () => void;
  labels: [string, string];
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={on}
      className="inline-flex items-center gap-2 py-1 font-plex text-[11px] uppercase tracking-[0.14em] text-z-muted transition-colors hover:text-z-ink"
    >
      <span className="relative h-[10px] w-6 rounded-[2px] border border-current" aria-hidden>
        <span
          className={cn(
            "absolute left-px top-px h-1.5 w-1.5 bg-z-accent transition-transform duration-[240ms] ease-[cubic-bezier(0.645,0.045,0.355,1)]",
            on && "translate-x-[14px]"
          )}
        />
      </span>
      <span aria-hidden>{on ? labels[1] : labels[0]}</span>
    </button>
  );
}

/** Three states on one square, echoing the portfolio's nodes: an empty
 * outline (untouched), a small inset square (studied once), solid (revised). */
export function TopicMark({ status }: { status?: TopicStatus }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-[14px] w-[14px] shrink-0 items-center justify-center border transition-colors",
        status === "revised" ? "border-z-accent bg-z-accent" : status === "studied" ? "border-z-accent" : "border-z-ink/35"
      )}
    >
      {status === "studied" && <span className="h-1.5 w-1.5 bg-z-accent" />}
    </span>
  );
}

export function ZButton({
  className,
  variant = "line",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "line" | "solid" | "ghost" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 px-3 font-plex text-[11px] uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        variant === "solid" && "bg-z-ink text-z-bg hover:bg-z-accent",
        variant === "line" && "border border-z-ink/30 text-z-ink hover:border-z-ink",
        variant === "ghost" && "text-z-muted hover:text-z-ink",
        className
      )}
    />
  );
}

const fieldClass =
  "h-9 w-full border border-z-ink/25 bg-z-raised px-2.5 text-sm text-z-ink placeholder:text-z-faint focus:border-z-ink focus:outline-none";

export function ZInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function ZSelect(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, "pr-8", props.className)} />;
}

export function ZLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-plex text-[10px] uppercase tracking-[0.14em] text-z-muted", className)}>{children}</span>;
}

/** A thin bar split into revised (solid) and studied-only (hatched) spans. */
export function CoverageBar({ total, studied, revised, className }: {
  total: number;
  studied: number;
  revised: number;
  className?: string;
}) {
  const pct = (n: number) => (total === 0 ? 0 : (100 * n) / total);
  return (
    <div className={cn("flex h-1.5 w-full overflow-hidden bg-z-ink/10", className)} aria-hidden>
      <div className="h-full bg-z-accent" style={{ width: `${pct(revised)}%` }} />
      <div
        className="h-full"
        style={{
          width: `${pct(studied - revised)}%`,
          background:
            "repeating-linear-gradient(135deg, rgb(var(--z-accent)) 0 2px, rgb(var(--z-accent) / 0.25) 2px 4px)",
        }}
      />
    </div>
  );
}

export function ErrorLine({ children }: { children: ReactNode }) {
  return <p className="font-plex text-[12px] text-z-accent">{children}</p>;
}
