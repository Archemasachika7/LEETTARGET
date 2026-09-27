import type { BoardRow } from "../../lib/zone/api.js";
import { CoverageBar } from "./primitives.js";
import { cn } from "../../lib/cn.js";

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function PeerBoard({ rows, total, userId, loading }: {
  rows: BoardRow[];
  total: number;
  userId: string;
  loading: boolean;
}) {
  if (loading) return <p className="font-plex text-sm text-z-muted">Loading…</p>;
  if (rows.length === 0) {
    return (
      <p className="max-w-lg text-[15px] leading-6 text-z-muted">
        Nobody has ticked a topic here yet. Once you do, you'll show up in this list for anyone else in this zone.
      </p>
    );
  }
  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => {
        const you = row.userId === userId;
        const name = row.displayName || row.leetcodeUsername || "Unnamed learner";
        return (
          <li
            key={row.userId}
            className={cn(
              "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-z-ink/10 py-3 sm:grid-cols-[28px_minmax(0,1fr)_200px_auto]",
              you && "bg-z-accent/[0.06]"
            )}
          >
            <span className="pl-1 font-plex text-[12px] tabular-nums text-z-faint">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0 truncate text-[15px] text-z-ink">
              {name}
              {you && <span className="ml-2 font-plex text-[10px] uppercase tracking-[0.12em] text-z-accent">you</span>}
              <span className="ml-3 hidden font-plex text-[11px] text-z-faint sm:inline">{ago(row.lastActive)}</span>
            </span>
            <CoverageBar total={total} studied={row.studied} revised={row.revised} className="col-span-2 col-start-2 row-start-2 sm:col-span-1 sm:col-start-auto sm:row-start-auto" />
            <span className="pr-1 text-right font-plex text-[12px] tabular-nums text-z-muted">
              <span className="text-z-ink">{row.studied}</span>/{total}
              <span className="ml-2 text-z-faint">{row.revised} rev.</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
