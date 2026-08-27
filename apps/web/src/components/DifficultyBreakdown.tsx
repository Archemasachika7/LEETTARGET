import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getErrorMessage } from "../lib/errors.js";
import {
  backfillUnknownDifficulties,
  checkDifficultyProxyHealth,
  getSolvedByDifficulty,
  type DifficultyCounts,
} from "../lib/api.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { Card, ErrorNote, SectionHeader, Skeleton } from "../ui/index.js";

interface Props {
  userId: string;
  /** Bumped by the parent (e.g. after an import or a new solve) to force a
   * refetch — this component owns its own data since it's a join query, not
   * part of the plain targets/solved lists the app already has. */
  refreshKey: number;
}

/** Easy/Medium/Hard is an ordinal tier, not an identity — reordering it would
 * change its meaning — so it uses the single-hue ramp from the design tokens
 * (light → dark as difficulty rises) rather than a red/amber/green rainbow,
 * which would wrongly read as bad/ok/good. "Unresolved" is a neutral, not a
 * fourth tier. */
const SEGMENTS = [
  { key: "easy", label: "Easy", swatch: "bg-easy" },
  { key: "medium", label: "Medium", swatch: "bg-medium" },
  { key: "hard", label: "Hard", swatch: "bg-hard" },
  { key: "unknown", label: "Unresolved", swatch: "bg-unknown" },
] as const;

export function DifficultyBreakdown({ userId, refreshKey }: Props) {
  const [counts, setCounts] = useState<DifficultyCounts>();
  const [error, setError] = useState<string>();
  const [proxyDiagnostic, setProxyDiagnostic] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    setProxyDiagnostic(undefined);

    getSolvedByDifficulty(userId)
      .then(async (initial) => {
        if (cancelled) return;
        setCounts(initial);

        // Self-heal: solves imported before difficulty enrichment existed sit
        // at "Unknown" forever otherwise. Fix them quietly and refresh.
        if (initial.unknown > 0 && leetCodeProxyUrl) {
          try {
            const fixed = await backfillUnknownDifficulties(userId, leetCodeProxyUrl);
            if (cancelled) return;
            if (fixed > 0) {
              setCounts(await getSolvedByDifficulty(userId));
            } else {
              // Fixed nothing despite unresolved solves. Difficulty lookups
              // fail soft to "Unknown" on any error, so without this the
              // chart would just stay grey with no explanation.
              const diagnostic = await checkDifficultyProxyHealth(leetCodeProxyUrl);
              if (!cancelled) setProxyDiagnostic(diagnostic);
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

  if (error) return <ErrorNote>{error}</ErrorNote>;

  if (!counts) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-6 w-full" />
        <Skeleton className="mt-3 h-4 w-64" />
      </Card>
    );
  }

  const total = counts.easy + counts.medium + counts.hard + counts.unknown;
  const rows = SEGMENTS.map((s) => ({ ...s, count: counts[s.key] })).filter(
    (s) => s.key !== "unknown" || s.count > 0
  );

  return (
    <Card className="p-4">
      <SectionHeader
        title="Solved by difficulty"
        icon={<BarChart3 className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      {total === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          Nothing yet — this fills in once a solve syncs from the extension, a LeetCode import, or a repo scan.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-6 gap-0.5 overflow-hidden rounded" role="img" aria-label={
            rows.map((r) => `${r.label}: ${r.count}`).join(", ")
          }>
            {rows
              .filter((s) => s.count > 0)
              .map((s) => (
                <div
                  key={s.key}
                  title={`${s.label}: ${s.count} solved`}
                  className={`${s.swatch} transition-[width] duration-progress ease-smooth`}
                  style={{ width: `${(s.count / total) * 100}%` }}
                />
              ))}
          </div>

          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {rows.map((s) => (
              <li key={s.key} className="flex items-center gap-1.5 text-[13px] text-text-secondary">
                <span className={`inline-block h-2 w-2 shrink-0 rounded-sm ${s.swatch}`} aria-hidden />
                {s.label}
                <span className="font-mono tabular-nums text-text-muted">{s.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {proxyDiagnostic && (
        <p className="mt-4 rounded border border-warning/25 bg-warning/10 p-2.5 text-[12px] text-warning">
          {proxyDiagnostic}
        </p>
      )}
    </Card>
  );
}
