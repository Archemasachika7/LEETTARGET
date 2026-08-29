import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Doubt, Problem } from "@leettarget/shared";
import { createDoubt, findProblemBySlug, uploadDoubtImage } from "../../lib/doubts.js";
import { getErrorMessage } from "../../lib/errors.js";
import { Button, Card, ErrorNote, Field, Input, Textarea } from "../../ui/index.js";

interface Props {
  subjectId: string;
  userId: string;
  onCreated: (doubt: Doubt) => void;
  onCancel: () => void;
}

const FILE_INPUT_CLASS =
  "block w-full text-[13px] text-text-muted file:mr-3 file:border file:border-border file:bg-surface " +
  "file:px-2.5 file:py-1.5 file:text-[12px] file:font-medium file:text-text hover:file:border-border-strong";

export function NewDoubtForm({ subjectId, userId, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [problemInput, setProblemInput] = useState("");
  const [problem, setProblem] = useState<Problem>();
  const [problemLookupError, setProblemLookupError] = useState<string>();
  const [questionText, setQuestionText] = useState("");
  const [solutionText, setSolutionText] = useState("");
  const [questionFiles, setQuestionFiles] = useState<File[]>([]);
  const [solutionFiles, setSolutionFiles] = useState<File[]>([]);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const canSubmit = title.trim().length > 0 && (questionText.trim().length > 0 || questionFiles.length > 0 || problem);

  async function handleProblemLookup() {
    setProblemLookupError(undefined);
    if (!problemInput.trim()) {
      setProblem(undefined);
      return;
    }
    try {
      const found = await findProblemBySlug(problemInput);
      if (!found) {
        setProblem(undefined);
        setProblemLookupError("No matching problem in your synced catalogue yet.");
        return;
      }
      setProblem(found);
    } catch (err) {
      setProblemLookupError(getErrorMessage(err));
    }
  }

  async function handleSubmit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(undefined);
    try {
      const doubt = await createDoubt({
        subjectId,
        authorId: userId,
        problemId: problem?.id,
        title: title.trim(),
        questionText: questionText.trim() || undefined,
        solutionText: solutionText.trim() || undefined,
      });

      for (const file of questionFiles) {
        await uploadDoubtImage(subjectId, doubt.id, userId, "question", file);
      }
      for (const file of solutionFiles) {
        await uploadDoubtImage(subjectId, doubt.id, userId, "solution", file);
      }

      onCreated(doubt);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      {error && <ErrorNote>{error}</ErrorNote>}

      <Field label="Title">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Stuck on the recurrence for LIS" />
      </Field>

      <Field label="LeetCode problem" hint="Optional — paste a URL or slug to tie this doubt to a specific problem.">
        <div className="flex gap-2">
          <Input
            value={problemInput}
            onChange={(e) => setProblemInput(e.target.value)}
            onBlur={handleProblemLookup}
            placeholder="two-sum, or the full leetcode.com URL"
          />
          <Button type="button" variant="secondary" size="md" onClick={handleProblemLookup}>
            Find
          </Button>
        </div>
        {problem && (
          <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-success">
            <Check className="h-3.5 w-3.5" aria-hidden />
            Linked to {problem.title}
            <button type="button" onClick={() => { setProblem(undefined); setProblemInput(""); }} className="ml-1 text-text-muted hover:text-text">
              <X className="h-3 w-3" aria-hidden />
            </button>
          </p>
        )}
        {problemLookupError && <p className="mt-1.5 text-[12px] text-text-muted">{problemLookupError}</p>}
      </Field>

      <Field label="The question" hint="Text, a screenshot, or both.">
        <Textarea
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          rows={4}
          placeholder="What's the actual question, and where are you stuck?"
        />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(e) => setQuestionFiles(Array.from(e.target.files ?? []))}
          className={`mt-2 ${FILE_INPUT_CLASS}`}
        />
      </Field>

      <Field label="The solution" hint="Optional — leave blank if you're posting this as an open question for others.">
        <Textarea value={solutionText} onChange={(e) => setSolutionText(e.target.value)} rows={4} placeholder="How it resolved, if it has." />
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={(e) => setSolutionFiles(Array.from(e.target.files ?? []))}
          className={`mt-2 ${FILE_INPUT_CLASS}`}
        />
      </Field>

      <div className="flex justify-end gap-2 border-t border-border pt-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" size="sm" onClick={handleSubmit} disabled={!canSubmit} loading={busy} loadingText="Posting…">
          Post doubt
        </Button>
      </div>
    </Card>
  );
}
