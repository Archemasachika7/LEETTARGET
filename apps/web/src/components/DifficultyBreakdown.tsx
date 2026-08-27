import { useEffect, useState } from "react";
import { getErrorMessage } from "../lib/errors.js";
import {
  backfillUnknownDifficulties,
  checkDifficultyProxyHealth,
  getSolvedByDifficulty,
  type DifficultyCounts,
} from "../lib/api.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { Chassis, ErrorNote, MonoLabel, Panel, Skeleton, TelemetryBar } from "../ui/index.js";

interface Props {
  userId: string;
  /** Bumped by the parent (e.g. after an import or a new solve) to force a
   * refetch — this component owns its own data since it's a join query, not
   * part of the plain targets/solved lists the app already has. */
  refreshKey: number;
}

/** Difficulty uses LeetCode's own green/amber/rose convention rather than an
 * abstract single-hue ramp. Readers arrive already fluent in it, and matching
 * the source domain beats internal tidiness. "Unresolved" stays neutral grey —
 * it isn't a fourth tier, it's missing data. */
const TIERS = [
  { key: "easy", label: "Easy", swatch: "bg-easy", text: "text-easy" },
  { key: "medium", label: "Medium", swatch: "bg-medium", text: "text-medium" },
  { key: "hard", label: "Hard", swatch: "bg-hard", text: "text-hard" },
  { key: "unknown", label: "Unresolved", swatch: "bg-unknown", text: "text-text-muted" },
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
        // at "Unknown" forever otherwise.
        if (initial.unknown > 0 && leetCodeProxyUrl) {
          try {
            const fixed = await backfillUnknownDifficulties(userId, leetCodeProxyUrl);
            if (cancelled) return;
            if (fixed > 0) {
              setCounts(await getSolvedByDifficulty(userId));
            } else {
              // Difficulty lookups fail soft to "Unknown" on any error, so
              // without this the chart would just stay grey unexplained.
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
      <Chassis>
        <Panel>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-5 h-5 w-full" />
          <Skeleton className="mt-4 h-3 w-48" />
        </Panel>
      </Chassis>
    );
  }

  const total = counts.easy + counts.medium + counts.hard + counts.unknown;
  const rows = TIERS.map((t) => ({ ...t, count: counts[t.key] })).filter(
    (t) => t.key !== "unknown" || t.count > 0
  );

  return (
    <Chassis className="flex h-full flex-col">
      <TelemetryBar
        left={<span className="text-text-secondary">Difficulty mix</span>}
        right={<span className="tnum">{total} total</span>}
      />

      {total === 0 ? (
        <Panel className="flex-1">
          <p className="text-[13px] text-text-muted">
            Nothing yet — this fills in once a solve syncs from the extension, a LeetCode import, or a repo scan.
          </p>
        </Panel>
      ) : (
        <>
          <Panel mark className="flex-1">
            {/* Proportional bar: butt-jointed segments, no rounding, so the
             * boundaries read as measured divisions rather than pills. */}
            <div
              className="flex h-3 w-full gap-px"
              role="img"
              aria-label={rows.map((r) => `${r.label}: ${r.count}`).join(", ")}
            >
              {rows
                .filter((r) => r.count > 0)
                .map((r) => (
                  <div
                    key={r.key}
                    title={`${r.label}: ${r.count} solved`}
                    className={`${r.swatch} transition-[width] duration-progress ease-smooth`}
                    style={{ width: `${(r.count / total) * 100}%` }}
                  />
                ))}
            </div>

            {/* One row per tier rather than a two-column grid: in a half-width
             * panel, columns push each count far from its own label and the
             * pairing stops being obvious at a glance. */}
            <ul className="mt-5 divide-y divide-border/60">
              {rows.map((r, i) => (
                <li key={r.key} className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 ${r.swatch}`} aria-hidden />
                    <MonoLabel index={i + 1}>{r.label}</MonoLabel>
                  </span>
                  <span className="flex items-baseline gap-2">
                    <span className={`font-mono text-sm font-semibold tabular-nums ${r.text}`}>{r.count}</span>
                    <span className="w-10 text-right font-mono text-[10px] tabular-nums text-text-muted">
                      {Math.round((r.count / total) * 100)}%
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}

      {proxyDiagnostic && (
        <div className="border-t border-warning/30 bg-warning/10 px-4 py-2.5 text-[12px] text-warning">
          {proxyDiagnostic}
        </div>
      )}
    </Chassis>
  );
}
