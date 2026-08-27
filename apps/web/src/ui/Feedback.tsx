import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "../lib/cn.js";

/** Every empty state offers a way out. A bare "No problems found." leaves the
 * reader stuck; this always pairs the explanation with the action that fills
 * it in. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center border border-dashed border-border px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 text-text-muted">{icon}</div>}
      <p className="text-sm font-medium text-text">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Shaped like the content it stands in for, so the layout doesn't jump when
 * real data lands — a full-page spinner can't do that. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse bg-border/50", className)} aria-hidden />;
}

export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ErrorNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 border border-danger/30 bg-danger/10 p-2.5 text-[13px] text-danger", className)}>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
