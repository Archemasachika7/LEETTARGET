import { useEffect, useState } from "react";
import { ArrowLeft, Download, Trophy, UserCircle } from "lucide-react";
import type { LeaderboardEntry, Target } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import { listLeaderboard, listTargets } from "../lib/api.js";
import { downloadTargetsAsCsv } from "../lib/downloadCsv.js";
import { DifficultyBreakdown } from "./DifficultyBreakdown.js";
import { TargetsTable } from "./TargetsTable.js";
import { Badge, Button, Card, EmptyState, ErrorNote, ProgressBar, SectionHeader, SkeletonRows } from "../ui/index.js";
import { cn } from "../lib/cn.js";

interface Props {
  currentUserId: string;
}

function displayNameFor(entry: LeaderboardEntry): string {
  return entry.displayName || entry.leetcodeUsername || "Anonymous";
}

/** Everyone with at least one target or solve, ranked by solved count.
 * Selecting a row opens that person's profile — their difficulty breakdown
 * and full target list — so a target set can be sized up, or downloaded and
 * adopted as your own competition set. */
export function Leaderboard({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>();
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<LeaderboardEntry>();

  useEffect(() => {
    listLeaderboard()
      .then(setEntries)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;

  if (selected) {
    return (
      <ProfileDetail entry={selected} isSelf={selected.userId === currentUserId} onBack={() => setSelected(undefined)} />
    );
  }

  if (!entries) return <SkeletonRows rows={5} />;

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy className="h-6 w-6" aria-hidden />}
        title="Nobody's on the board yet."
        description="The leaderboard fills in as people add targets and record solves."
      />
    );
  }

  const leader = entries[0]?.solvedCount ?? 0;

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {entries.map((entry, i) => {
          const isSelf = entry.userId === currentUserId;
          return (
            <li key={entry.userId}>
              <button
                onClick={() => setSelected(entry)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors duration-fast hover:bg-surface",
                  isSelf && "bg-brand/[0.06]"
                )}
              >
                <span className="w-6 shrink-0 text-center font-mono text-[13px] tabular-nums text-text-muted">
                  {i + 1}
                </span>

                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface">
                    <UserCircle className="h-4 w-4 text-text-muted" aria-hidden />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-text">{displayNameFor(entry)}</span>
                    {isSelf && <Badge tone="brand">You</Badge>}
                  </span>
                  <ProgressBar
                    value={entry.solvedCount}
                    max={Math.max(leader, 1)}
                    className="mt-1.5 max-w-[220px]"
                    label={`${displayNameFor(entry)}: ${entry.solvedCount} solved`}
                  />
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-mono text-sm font-semibold tabular-nums text-text">
                    {entry.solvedCount}
                  </span>
                  <span className="block text-[11px] text-text-muted">
                    {entry.doneCount}/{entry.targetCount} targets
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function ProfileDetail({
  entry,
  isSelf,
  onBack,
}: {
  entry: LeaderboardEntry;
  isSelf: boolean;
  onBack: () => void;
}) {
  const [targets, setTargets] = useState<Target[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    listTargets(entry.userId)
      .then(setTargets)
      .catch((err) => setError(getErrorMessage(err)));
  }, [entry.userId]);

  return (
    <div className="flex flex-col gap-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="self-start">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to leaderboard
      </Button>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface">
              <UserCircle className="h-6 w-6 text-text-muted" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-semibold text-text">
              {displayNameFor(entry)}
              {isSelf && <Badge tone="brand">You</Badge>}
            </h3>
            {entry.leetcodeUsername && (
              <p className="font-mono text-[12px] text-text-muted">{entry.leetcodeUsername}</p>
            )}
          </div>
        </div>
        {entry.bio && <p className="mt-3 text-[13px] text-text-secondary">{entry.bio}</p>}
      </Card>

      <DifficultyBreakdown userId={entry.userId} refreshKey={0} />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={isSelf ? "Your targets" : "Their targets"}
          description={`${entry.doneCount} of ${entry.targetCount} done`}
          action={
            targets &&
            targets.length > 0 && (
              <Button size="sm" onClick={() => downloadTargetsAsCsv(targets, `${displayNameFor(entry)}-targets`)}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download CSV
              </Button>
            )
          }
        />
        {error && <ErrorNote>{error}</ErrorNote>}
        {!targets && !error && <SkeletonRows rows={4} />}
        {targets && targets.length === 0 && <p className="text-sm text-text-muted">No targets yet.</p>}
        {targets && targets.length > 0 && <TargetsTable targets={targets} />}
      </section>
    </div>
  );
}
