import { ArrowUpRight, Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import type { Recommendation } from "../../lib/recommend.js";
import { Button, Card, Eyebrow } from "../../ui/index.js";

/** The most actionable block on the dashboard: what to solve now, and why.
 * The "why" is always a fact drawn from the reader's own list — see
 * lib/recommend.ts for why it never claims more than that. */
export function NextTarget({ recommendations }: { recommendations: Recommendation[] }) {
  if (recommendations.length === 0) {
    return (
      <Card className="border-success/25 bg-success/[0.04] p-5">
        <div className="flex items-start gap-3">
          <Check className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-medium text-text">Every target is done.</p>
            <p className="mt-1 text-[13px] text-text-muted">
              Add more problems to keep going — or upload a new list to work through.
            </p>
            <Link to="/practice" className="mt-3 inline-block">
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
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-brand/[0.04] p-5">
        <Eyebrow className="text-brand">Next target</Eyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-text">{primaryTitle}</h2>
        <p className="mt-1 flex items-start gap-1.5 text-[13px] text-text-muted">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {primary.reason}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
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
      </div>

      {rest.length > 0 && (
        <ul className="divide-y divide-border">
          {rest.map(({ target, reason }) => {
            const title = target.customTitle ?? target.customUrl ?? "Untitled";
            return (
              <li key={target.id}>
                <a
                  href={target.customUrl ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-5 py-3 transition-colors duration-fast hover:bg-surface"
                >
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
    </Card>
  );
}
