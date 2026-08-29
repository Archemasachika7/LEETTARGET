import { useState } from "react";
import type { Target } from "@leettarget/shared";
import { Check, ExternalLink, Flag, X } from "lucide-react";
import { Badge, Button, Card, Textarea } from "../ui/index.js";
import { cn } from "../lib/cn.js";

interface Props {
  targets: Target[];
  onRemove?: (id: string) => void;
  /** Omit to render read-only — flagging is only wired up where the caller
   * wants it editable (the full target list), not every place a
   * `TargetsTable` shows up (e.g. the dashboard's recent-targets preview). */
  onFlagChange?: (id: string, flagged: boolean, notes: string) => void | Promise<void>;
}

/** Target rows. On mobile these stack rather than shrinking a four-column
 * table into unreadable slivers — the title and status are what matter on a
 * phone, and the source label moves under the title.
 *
 * A flagged target ("took AI help, couldn't solve it myself") gets a second
 * line under its title with the note laid out beside the flag marker, not
 * folded into a tooltip — the point is to actually see it again later, not
 * just know it's there. */
export function TargetsTable({ targets, onRemove, onFlagChange }: Props) {
  if (targets.length === 0) {
    return <p className="text-sm text-text-muted">No targets yet.</p>;
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      <ul>
        {targets.map((target) => (
          <TargetRow key={target.id} target={target} onRemove={onRemove} onFlagChange={onFlagChange} />
        ))}
      </ul>
    </Card>
  );
}

function TargetRow({
  target,
  onRemove,
  onFlagChange,
}: {
  target: Target;
  onRemove?: (id: string) => void;
  onFlagChange?: (id: string, flagged: boolean, notes: string) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(target.notes ?? "");
  const [saving, setSaving] = useState(false);

  const done = target.status === "done";
  const title = target.customTitle ?? target.customUrl ?? target.problemId ?? "Untitled";

  async function save() {
    if (!onFlagChange) return;
    setSaving(true);
    try {
      await onFlagChange(target.id, true, draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function unflag() {
    if (!onFlagChange) return;
    setSaving(true);
    try {
      await onFlagChange(target.id, false, "");
      setDraft("");
      setEditing(false);
    } finally {
      setSaving(false);
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
            onClick={() => setEditing((e) => !e)}
            aria-label={target.flagged ? "Edit flag note" : "Flag for review"}
            aria-pressed={target.flagged}
            className={cn(
              "rounded p-1.5 transition-colors duration-fast",
              target.flagged ? "text-warning hover:bg-warning/10" : "text-text-muted hover:bg-surface hover:text-warning"
            )}
          >
            <Flag className="h-3.5 w-3.5" aria-hidden fill={target.flagged ? "currentColor" : "none"} />
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

      {target.flagged && !editing && (
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2 sm:flex-row sm:items-start sm:gap-4">
          <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-warning">
            <Flag className="h-3 w-3" fill="currentColor" aria-hidden />
            Flagged
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-5 text-text-secondary">
            {target.notes || "No note added."}
          </p>
        </div>
      )}

      {editing && (
        <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="What happened? e.g. took AI help, couldn't fully solve it myself."
          />
          <div className="flex justify-end gap-2">
            {target.flagged && (
              <Button size="sm" variant="ghost" onClick={unflag} loading={saving} loadingText="Removing…">
                Unflag
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={save} loading={saving} loadingText="Saving…">
              Save
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
