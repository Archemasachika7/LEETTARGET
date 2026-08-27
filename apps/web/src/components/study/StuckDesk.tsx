import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Archive, Check, CircleDot, Download, FileText, FolderUp, Paperclip, RotateCcw, Trash2, Upload, X } from "lucide-react";
import { type StudyTrack, useStudyDesk } from "../../lib/studyDesk.js";
import { deleteStudyAttachment, openStudyAttachment, restoreStudyAttachments, saveStudyAttachments, validateAttachmentFiles } from "../../lib/studyDeskAttachments.js";
import { downloadStudyDeskBackup, parseStudyDeskBackup } from "../../lib/studyDeskBackup.js";
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
  const { track, stuckItems, addStuckItem, mergeStuckItems, removeStuckItem, setStuckItemAttachments, setStuckItemStatus } = useStudyDesk();
  const toast = useToast();
  const importInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(track.subjects[0]);
  const [note, setNote] = useState("");
  const [answer, setAnswer] = useState("");
  const [method, setMethod] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [backingUp, setBackingUp] = useState(false);

  useEffect(() => {
    // `webkitdirectory` has no stable React type, but Chromium supports it for
    // folder picking. Files are still checked against the same local limits.
    folderInputRef.current?.setAttribute("webkitdirectory", "");
    folderInputRef.current?.setAttribute("directory", "");
  }, []);

  useEffect(() => {
    setSubject(track.subjects[0]);
    setTitle("");
    setNote("");
    setAnswer("");
    setMethod("");
    setPendingFiles([]);
    if (attachmentInputRef.current) attachmentInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  }, [mode, track.subjects]);

  const items = useMemo(
    () => stuckItems.filter((item) => item.track === mode),
    [stuckItems, mode]
  );
  const openCount = items.filter((item) => item.status !== "cleared").length;

  function addPendingFiles(incoming: File[]) {
    const next = [...pendingFiles, ...incoming];
    const validationError = validateAttachmentFiles(next);
    if (validationError) {
      toast(validationError);
      return;
    }
    setPendingFiles(next);
  }

  function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    addPendingFiles(Array.from(event.target.files ?? []));
    // Clearing means the same file can be deliberately selected again after a removal.
    event.target.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const validationError = validateAttachmentFiles(pendingFiles);
    if (validationError) {
      toast(validationError);
      return;
    }

    const itemId = addStuckItem({
      track: mode,
      title: trimmed,
      subject,
      note: note.trim() || undefined,
      answer: answer.trim() || undefined,
      method: method.trim() || undefined,
    });

    try {
      const attachments = await saveStudyAttachments(itemId, pendingFiles);
      if (attachments.length > 0) setStuckItemAttachments(itemId, attachments);
      toast(attachments.length > 0 ? "Question and study material saved." : "Saved to your stuck desk.");
    } catch (error) {
      toast(error instanceof Error ? `Question saved, but attachments were not: ${error.message}` : "Question saved, but its attachments could not be stored.");
    } finally {
      setTitle("");
      setNote("");
      setAnswer("");
      setMethod("");
      setPendingFiles([]);
    }
  }

  async function handleBackupExport() {
    setBackingUp(true);
    try {
      await downloadStudyDeskBackup(stuckItems);
      toast("Study-desk backup downloaded.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "The backup could not be created.");
    } finally {
      setBackingUp(false);
    }
  }

  async function handleBackupImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const backup = parseStudyDeskBackup(await file.text());
      const { added, skipped, addedIds } = mergeStuckItems(backup.items);
      const attachmentsRestored = await restoreStudyAttachments(backup.attachments, new Set(addedIds));
      if (added === 0) {
        toast("All questions in this backup are already on this device.");
      } else {
        const details = `${added} ${added === 1 ? "question" : "questions"} restored`;
        const files = attachmentsRestored > 0 ? ` with ${attachmentsRestored} ${attachmentsRestored === 1 ? "file" : "files"}` : "";
        const duplicates = skipped > 0 ? `; ${skipped} already existed` : "";
        toast(`${details}${files}${duplicates}.`);
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : "This backup could not be imported.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleAttachmentOpen(id: string) {
    try {
      await openStudyAttachment(id);
    } catch (error) {
      toast(error instanceof Error ? error.message : "This attachment could not be opened.");
    }
  }

  async function handleAttachmentRemove(itemId: string, attachmentId: string) {
    const item = stuckItems.find((entry) => entry.id === itemId);
    if (!item) return;
    try {
      await deleteStudyAttachment(attachmentId);
      setStuckItemAttachments(itemId, (item.attachments ?? []).filter((attachment) => attachment.id !== attachmentId));
      toast("Attachment removed.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "This attachment could not be removed.");
    }
  }

  async function handleQuestionRemove(itemId: string) {
    const item = stuckItems.find((entry) => entry.id === itemId);
    try {
      await Promise.all((item?.attachments ?? []).map((attachment) => deleteStudyAttachment(attachment.id)));
    } catch {
      // The note should still be removable even if an old attachment is already missing.
    } finally {
      removeStuckItem(itemId);
      toast("Question removed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <MonoLabel index={mode === "gate" ? "GATE" : "CAT"}>{track.kicker}</MonoLabel>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">{track.deskTitle}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">{track.capturePrompt}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.13em] text-text-muted">
            <StatusDot tone={openCount > 0 ? "warning" : "success"} />
            {openCount === 0 ? "Clear desk" : `${openCount} open ${openCount === 1 ? "question" : "questions"}`}
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={handleBackupImport}
            aria-label="Import a LeetTarget study-desk backup"
          />
          <Button size="sm" variant="ghost" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" aria-hidden />
            Import
          </Button>
          <Button size="sm" variant="ghost" disabled={stuckItems.length === 0 || backingUp} loading={backingUp} loadingText="Backing up…" onClick={handleBackupExport}>
            {!backingUp && <Download className="h-3.5 w-3.5" aria-hidden />}
            Back up
          </Button>
        </div>
      </header>

      <Chassis as="section" className="overflow-hidden">
        <TelemetryBar
          left={<span>Capture / leave a useful trail</span>}
          right={<span>Attachments stay local until backed up</span>}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Answer" hint="Optional final answer or key result." htmlFor="stuck-answer">
                  <Textarea
                    id="stuck-answer"
                    rows={3}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder={mode === "gate" ? "e.g. 16 frames" : "e.g. Case C gives 84"}
                    maxLength={4000}
                  />
                </Field>
                <Field label="Method" hint="Optional approach for the next attempt." htmlFor="stuck-method">
                  <Textarea
                    id="stuck-method"
                    rows={3}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                    placeholder={mode === "gate" ? "Start from the address split." : "Build the table before testing cases."}
                    maxLength={4000}
                  />
                </Field>
              </div>

              <div>
                <p className="text-[13px] font-medium text-text-secondary">Study material</p>
                <p className="mt-1 text-[12px] leading-5 text-text-muted">Optional. Add PNG, JPG, PDF, text, or another file type—up to 8 files and 12 MB per file.</p>
                <input ref={attachmentInputRef} type="file" multiple className="sr-only" onChange={handleAttachmentSelection} aria-label="Add files to this question" />
                <input ref={folderInputRef} type="file" multiple className="sr-only" onChange={handleAttachmentSelection} aria-label="Add a folder to this question" />
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary" onClick={() => attachmentInputRef.current?.click()}>
                    <Paperclip className="h-3.5 w-3.5" aria-hidden />
                    Add files
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => folderInputRef.current?.click()}>
                    <FolderUp className="h-3.5 w-3.5" aria-hidden />
                    Add folder
                  </Button>
                </div>
                {pendingFiles.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Files to save with this question">
                    {pendingFiles.map((file, index) => (
                      <li key={`${file.name}-${file.size}-${index}`} className="inline-flex max-w-full items-center gap-1.5 border border-border bg-bg px-2 py-1 text-[12px] text-text-secondary">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                        <span className="max-w-[12rem] truncate">{file.name}</span>
                        <button type="button" onClick={() => setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} className="text-text-muted hover:text-danger" aria-label={`Remove ${file.name}`}>
                          <X className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

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

                      {(item.answer || item.method) && (
                        <div className="mt-3 grid gap-2 border-l border-brand/40 pl-3 text-[13px] leading-5 sm:grid-cols-2">
                          {item.answer && <p><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">Answer / </span><span className="text-text-secondary">{item.answer}</span></p>}
                          {item.method && <p><span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">Method / </span><span className="text-text-secondary">{item.method}</span></p>}
                        </div>
                      )}

                      {(item.attachments?.length ?? 0) > 0 && (
                        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`Attachments for ${item.title}`}>
                          {item.attachments!.map((attachment) => (
                            <li key={attachment.id} className="inline-flex max-w-full items-center border border-border bg-bg text-[12px] text-text-secondary">
                              <button type="button" onClick={() => handleAttachmentOpen(attachment.id)} className="inline-flex min-w-0 items-center gap-1.5 px-2 py-1 hover:text-text" title={`Open ${attachment.name}`}>
                                <FileText className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden />
                                <span className="max-w-[11rem] truncate">{attachment.name}</span>
                              </button>
                              <button type="button" onClick={() => handleAttachmentRemove(item.id, attachment.id)} className="border-l border-border px-1.5 py-1 text-text-muted hover:text-danger" aria-label={`Remove ${attachment.name}`}>
                                <X className="h-3.5 w-3.5" aria-hidden />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

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
                        <Button size="sm" variant="ghost" className="text-text-muted hover:text-danger" onClick={() => void handleQuestionRemove(item.id)}>
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
        This is a personal recall desk, not another backlog. Backups include GATE/CAT notes, answers, methods and stored attachments.
      </p>
    </div>
  );
}
