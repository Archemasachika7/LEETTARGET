import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { daysUntil, type ZoneExam } from "@leettarget/shared";
import {
  MAX_FILE_BYTES,
  assignmentFileUrl,
  createAssignment,
  deleteAssignment,
  listAssignments,
  setAssignmentDone,
  type Assignment,
} from "../../lib/zone/api.js";
import { getErrorMessage } from "../../lib/errors.js";
import { ErrorLine, ZButton, ZInput, ZLabel } from "./primitives.js";
import { cn } from "../../lib/cn.js";

function size(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function due(date?: string): { text: string; late: boolean } | undefined {
  if (!date) return undefined;
  const d = daysUntil(date);
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} late`, late: true };
  if (d === 0) return { text: "Due today", late: false };
  if (d === 1) return { text: "Due tomorrow", late: false };
  return { text: `Due in ${d} days`, late: false };
}

export function AssignmentsPanel({ userId, exam }: { userId: string; exam: ZoneExam }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [title, setTitle] = useState("");
  const [dueOn, setDueOn] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File>();
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    listAssignments(userId, exam)
      .then((rows) => { setItems(rows); setError(undefined); })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId, exam]);

  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || file?.name.replace(/\.[^.]+$/, "") || "";
    if (!finalTitle) return;
    if (file && file.size > MAX_FILE_BYTES) {
      setError("That file is over 20 MB.");
      return;
    }
    setSaving(true);
    try {
      const created = await createAssignment({ userId, exam, title: finalTitle, note, dueOn: dueOn || undefined, file });
      setItems((current) => [created, ...current]);
      setTitle("");
      setDueOn("");
      setNote("");
      setFile(undefined);
      if (fileRef.current) fileRef.current.value = "";
      setError(undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function open(item: Assignment) {
    if (!item.storagePath) return;
    // Open the tab synchronously so pop-up blockers see a user gesture, then
    // point it at the signed URL once it arrives.
    // ("noopener" would make window.open return null, so cut the link by hand.)
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const url = await assignmentFileUrl(item.storagePath);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (err) {
      tab?.close();
      setError(getErrorMessage(err));
    }
  }

  async function toggle(item: Assignment) {
    const done = !item.doneAt;
    setItems((current) => current.map((x) => (x.id === item.id ? { ...x, doneAt: done ? new Date().toISOString() : undefined } : x)));
    try {
      await setAssignmentDone(item.id, done);
    } catch (err) {
      setError(getErrorMessage(err));
      load();
    }
  }

  async function remove(item: Assignment) {
    if (!window.confirm(`Delete "${item.title}"${item.fileName ? " and its file" : ""}?`)) return;
    try {
      await deleteAssignment(item);
      setItems((current) => current.filter((x) => x.id !== item.id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const pending = items.filter((i) => !i.doneAt).sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
  const done = items.filter((i) => i.doneAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <form onSubmit={add} className="flex flex-col gap-3 self-start border border-z-ink/20 bg-z-raised p-4">
        <ZLabel>Add an assignment</ZLabel>
        <label
          className={cn(
            "flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1 border border-dashed px-3 py-4 text-center transition-colors",
            file ? "border-z-accent" : "border-z-ink/30 hover:border-z-ink"
          )}
        >
          <input
            ref={fileRef}
            type="file"
            className="sr-only"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.ipynb,.py,.docx,.xlsx,.csv,.zip"
            onChange={(e) => setFile(e.target.files?.[0])}
          />
          <span className="font-plex text-[12px] text-z-ink">{file ? file.name : "Attach a file"}</span>
          <span className="font-plex text-[10px] text-z-faint">{file ? size(file.size) : "PDF, image, notebook or doc · up to 20 MB · optional"}</span>
        </label>
        <label className="flex flex-col gap-1">
          <ZLabel>Title</ZLabel>
          <ZInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={file ? file.name.replace(/\.[^.]+$/, "") : "e.g. Week 4 problem set"} maxLength={140} />
        </label>
        <label className="flex flex-col gap-1">
          <ZLabel>Due (optional)</ZLabel>
          <ZInput type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">
          <ZLabel>Note (optional)</ZLabel>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            rows={2}
            className="w-full border border-z-ink/25 bg-z-raised px-2.5 py-2 text-sm text-z-ink placeholder:text-z-faint focus:border-z-ink focus:outline-none"
            placeholder="Which questions, who set it"
          />
        </label>
        <ZButton type="submit" variant="solid" disabled={saving || (!title.trim() && !file)}>
          {saving ? (file ? "Uploading…" : "Saving…") : "Add"}
        </ZButton>
        {error && <ErrorLine>{error}</ErrorLine>}
      </form>

      <div>
        {loading ? (
          <p className="font-plex text-sm text-z-muted">Loading…</p>
        ) : items.length === 0 ? (
          <p className="max-w-md text-[15px] leading-6 text-z-muted">
            No assignments yet. Upload a problem sheet or a set of notes; the file stays private to you.
          </p>
        ) : (
          <ul className="flex flex-col">
            {[...pending, ...done].map((item) => {
              const d = due(item.dueOn);
              return (
                <li key={item.id} className="group flex items-start gap-4 border-b border-z-ink/10 py-3">
                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    aria-label={item.doneAt ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
                    className={cn(
                      "mt-1 h-[14px] w-[14px] shrink-0 border transition-colors",
                      item.doneAt ? "border-z-accent bg-z-accent" : "border-z-ink/40 hover:border-z-accent"
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[15px] text-z-ink", item.doneAt && "text-z-muted line-through")}>{item.title}</p>
                    <p className="mt-0.5 flex flex-wrap gap-x-3 font-plex text-[11px] text-z-muted">
                      {d && !item.doneAt && <span className={d.late ? "text-z-accent" : undefined}>{d.text}</span>}
                      {item.fileName && (
                        <button type="button" onClick={() => open(item)} className="text-z-ink underline decoration-z-ink/30 underline-offset-2 hover:text-z-accent">
                          {item.fileName} {size(item.byteSize) && `· ${size(item.byteSize)}`}
                        </button>
                      )}
                    </p>
                    {item.note && <p className="mt-1 text-[13px] leading-5 text-z-muted">{item.note}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(item)}
                    className="font-plex text-[10px] uppercase tracking-wider text-z-faint opacity-0 transition-opacity hover:text-z-accent focus:opacity-100 group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
