import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, Eye, Trash2 } from "lucide-react";
import type { Doubt, DoubtImage, Problem } from "@leettarget/shared";
import { addDoubtSolution, deleteDoubt, getDoubtImageUrl, getProblemById, listDoubtImages, uploadDoubtImage } from "../../lib/doubts.js";
import { getErrorMessage } from "../../lib/errors.js";
import { Badge, Button, Card, ErrorNote, Textarea, useToast } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

interface Props {
  doubt: Doubt;
  subjectId: string;
  userId: string;
  /** True if the reader authored this doubt, or created the subject it's
   * in — the two roles allowed to delete it (see migration 0008_doubts.sql). */
  canDelete: boolean;
  onDeleted: () => void;
}

function ImageGrid({ images }: { images: { url: string; id: string }[] }) {
  if (images.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((img) => (
        <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block">
          <img
            src={img.url}
            alt=""
            className="h-28 w-auto max-w-[12rem] border border-border object-cover transition-colors duration-fast hover:border-border-strong"
          />
        </a>
      ))}
    </div>
  );
}

/** One doubt, collapsed to its title until opened. The solution — text and
 * images alike — only fetches/renders once "Review solution" is clicked; up
 * to then the card only knows the question. This is a spoiler toggle, not
 * access control: the solution text ships with the doubt row regardless
 * (see the type's own doc comment), the images are what's actually deferred.
 *
 * If the reader is the author and there's no solution yet, they get an
 * inline "Add solution" form instead — the main way a doubt is meant to
 * get answered is its own author circling back once they've learned it,
 * not necessarily someone else replying. */
export function DoubtCard({ doubt: initialDoubt, subjectId, userId, canDelete, onDeleted }: Props) {
  const [doubt, setDoubt] = useState(initialDoubt);
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<DoubtImage[]>();
  const [questionUrls, setQuestionUrls] = useState<{ id: string; url: string }[]>([]);
  const [solutionUrls, setSolutionUrls] = useState<{ id: string; url: string }[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [problem, setProblem] = useState<Problem>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [addingSolution, setAddingSolution] = useState(false);
  const [solutionDraft, setSolutionDraft] = useState("");
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const toast = useToast();

  useEffect(() => {
    if (doubt.problemId) getProblemById(doubt.problemId).then(setProblem).catch(() => {});
  }, [doubt.problemId]);

  useEffect(() => {
    if (!open || images) return;
    listDoubtImages(doubt.id)
      .then(async (rows) => {
        setImages(rows);
        const qs = rows.filter((r) => r.kind === "question");
        const urls = await Promise.all(qs.map(async (r) => ({ id: r.id, url: await getDoubtImageUrl(r.storagePath) })));
        setQuestionUrls(urls);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [open, images, doubt.id]);

  async function loadSolutionImages(rows: DoubtImage[]) {
    const sols = rows.filter((r) => r.kind === "solution");
    if (sols.length === 0) return;
    const urls = await Promise.all(sols.map(async (r) => ({ id: r.id, url: await getDoubtImageUrl(r.storagePath) })));
    setSolutionUrls(urls);
  }

  async function handleReveal() {
    if (revealed) return;
    setRevealed(true);
    if (!images) return;
    try {
      await loadSolutionImages(images);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteDoubt(doubt.id);
      onDeleted();
      toast("Doubt removed");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSolution() {
    if (!solutionDraft.trim() && solutionFiles.length === 0) return;
    setBusy(true);
    setError(undefined);
    try {
      await addDoubtSolution(doubt.id, solutionDraft.trim());
      const uploaded: DoubtImage[] = [];
      for (const file of solutionFiles) {
        uploaded.push(await uploadDoubtImage(subjectId, doubt.id, userId, "solution", file));
      }
      setDoubt((d) => ({ ...d, solutionText: solutionDraft.trim() || undefined, status: "resolved" }));
      setImages((cur) => (cur ? [...cur, ...uploaded] : uploaded));
      await loadSolutionImages(uploaded);
      setRevealed(true);
      setAddingSolution(false);
      toast("Solution added");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const hasSolution = Boolean(doubt.solutionText) || (images?.some((r) => r.kind === "solution") ?? false);
  const isAuthor = doubt.authorId === userId;

  return (
    <Card className="p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-text">{doubt.title}</span>
            {doubt.status === "resolved" && <Badge tone="success">Resolved</Badge>}
          </div>
          {problem && (
            <a
              href={problem.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-1 inline-flex items-center gap-1 text-[12px] text-text-muted hover:text-brand"
            >
              {problem.title}
              <ExternalLink className="h-3 w-3" aria-hidden />
            </a>
          )}
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-text-muted transition-transform duration-fast", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="animate-enter mt-4 flex flex-col gap-4 border-t border-border pt-4">
          {error && <ErrorNote>{error}</ErrorNote>}

          {doubt.questionText && <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{doubt.questionText}</p>}
          <ImageGrid images={questionUrls} />

          {hasSolution ? (
            <div className="border-t border-border pt-4">
              {!revealed ? (
                <Button size="sm" variant="secondary" onClick={handleReveal}>
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Review solution
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Solution</p>
                  {doubt.solutionText && (
                    <p className="whitespace-pre-wrap text-sm leading-6 text-text-secondary">{doubt.solutionText}</p>
                  )}
                  <ImageGrid images={solutionUrls} />
                </div>
              )}
            </div>
          ) : (
            isAuthor && (
              <div className="border-t border-border pt-4">
                {!addingSolution ? (
                  <Button size="sm" variant="secondary" onClick={() => setAddingSolution(true)}>
                    Add solution
                  </Button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      value={solutionDraft}
                      onChange={(e) => setSolutionDraft(e.target.value)}
                      rows={3}
                      placeholder="Worked it out? Write it down for next time."
                    />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      onChange={(e) => setSolutionFiles(Array.from(e.target.files ?? []))}
                      className="block w-full text-[13px] text-text-muted file:mr-3 file:border file:border-border file:bg-surface file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-text hover:file:border-border-strong"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setAddingSolution(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleAddSolution}
                        disabled={!solutionDraft.trim() && solutionFiles.length === 0}
                        loading={busy}
                        loadingText="Saving…"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {canDelete && (
            <div className="flex justify-end border-t border-border pt-3">
              <Button size="sm" variant="danger" onClick={handleDelete} loading={busy} loadingText="Removing…">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
