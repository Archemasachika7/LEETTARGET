import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { daysUntil, type ZoneExam, type ZoneSyllabus } from "@leettarget/shared";
import {
  createScheduleItem,
  deleteScheduleItem,
  listSchedule,
  setScheduleDone,
  type ScheduleItem,
  type ScheduleKind,
} from "../../lib/zone/api.js";
import { getErrorMessage } from "../../lib/errors.js";
import { ErrorLine, ZButton, ZInput, ZLabel, ZSelect } from "./primitives.js";
import { cn } from "../../lib/cn.js";

const KINDS: { id: ScheduleKind; label: string }[] = [
  { id: "study", label: "Study" },
  { id: "revision", label: "Revision" },
  { id: "mock", label: "Mock test" },
  { id: "deadline", label: "Deadline" },
];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function when(date: string): string {
  const d = daysUntil(date);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${-d} days ago`;
  if (d < 7) return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" });
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function SchedulePanel({ userId, exam, syllabus }: { userId: string; exam: ZoneExam; syllabus: ZoneSyllabus }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [title, setTitle] = useState("");
  const [onDate, setOnDate] = useState(todayIso);
  const [kind, setKind] = useState<ScheduleKind>("study");
  const [topicId, setTopicId] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const topics = useMemo(() => syllabus.sections.flatMap((s) => s.topics.map((t) => ({ ...t, section: s.name }))), [syllabus]);
  const topicName = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);

  const load = useCallback(() => {
    listSchedule(userId, exam)
      .then((rows) => { setItems(rows); setError(undefined); })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId, exam]);

  useEffect(load, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    const finalTitle = title.trim() || (topicId ? topicName.get(topicId) ?? "" : "");
    if (!finalTitle || !onDate) return;
    setSaving(true);
    try {
      const item = await createScheduleItem({ userId, exam, title: finalTitle, kind, onDate, topicId: topicId || undefined });
      setItems((current) => [...current, item].sort((a, b) => a.onDate.localeCompare(b.onDate)));
      setTitle("");
      setTopicId("");
      setError(undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(item: ScheduleItem) {
    const done = !item.doneAt;
    setItems((current) => current.map((x) => (x.id === item.id ? { ...x, doneAt: done ? new Date().toISOString() : undefined } : x)));
    try {
      await setScheduleDone(item.id, done);
    } catch (err) {
      setError(getErrorMessage(err));
      load();
    }
  }

  async function remove(item: ScheduleItem) {
    setItems((current) => current.filter((x) => x.id !== item.id));
    try {
      await deleteScheduleItem(item.id);
    } catch (err) {
      setError(getErrorMessage(err));
      load();
    }
  }

  const open = items.filter((i) => !i.doneAt);
  const groups = [
    { name: "Overdue", rows: open.filter((i) => daysUntil(i.onDate) < 0) },
    { name: "This week", rows: open.filter((i) => daysUntil(i.onDate) >= 0 && daysUntil(i.onDate) < 7) },
    { name: "Later", rows: open.filter((i) => daysUntil(i.onDate) >= 7) },
  ].filter((g) => g.rows.length > 0);
  const done = items.filter((i) => i.doneAt);

  return (
    <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
      <form onSubmit={add} className="flex flex-col gap-3 self-start border border-z-ink/20 bg-z-raised p-4">
        <ZLabel>Plan a session</ZLabel>
        <label className="flex flex-col gap-1">
          <ZLabel>Syllabus topic (optional)</ZLabel>
          <ZSelect value={topicId} onChange={(e) => setTopicId(e.target.value)}>
            <option value="">None</option>
            {syllabus.sections.map((s) => (
              <optgroup key={s.id} label={s.name}>
                {s.topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </optgroup>
            ))}
          </ZSelect>
        </label>
        <label className="flex flex-col gap-1">
          <ZLabel>What</ZLabel>
          <ZInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder={topicId ? topicName.get(topicId) : "e.g. 2025 paper, section 2"} maxLength={140} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <ZLabel>When</ZLabel>
            <ZInput type="date" value={onDate} onChange={(e) => setOnDate(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1">
            <ZLabel>Kind</ZLabel>
            <ZSelect value={kind} onChange={(e) => setKind(e.target.value as ScheduleKind)}>
              {KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </ZSelect>
          </label>
        </div>
        <ZButton type="submit" variant="solid" disabled={saving || (!title.trim() && !topicId)}>
          {saving ? "Adding…" : "Add to schedule"}
        </ZButton>
        {error && <ErrorLine>{error}</ErrorLine>}
      </form>

      <div>
        {loading ? (
          <p className="font-plex text-sm text-z-muted">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="max-w-md text-[15px] leading-6 text-z-muted">
            Nothing planned. Pick a topic from the syllabus, give it a day, and it shows up here.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.name}>
                <p className={cn("mb-2 font-plex text-[10px] uppercase tracking-[0.14em]", group.name === "Overdue" ? "text-z-accent" : "text-z-faint")}>
                  {group.name} · {group.rows.length}
                </p>
                <ul className="relative flex flex-col">
                  <span className="absolute bottom-3 left-[5px] top-3 w-px bg-z-ink/15" aria-hidden />
                  {group.rows.map((item) => (
                    <Row key={item.id} item={item} topic={item.topicId ? topicName.get(item.topicId) : undefined} onToggle={toggle} onRemove={remove} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
        {done.length > 0 && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowDone((v) => !v)} className="font-plex text-[11px] uppercase tracking-[0.12em] text-z-muted hover:text-z-ink">
              {showDone ? "Hide" : "Show"} done · {done.length}
            </button>
            {showDone && (
              <ul className="mt-2 flex flex-col">
                {done.map((item) => (
                  <Row key={item.id} item={item} topic={item.topicId ? topicName.get(item.topicId) : undefined} onToggle={toggle} onRemove={remove} />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ item, topic, onToggle, onRemove }: {
  item: ScheduleItem;
  topic?: string;
  onToggle: (item: ScheduleItem) => void;
  onRemove: (item: ScheduleItem) => void;
}) {
  const overdue = !item.doneAt && daysUntil(item.onDate) < 0;
  return (
    <li className="group relative flex items-center gap-4 py-2 pl-7">
      <button
        type="button"
        onClick={() => onToggle(item)}
        aria-label={item.doneAt ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
        className={cn(
          "absolute left-0 top-1/2 h-[11px] w-[11px] -translate-y-1/2 border",
          item.doneAt ? "border-z-accent bg-z-accent" : overdue ? "border-z-accent bg-z-bg" : "border-z-ink/50 bg-z-bg hover:border-z-accent"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] text-z-ink", item.doneAt && "text-z-muted line-through")}>{item.title}</p>
        <p className="font-plex text-[11px] text-z-muted">
          <span className={overdue ? "text-z-accent" : undefined}>{when(item.onDate)}</span>
          <span className="mx-1.5 text-z-faint">/</span>
          {KINDS.find((k) => k.id === item.kind)?.label}
          {topic && topic !== item.title && <span className="text-z-faint"> · {topic}</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(item)}
        className="font-plex text-[10px] uppercase tracking-wider text-z-faint opacity-0 transition-opacity hover:text-z-accent focus:opacity-100 group-hover:opacity-100"
        aria-label={`Remove "${item.title}"`}
      >
        Remove
      </button>
    </li>
  );
}
