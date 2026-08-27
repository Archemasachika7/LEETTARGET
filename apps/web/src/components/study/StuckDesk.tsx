import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Archive, Check, CircleDot, RotateCcw, Trash2 } from "lucide-react";
import { type StudyTrack, useStudyDesk } from "../../lib/studyDesk.js";
import { Button, Chassis, EmptyState, Field, MonoLabel, Panel, Select, StatusDot, TelemetryBar, Textarea, Input, useToast } from "../../ui/index.js";

const STATUS_COPY = {
  stuck: { label: "Stuck", tone: "danger" as const },
  revisit: { label: "Revisit", tone: "warning" as const },
  cleared: { label: "Cleared", tone: "success" as const },
};

/**
 * A question that is stuck needs a clean re-entry point more than another
 * exhaustive tracker. This desk captures the question, the subject and the
 * thought that failed, then lets the learner bring it back when ready.
 */
export function StuckDesk({ mode }: { mode: Exclude<StudyTrack, "leetcode"> }) {
  const { track, stuckItems, addStuckItem, removeStuckItem, setStuckItemStatus } = useStudyDesk();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(track.subjects[0]);
  const [note, setNote] = useState("");

  useEffect(() => {
    setSubject(track.subjects[0]);
    setTitle("");
    setNote("");
  }, [mode, track.subjects]);

  const items = useMemo(
    () => stuckItems.filter((item) => item.track === mode),
    [stuckItems, mode]
  );
  const openCount = items.filter((item) => item.status !== "cleared").length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    addStuckItem({ track: mode, title: trimmed, subject, note: note.trim() || undefined });
    setTitle("");
    setNote("");
    toast("Saved to your stuck desk");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel index={mode === "gate" ? "GATE" : "CAT"}>{track.kicker}</MonoLabel>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">{track.deskTitle}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">{track.capturePrompt}</p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-text-muted">
          <StatusDot tone={openCount > 0 ? "warning" : "success"} />
          {openCount === 0 ? "Clear desk" : `${openCount} open ${openCount === 1 ? "question" : "questions"}`}
        </div>
      </header>

      <Chassis as="section" className="overflow-hidden">
        <TelemetryBar
          left={<span>Capture / leave a useful trail</span>}
          right={<span>Private to this browser</span>}
        />
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:divide-x lg:divide-border">
          <Panel mark className="border-b border-border lg:border-b-0">
            <h2 className="text-sm font-semibold text-text">Save a question before you move on.</h2>
            <p className="mt-1 text-[13px] leading-5 text-text-muted">
              Write the smallest detail your future self will need: the question, the subject and the exact place it became unclear.
            </p>

            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit}>
              <Field label="Question or set" htmlFor="stuck-title">
                <Input
                  id="stuck-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={mode === "gate" ? "e.g. Paging and TLB question" : "e.g. DILR set — distribution table"}
                  maxLength={140}
                  required
                />
              </Field>
              <Field label="Subject" htmlFor="stuck-subject">
                <Select id="stuck-subject" value={subject} onChange={(event) => setSubject(event.target.value)}>
                  {track.subjects.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </Field>
              <Field label="What stopped you?" hint="Optional, but one sentence makes the revisit much easier." htmlFor="stuck-note">
                <Textarea
                  id="stuck-note"
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={mode === "gate" ? "I mixed up page replacement and address translation." : "I saw the cases, but chose the wrong table structure."}
                  maxLength={500}
                />
              </Field>
              <Button variant="primary" type="submit" className="self-start active:scale-[0.985]">
                <CircleDot className="h-4 w-4" aria-hidden />
                Save to desk
              </Button>
            </form>
          </Panel>

          <Panel className="p-0">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold text-text">Return queue</h2>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">{items.length} saved</span>
            </div>
            {items.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  title="Nothing is waiting here."
                  description="Use this desk for the questions worth revisiting—not every practice attempt."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const status = STATUS_COPY[item.status];
                  return (
                    <li key={item.id} className="group px-5 py-4 transition-colors duration-fast hover:bg-elevated">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span className="font-medium text-text">{item.title}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.11em] text-text-muted">{item.subject}</span>
                          </div>
                          {item.note && <p className="mt-1.5 text-[13px] leading-5 text-text-muted">{item.note}</p>}
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">
                          <StatusDot tone={status.tone} />
                          {status.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 opacity-100 transition-opacity duration-fast sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                        {item.status !== "revisit" && item.status !== "cleared" && (
                          <Button size="sm" variant="ghost" onClick={() => setStuckItemStatus(item.id, "revisit")}>
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            Revisit
                          </Button>
                        )}
                        {item.status !== "cleared" && (
                          <Button size="sm" variant="ghost" onClick={() => setStuckItemStatus(item.id, "cleared")}>
                            <Check className="h-3.5 w-3.5" aria-hidden />
                            Cleared
                          </Button>
                        )}
                        {item.status === "cleared" && (
                          <Button size="sm" variant="ghost" onClick={() => setStuckItemStatus(item.id, "revisit")}>
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                            Bring back
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-text-muted hover:text-danger" onClick={() => removeStuckItem(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          Remove
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      </Chassis>

      <p className="flex items-center gap-2 text-xs leading-5 text-text-muted">
        <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden />
        This is a personal recall desk, not another backlog. Save only the questions that deserve a better second attempt.
      </p>
    </div>
  );
}
