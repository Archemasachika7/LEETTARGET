import type { Target } from "@leettarget/shared";
import { Check, ExternalLink, X } from "lucide-react";
import { Badge, Card } from "../ui/index.js";

interface Props {
  targets: Target[];
  onRemove?: (id: string) => void;
}

/** Target rows. On mobile these stack rather than shrinking a four-column
 * table into unreadable slivers — the title and status are what matter on a
 * phone, and the source label moves under the title. */
export function TargetsTable({ targets, onRemove }: Props) {
  if (targets.length === 0) {
    return <p className="text-sm text-text-muted">No targets yet.</p>;
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      <ul>
        {targets.map((target) => {
          const done = target.status === "done";
          const title = target.customTitle ?? target.customUrl ?? target.problemId ?? "Untitled";
          return (
            <li
              key={target.id}
              className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-0 transition-colors duration-fast hover:bg-surface"
            >
              <span
                className={
                  done
                    ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
                    : "h-5 w-5 shrink-0 rounded-full border border-border-strong"
                }
                aria-hidden
              >
                {done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>

              <div className="min-w-0 flex-1">
                {target.customUrl ? (
                  <a
                    href={target.customUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 text-sm text-text transition-colors duration-fast hover:text-brand"
                  >
                    <span className="truncate">{title}</span>
                    <ExternalLink
                      className="h-3 w-3 shrink-0 text-text-muted opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                      aria-hidden
                    />
                  </a>
                ) : (
                  <span className="block truncate text-sm text-text">{title}</span>
                )}
                <span className="mt-0.5 block text-[11px] uppercase tracking-wide text-text-muted sm:hidden">
                  {target.source}
                </span>
              </div>

              <span className="hidden text-[11px] uppercase tracking-wide text-text-muted sm:block">
                {target.source}
              </span>

              <Badge tone={done ? "success" : "neutral"}>{done ? "Done" : "Pending"}</Badge>

              {onRemove && (
                <button
                  onClick={() => onRemove(target.id)}
                  aria-label={`Remove ${title}`}
                  className="rounded p-1.5 text-text-muted transition-colors duration-fast hover:bg-danger/10 hover:text-danger"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
