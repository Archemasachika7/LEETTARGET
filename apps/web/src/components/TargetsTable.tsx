import { useState } from "react";
import type { Target, TargetFlagLevel } from "@leettarget/shared";
import { Check, ExternalLink, Flag, RotateCcw, X } from "lucide-react";
import { Badge, Button, Card, Textarea } from "../ui/index.js";
import { cn } from "../lib/cn.js";

interface Props {
  targets: Target[];
  onRemove?: (id: string) => void;
  /** Omit to render read-only — flagging is only wired up where the caller
   * wants it editable (the full target list), not every place a
   * `TargetsTable` shows up (e.g. the dashboard's recent-targets preview). */
  onFlagChange?: (id: string, flagLevel: TargetFlagLevel, notes: string) => void | Promise<void>;
  /** Sends a flagged target back to "pending" for another attempt. Only
   * meaningful alongside `onFlagChange`. */
  onRepeat?: (id: string) => void | Promise<void>;
}

const LEVEL_LABEL: Record<Exclude<TargetFlagLevel, "none">, string> = {
  yellow: "Yellow flag",
  red: "Red flag",
};

const LEVEL_TONE: Record<Exclude<TargetFlagLevel, "none">, "warning" | "danger"> = {
  yellow: "warning",
  red: "danger",
};

/** Target rows. On mobile these stack rather than shrinking a four-column
 * table into unreadable slivers — the title and status are what matter on a
 * phone, and the source label moves under the title.
 *
 * A flagged target ("took AI help, couldn't solve it myself") gets a second
 * line under its title with the note laid out beside the flag marker, not
 * folded into a tooltip — the point is to actually see it again later, not
 * just know it's there. Two severities only — yellow for "needed a hand",
 * red for "seriously stuck" — deliberately no green tier, since green
 * already means "done" via status. */
export function TargetsTable({ targets, onRemove, onFlagChange, onRepeat }: Props) {
  if (targets.length === 0) {
    return <p className="text-sm text-text-muted">No targets yet.</p>;
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      <ul>
        {targets.map((target) => (
          <TargetRow key={target.id} target={target} onRemove={onRemove} onFlagChange={onFlagChange} onRepeat={onRepeat} />
        ))}
      </ul>
    </Card>
  );
}

function TargetRow({
  target,
  onRemove,
  onFlagChange,
  onRepeat,
}: {
  target: Target;
  onRemove?: (id: string) => void;
  onFlagChange?: (id: string, flagLevel: TargetFlagLevel, notes: string) => void | Promise<void>;
  onRepeat?: (id: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState<TargetFlagLevel | null>(null);
  const [draft, setDraft] = useState(target.notes ?? "");
  const [busy, setBusy] = useState(false);

  const done = target.status === "done";
  const flagged = target.flagLevel !== "none";
  const title = target.customTitle ?? target.customUrl ?? target.problemId ?? "Untitled";

  function startEditing() {
    setDraft(target.notes ?? "");
    setEditing(target.flagLevel === "none" ? "yellow" : target.flagLevel);
  }

  async function save() {
    if (!onFlagChange || !editing) return;
    setBusy(true);
    try {
      await onFlagChange(target.id, editing, draft.trim());
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function clearFlag() {
    if (!onFlagChange) return;
    setBusy(true);
    try {
      await onFlagChange(target.id, "none", "");
      setDraft("");
      setEditing(null);
    } finally {
      setBusy(false);
    }
  }

  async function repeat() {
    if (!onRepeat) return;
    setBusy(true);
    try {
      await onRepeat(target.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="border-b border-border px-3 py-2.5 last:border-0 transition-colors duration-fast hover:bg-surface">
      <div className="flex items-center gap-3">
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

        {onFlagChange && (
          <button
            onClick={() => (editing ? setEditing(null) : startEditing())}
            aria-label={flagged ? "Edit flag" : "Flag for review"}
            aria-pressed={flagged}
            className={cn(
              "rounded p-1.5 transition-colors duration-fast",
              target.flagLevel === "red"
                ? "text-danger hover:bg-danger/10"
                : target.flagLevel === "yellow"
                  ? "text-warning hover:bg-warning/10"
                  : "text-text-muted hover:bg-surface hover:text-warning"
            )}
          >
            <Flag className="h-3.5 w-3.5" aria-hidden fill={flagged ? "currentColor" : "none"} />
          </button>
        )}

        {onRemove && (
          <button
            onClick={() => onRemove(target.id)}
            aria-label={`Remove ${title}`}
            className="rounded p-1.5 text-text-muted transition-colors duration-fast hover:bg-danger/10 hover:text-danger"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>

      {flagged && !editing && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
            <Badge tone={LEVEL_TONE[target.flagLevel as Exclude<TargetFlagLevel, "none">]} className="shrink-0">
              <Flag className="h-3 w-3" fill="currentColor" aria-hidden />
              {LEVEL_LABEL[target.flagLevel as Exclude<TargetFlagLevel, "none">]}
            </Badge>
            <p className="min-w-0 flex-1 text-[13px] leading-5 text-text-secondary">
              {target.notes || "No note added."}
            </p>
          </div>
          {onFlagChange && (
            <div className="flex shrink-0 gap-2">
              {onRepeat && (
                <Button size="sm" variant="ghost" onClick={repeat} loading={busy} loadingText="Requeuing…">
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Repeat
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={clearFlag} loading={busy} loadingText="Clearing…">
                Okay
              </Button>
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing("yellow")}
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-[12px] font-medium transition-colors duration-fast",
                editing === "yellow" ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-text-muted hover:text-text"
              )}
            >
              <Flag className="h-3 w-3" fill={editing === "yellow" ? "currentColor" : "none"} aria-hidden />
              Yellow
            </button>
            <button
              type="button"
              onClick={() => setEditing("red")}
              className={cn(
                "flex items-center gap-1.5 border px-2.5 py-1 text-[12px] font-medium transition-colors duration-fast",
                editing === "red" ? "border-danger/40 bg-danger/10 text-danger" : "border-border text-text-muted hover:text-text"
              )}
            >
              <Flag className="h-3 w-3" fill={editing === "red" ? "currentColor" : "none"} aria-hidden />
              Red
            </button>
          </div>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="What happened? e.g. took AI help, couldn't fully solve it myself."
          />
          <div className="flex justify-end gap-2">
            {flagged && (
              <Button size="sm" variant="ghost" onClick={clearFlag} loading={busy} loadingText="Clearing…">
                Okay, clear it
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={busy} loadingText="Saving…">
              Save
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
