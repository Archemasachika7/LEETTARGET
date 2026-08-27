import { ArrowUpRight, Check } from "lucide-react";
import { Link } from "react-router-dom";
import type { Recommendation } from "../../lib/recommend.js";
import { Button, Card, Chassis, MonoLabel, Panel, TelemetryBar } from "../../ui/index.js";

/** The most actionable block on the dashboard: what to solve now, and why.
 *
 * The reason line stays in sentence case rather than the mono uppercase used
 * for labels — it's a sentence to be read, not a channel to be scanned, and
 * setting prose in tracked-out caps costs legibility for nothing. See
 * lib/recommend.ts for why the reason never claims more than the data shows. */
export function NextTarget({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <Card className="border-success/30 bg-success/[0.04] p-5">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-medium text-text">Every target is done.</p>
            <p className="mt-1 text-[13px] text-text-muted">
              Add more problems to keep going — or upload a new list to work through.
            </p>
            <Link to="/practice" className="mt-4 inline-block">
              <Button variant="primary" size="sm">
                Add targets
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const [primary, ...rest] = recommendations;
  const primaryTitle = primary.target.customTitle ?? primary.target.customUrl ?? "Untitled";

  return (
    <Chassis>
      <TelemetryBar
        left={<span className="text-brand">Next target</span>}
        right={<span className="tnum">{recommendations.length} queued</span>}
      />

      <Panel mark className="p-6">
        <h2 className="text-xl font-semibold tracking-tight text-text">{primaryTitle}</h2>
        <p className="mt-2 text-[13px] text-text-secondary">{primary.reason}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {primary.target.customUrl && (
            <a href={primary.target.customUrl} target="_blank" rel="noreferrer">
              <Button variant="primary">
                Solve on LeetCode
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Button>
            </a>
          )}
          <Link to="/practice">
            <Button variant="secondary">See all targets</Button>
          </Link>
        </div>
      </Panel>

      {rest.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {rest.map(({ target, reason }, i) => {
            const title = target.customTitle ?? target.customUrl ?? "Untitled";
            return (
              <li key={target.id}>
                <a
                  href={target.customUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 px-5 py-3 transition-colors duration-fast hover:bg-elevated"
                >
                  <MonoLabel className="w-6 shrink-0">{String(i + 2).padStart(2, "0")}</MonoLabel>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text">{title}</span>
                    <span className="block truncate text-[12px] text-text-muted">{reason}</span>
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Chassis>
  );
}
