import { useMemo, useState } from "react";
import { ArrowUpRight, Check, Play, SkipForward, X } from "lucide-react";
import type { Problem } from "@leettarget/shared";
import type { DetailedTarget } from "../../lib/api.js";
import { setTargetStatus } from "../../lib/api.js";
import { getErrorMessage } from "../../lib/errors.js";
import {
  Badge,
  Button,
  Card,
  ChoiceGroup,
  DifficultyBadge,
  ErrorNote,
  Eyebrow,
  Field,
  ProgressBar,
  Select,
  useToast,
} from "../../ui/index.js";

type DifficultyFilter = Problem["difficulty"] | "Mixed";

interface Props {
  targets: DetailedTarget[];
  onFinished: () => void;
}

/** A focused run through a handful of problems.
 *
 * The point is to remove the per-problem "what now?" decision: pick the shape
 * of the session once, then work a queue. Marking one solved moves only the
 * target's status — see setTargetStatus for why it doesn't fabricate a solve
 * record — and the real solve still arrives from the extension or a sync. */
export function PracticeSession({ targets, onFinished }: Props) {
  const [size, setSize] = useState(5);
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("Mixed");
  const [topic, setTopic] = useState("all");
  const [queue, setQueue] = useState<DetailedTarget[]>();
  const [index, setIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  const pending = useMemo(() => targets.filter((t) => t.status === "pending"), [targets]);

  const topics = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of pending) {
      for (const name of new Set(t.topics)) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [pending]);

  const matching = useMemo(() => {
    return pending.filter((t) => {
      if (difficulty !== "Mixed" && t.difficulty !== difficulty) return false;
      if (topic !== "all" && !t.topics.includes(topic)) return false;
      return true;
    });
  }, [pending, difficulty, topic]);

  function start() {
    // Oldest first: an uploaded roadmap arrives in its intended study order.
    const chosen = [...matching].reverse().slice(0, size);
    setQueue(chosen);
    setIndex(0);
    setCompleted([]);
    setError(undefined);
  }

  function endSession() {
    setQueue(undefined);
    onFinished();
  }

  async function markSolved(target: DetailedTarget) {
    setBusy(true);
    setError(undefined);
    try {
      await setTargetStatus(target.id, "done");
      setCompleted((prev) => [...prev, target.id]);
      advance();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function advance() {
    setIndex((i) => i + 1);
  }

  // --- setup ---------------------------------------------------------------

  if (!queue) {
    return (
      <Card className="flex flex-col gap-5 p-5">
        <div>
          <Eyebrow>Practice session</Eyebrow>
          <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-text">Set up a run</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            Pick the shape once, then work the queue without deciding again.
          </p>
        </div>

        <div className="flex flex-wrap gap-5">
          <Field label="How many">
            <ChoiceGroup
              label="Session size"
              value={size}
              onChange={setSize}
              options={[3, 5, 10, 15].map((n) => ({ value: n, label: `${n}` }))}
            />
          </Field>

          <Field label="Difficulty">
            <ChoiceGroup
              label="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: "Mixed" as const, label: "Mixed" },
                { value: "Easy" as const, label: "Easy" },
                { value: "Medium" as const, label: "Medium" },
                { value: "Hard" as const, label: "Hard" },
              ]}
            />
          </Field>
        </div>

        {topics.length > 0 && (
          <Field label="Topic" hint="From the topics analysed on your Roadmap.">
            <Select value={topic} onChange={(e) => setTopic(e.target.value)} className="max-w-xs">
              <option value="all">Any topic</option>
              {topics.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg" onClick={start} disabled={matching.length === 0}>
            <Play className="h-4 w-4" aria-hidden />
            Start session
          </Button>
          <p className="text-[13px] text-text-muted">
            {matching.length === 0
              ? "Nothing pending matches those filters."
              : `${Math.min(size, matching.length)} of ${matching.length} matching problem${
                  matching.length === 1 ? "" : "s"
                }`}
          </p>
        </div>
      </Card>
    );
  }

  // --- finished ------------------------------------------------------------

  if (index >= queue.length) {
    const solved = completed.length;
    return (
      <Card className="border-success/25 bg-success/[0.04] p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
          <Check className="h-5 w-5 text-success" aria-hidden />
        </div>
        <h2 className="mt-3 text-lg font-semibold tracking-tight text-text">Session complete</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          {solved === 0
            ? "Nothing marked solved this time — the queue is still there when you want it."
            : `${solved} of ${queue.length} marked solved.`}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="primary" onClick={endSession}>
            Done
          </Button>
        </div>
      </Card>
    );
  }

  // --- in session ----------------------------------------------------------

  const current = queue[index];
  const title = current.customTitle ?? current.customUrl ?? "Untitled";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <Eyebrow>Practice session</Eyebrow>
          <p className="mt-0.5 font-mono text-[13px] tabular-nums text-text-secondary">
            {index + 1} / {queue.length}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={endSession}>
          <X className="h-3.5 w-3.5" aria-hidden />
          End
        </Button>
      </div>

      <ProgressBar value={index} max={queue.length} className="rounded-none" label="Session progress" />

      <div className="p-6">
        <div className="flex flex-wrap items-center gap-3">
          <DifficultyBadge difficulty={current.difficulty} />
          {current.topics.slice(0, 3).map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>

        <h2 className="mt-3 text-xl font-semibold tracking-tight text-text">{title}</h2>

        <div className="mt-6 flex flex-wrap gap-2">
          {current.customUrl && (
            <a href={current.customUrl} target="_blank" rel="noreferrer">
              <Button variant="primary">
                Open on LeetCode
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </a>
          )}
          <Button onClick={() => markSolved(current)} loading={busy} loadingText="Saving…">
            <Check className="h-4 w-4" aria-hidden />
            Mark solved
          </Button>
          <Button variant="ghost" onClick={advance} disabled={busy}>
            <SkipForward className="h-4 w-4" aria-hidden />
            Skip
          </Button>
        </div>

        {error && <ErrorNote className="mt-4">{error}</ErrorNote>}
      </div>

      {queue.length > index + 1 && (
        <div className="border-t border-border px-5 py-3">
          <Eyebrow>Up next</Eyebrow>
          <p className="mt-1 truncate text-[13px] text-text-muted">
            {queue[index + 1].customTitle ?? queue[index + 1].customUrl}
          </p>
        </div>
      )}
    </Card>
  );
}
