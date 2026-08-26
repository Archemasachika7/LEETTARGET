import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState } from "react";
import { backfillUnknownDifficulties, getSolvedByDifficulty, type DifficultyCounts } from "../lib/api.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";

interface Props {
  userId: string;
  /** Bumped by the parent (e.g. after an import or a new solve) to force a
   * refetch — this component owns its own data since it's a join query,
   * not part of the plain targets/solved lists the dashboard already has. */
  refreshKey: number;
}

/** Easy/Medium/Hard is an ordinal tier (like a size tier), not an identity —
 * swapping the order changes its meaning — so it gets a single-hue ramp,
 * light-to-dark, rather than a red/yellow/green rainbow. Steps chosen from
 * the shared sequential-blue ramp (250/400/550) clear the ordinal light-end
 * and dark-end contrast floors simultaneously, so these same hex values are
 * used unchanged in both themes — no `dark:` variant needed here. "Unknown"
 * (solves whose problem row hasn't had a difficulty resolved yet, e.g. from
 * a LeetCode import) is a neutral gray, not a fourth tier. */
const TIER_COLORS = {
  easy: "#86b6ef",
  medium: "#3987e5",
  hard: "#1c5cab",
  unknown: "#e1e0d9",
} as const;

export function DifficultyBreakdown({ userId, refreshKey }: Props) {
  const [counts, setCounts] = useState<DifficultyCounts>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let cancelled = false;

    getSolvedByDifficulty(userId)
      .then(async (initial) => {
        if (cancelled) return;
        setCounts(initial);

        // Self-heal: some solved problems may be stuck at "Unknown" from
        // before difficulty enrichment existed on this import path. Fix
        // them quietly in the background and refresh once done, rather
        // than leaving the gray "Unresolved" bucket permanently inflated.
        if (initial.unknown > 0 && leetCodeProxyUrl) {
          try {
            const fixed = await backfillUnknownDifficulties(userId, leetCodeProxyUrl);
            if (!cancelled && fixed > 0) {
              setCounts(await getSolvedByDifficulty(userId));
            }
          } catch {
            // best-effort — leave the chart showing what it already has
          }
        }
      })
      .catch((err) => setError(getErrorMessage(err)));

    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!counts) return null;

  const total = counts.easy + counts.medium + counts.hard + counts.unknown;

  const segments: { key: keyof typeof TIER_COLORS; label: string; count: number }[] = [
    { key: "easy", label: "Easy", count: counts.easy },
    { key: "medium", label: "Medium", count: counts.medium },
    { key: "hard", label: "Hard", count: counts.hard },
    ...(counts.unknown > 0 ? [{ key: "unknown" as const, label: "Unresolved", count: counts.unknown }] : []),
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Solved by difficulty</h3>

      {total === 0 ? (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          No solves yet — this fills in once a solve syncs from the extension or an import.
        </p>
      ) : (
        <>
          <div className="mt-3 flex h-6 gap-[2px] overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900">
            {segments
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.count} solved`}
                  className="transition-[width] duration-300 ease-out"
                  style={{
                    width: `${(s.count / total) * 100}%`,
                    backgroundColor: TIER_COLORS[s.key],
                  }}
                />
              ))}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            {segments.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-sm"
                  style={{ backgroundColor: TIER_COLORS[s.key] }}
                />
                {s.label} <span className="text-slate-400 dark:text-slate-500">({s.count})</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
