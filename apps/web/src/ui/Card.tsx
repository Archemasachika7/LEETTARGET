import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

/** The surface every block of content sits on. Interactive cards get a border
 * highlight and a 1px lift on hover — never a scale transform, which makes a
 * grid of cards visibly jitter as the pointer crosses it. */
export function Card({
  children,
  className,
  interactive,
  as: Tag = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  as?: "div" | "section" | "article" | "form" | "li";
} & Record<string, unknown>) {
  return (
    <Tag
      className={cn(
        "border border-border bg-elevated",
        "transition-[border-color,background-color] duration-fast",
        interactive && "hover:border-border-strong hover:bg-surface",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Section heading with an optional right-aligned action slot. Keeps the
 * label/action rhythm identical everywhere instead of each page inventing its
 * own header row. */
export function SectionHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-1 text-[13px] text-text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** The small uppercase label above a statistic ("WEEKLY PROGRESS"). Its whole
 * job is to sit clearly *below* the value in the hierarchy, so it's small,
 * tracked-out and muted rather than another line of body text. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-[11px] font-medium uppercase tracking-[0.08em] text-text-muted", className)}>
      {children}
    </span>
  );
}
