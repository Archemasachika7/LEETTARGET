import { Link } from "react-router-dom";
import { ArrowRight, Crosshair } from "lucide-react";
import type { TopicMastery } from "@leettarget/shared";
import { Button, Card, ProgressBar, SectionHeader } from "../../ui/index.js";

/** Where the most work is left, by topic.
 *
 * Named "focus areas" rather than "weak areas" on purpose: the ranking is by
 * how many problems in that topic are still unsolved, which is a fact about
 * the reader's list. Calling it weakness would imply an accuracy signal that
 * doesn't exist anywhere in this app's data. */
export function FocusAreas({ focus }: { focus: TopicMastery[] }) {
  if (focus.length === 0) return null;

  return (
    <Card className="p-4">
      <SectionHeader
        title="Focus areas"
        description="Topics with the most left to solve in your list."
        icon={<Crosshair className="h-4 w-4 text-text-muted" aria-hidden />}
        action={
          <Link to="/roadmap">
            <Button size="sm" variant="ghost">
              All topics
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </Link>
        }
      />

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {focus.map((t) => (
          <li key={t.topic}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[13px] font-medium text-text">{t.topic}</span>
              <span className="shrink-0 font-mono text-[12px] tabular-nums text-text-muted">
                {t.total - t.solved} left
              </span>
            </div>
            <ProgressBar
              value={t.solved}
              max={t.total}
              className="mt-1.5"
              label={`${t.topic}: ${t.solved} of ${t.total} solved`}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
