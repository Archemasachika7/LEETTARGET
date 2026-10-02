import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Flag, RotateCcw } from "lucide-react";
import type { Problem, Target } from "@leettarget/shared";
import { buildReviewQueue, reviewQueueCounts, type ReviewCandidate, type ReviewQueueItem } from "@leettarget/shared";
import { getErrorMessage } from "../../lib/errors.js";
import { listSolvedWithProblems, type SolvedWithProblem } from "../../lib/api.js";
import { Chassis, DifficultyBadge, ErrorNote, MonoLabel, Panel, Skeleton, TelemetryBar } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

interface Props {
  userId: string;
  /** This user's targets, already in hand from `useUserData` — flagged ones
   * (yellow/red) are the "revisit this" half of the queue. */
  targets: Target[];
  /** Bumped by the parent after an import or a new solve to force a refetch
   * of the solved-with-problems join. */
  refreshKey: number;
}

/** How many rows to show before the card says "+N more" instead of growing
 * into a second page of the dashboard. */
const MAX_ROWS = 6;

/** "two-sum" → "Two Sum" for a flagged target that has no nicer title. */
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

interface SlugInfo {
  title: string;
  url: string;
  difficulty: Problem["difficulty"];
}

export function ReviewQueue({ userId, targets, refreshKey }: Props) {
  const [solved, setSolved] = useState<SolvedWithProblem[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    listSolvedWithProblems(userId)
      .then((rows) => {
        if (!cancelled) {
          setSolved(rows);
          setError(undefined);
        }
      })
      .catch((err) => !cancelled && setError(getErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  const queue = useMemo<ReviewQueueItem[]>(() => {
    if (!solved) return [];
    const bySlug = new Map<string, SlugInfo>(
      solved.map((s) => [
        s.problemSlug,
        { title: s.problemTitle, url: s.problemUrl, difficulty: s.difficulty },
      ])
    );

    const candidates: ReviewCandidate[] = [];

    for (const s of solved) {
      candidates.push({
        id: s.id,
        title: s.problemTitle,
        url: s.problemUrl,
        difficulty: s.difficulty,
        kind: "solved",
        lastActiveAt: s.solvedAt,
      });
    }

    for (const t of targets) {
      if (t.flagLevel === "none") continue;
      const slug = t.slug;
      const info = slug ? bySlug.get(slug) : undefined;
      const title = t.customTitle ?? info?.title ?? (slug ? titleFromSlug(slug) : "Untitled");
      const url = t.customUrl ?? info?.url ?? (slug ? `https://leetcode.com/problems/${slug}/` : undefined);
      candidates.push({
        id: t.id,
        title,
        url,
        difficulty: info?.difficulty,
        kind: "flagged",
        flagLevel: t.flagLevel,
        lastActiveAt: t.createdAt,
      });
    }

    return buildReviewQueue(candidates);
  }, [solved, targets]);

  if (error) return <ErrorNote>{error}</ErrorNote>;

  if (!solved) {
    return (
      <Chassis>
        <TelemetryBar left={<span className="text-text-secondary">Review today</span>} />
        <Panel>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-3 h-4 w-2/3" />
        </Panel>
      </Chassis>
    );
  }

  const counts = reviewQueueCounts(queue);
  const hasAnyHistory = solved.length > 0 || targets.length > 0;

  return (
    <Chassis>
      <TelemetryBar
        left={<span className="text-brand">Review today</span>}
        right={
          <span className="tnum">
            {queue.length > 0
              ? [counts.flagged > 0 && `${counts.flagged} flagged`, counts.requeue > 0 && `${counts.requeue} to re-do`]
                  .filter(Boolean)
                  .join(" · ")
              : "quiet"}
          </span>
        }
      />

      {queue.length === 0 ? (
        <Panel>
          <div className="flex items-start gap-3">
            <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" aria-hidden />
            <div>
              <p className="text-sm font-medium text-text">Nothing due for review today.</p>
              <p className="mt-1 text-[13px] text-text-muted">
                {hasAnyHistory
                  ? "Solves re-enter the queue 2–45 days after you do them; flag a target to pull it up sooner."
                  : "Solved problems re-enter here 2–45 days later, and any target you flag yellow or red is pulled up sooner."}
              </p>
            </div>
          </div>
        </Panel>
      ) : (
        <ul className="stagger divide-y divide-border">
          {queue.slice(0, MAX_ROWS).map((item, i) => (
            <ReviewRow key={item.id} item={item} index={i} />
          ))}
          {queue.length > MAX_ROWS && (
            <li className="px-5 py-2.5 text-[12px] text-text-muted">
              +{queue.length - MAX_ROWS} more in the queue
            </li>
          )}
        </ul>
      )}
    </Chassis>
  );
}

function ReviewRow({ item, index }: { item: ReviewQueueItem; index: number }) {
  const isFlagged = item.kind === "flagged";
  return (
    <li>
      <a
        href={item.url ?? undefined}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center gap-4 px-5 py-3 transition-colors duration-fast hover:bg-elevated"
      >
        <MonoLabel className="w-6 shrink-0">{String(index + 1).padStart(2, "0")}</MonoLabel>
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center border",
            isFlagged && "animate-flag-in",
            item.flagLevel === "red" && "border-danger/30 bg-danger/10 text-danger",
            item.flagLevel === "yellow" && "border-warning/30 bg-warning/10 text-warning",
            !isFlagged && "border-border bg-elevated text-text-muted"
          )}
          aria-hidden
        >
          {isFlagged ? <Flag className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-text">{item.title}</span>
          <span className="block truncate text-[12px] text-text-muted">{item.reason}</span>
        </span>
        {item.difficulty && (
          <DifficultyBadge difficulty={item.difficulty} className="hidden shrink-0 sm:inline-flex" />
        )}
        <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted transition-colors duration-fast group-hover:text-text" aria-hidden />
      </a>
    </li>
  );
}
