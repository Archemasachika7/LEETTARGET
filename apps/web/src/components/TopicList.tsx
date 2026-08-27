import { STRENGTH_LABEL, type TopicMastery, type TopicStrength } from "@leettarget/shared";
import { Badge, Card, ProgressBar } from "../ui/index.js";

/** Strength is ordinal (not started → starting → steady → strong), so it maps
 * onto the semantic scale rather than four unrelated hues: neutral for
 * untouched, brand while in progress, success once mostly done. */
const STRENGTH_TONE: Record<TopicStrength, "neutral" | "brand" | "success"> = {
  untouched: "neutral",
  starting: "brand",
  steady: "brand",
  strong: "success",
};

/** One row per topic: how much of the reader's own list in that topic is
 * done. Worded as coverage of *their* problems, never as mastery of the
 * topic in the abstract — with no accuracy data, the stronger claim would be
 * unfounded. */
export function TopicList({ topics }: { topics: TopicMastery[] }) {
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {topics.map((t) => (
          <li key={t.topic} className="flex items-center gap-4 p-3 transition-colors duration-fast hover:bg-surface">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-medium text-text">{t.topic}</span>
                <Badge tone={STRENGTH_TONE[t.strength]}>{STRENGTH_LABEL[t.strength]}</Badge>
              </div>
              <ProgressBar
                value={t.solved}
                max={t.total}
                tone={t.strength === "strong" ? "success" : "brand"}
                className="mt-2 max-w-sm"
                label={`${t.topic}: ${t.solved} of ${t.total} solved`}
              />
            </div>
            <div className="shrink-0 text-right">
              <span className="block font-mono text-sm tabular-nums text-text">
                {t.solved}
                <span className="text-text-muted">/{t.total}</span>
              </span>
              <span className="block font-mono text-[11px] tabular-nums text-text-muted">
                {Math.round(t.ratio * 100)}%
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
