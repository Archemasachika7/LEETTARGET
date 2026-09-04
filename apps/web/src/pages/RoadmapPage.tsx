import { Map as MapIcon, Sparkles } from "lucide-react";
import { useUserData } from "../lib/userData.js";
import { useTopics } from "../lib/useTopics.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { TopicList } from "../components/TopicList.js";
import { FocusAreas } from "../components/dashboard/FocusAreas.js";
import { Button, Card, EmptyState, ErrorNote, PageHeader, SectionHeader, SkeletonRows, useToast } from "../ui/index.js";

/** Topic coverage across everything the reader has solved or targeted.
 *
 * This is built entirely from LeetCode's own topic tags, fetched on demand
 * into `problems.tags` — which ships empty. Until a problem has been
 * analysed it contributes to nothing here, and the page says so plainly
 * rather than showing a progression map assembled out of guesses. */
export function RoadmapPage() {
  const { userId, refreshTick } = useUserData();
  const { mastery, focus, untagged, loading, enriching, error, enrich } = useTopics(userId, refreshTick);
  const toast = useToast();

  async function handleEnrich() {
    const updated = await enrich();
    toast(
      updated > 0
        ? `Analysed ${updated} problem${updated === 1 ? "" : "s"}`
        : "No new topics found — try again later",
      updated > 0 ? "success" : "info"
    );
  }

  const analyseButton = leetCodeProxyUrl && untagged > 0 && (
    <Button variant="primary" size="sm" onClick={handleEnrich} loading={enriching} loadingText="Analysing…">
      <Sparkles className="h-3.5 w-3.5" aria-hidden />
      Analyse {Math.min(untagged, 25)} more
    </Button>
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Coverage"
        title="Roadmap"
        description="How much of your list you've covered, topic by topic — using LeetCode's own tags."
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading ? (
        <SkeletonRows rows={6} />
      ) : mastery.length === 0 ? (
        <EmptyState
          icon={<MapIcon className="h-6 w-6" aria-hidden />}
          title="No topics analysed yet."
          description={
            leetCodeProxyUrl
              ? "Waypoint doesn't know which topics your problems belong to until it asks LeetCode. Analysing fetches the real tags for the problems in your list."
              : "Topic data needs the leetcode-proxy edge function, which isn't configured yet."
          }
          action={analyseButton || undefined}
        />
      ) : (
        <>
          <FocusAreas focus={focus} />

          <section className="flex flex-col gap-3">
            <SectionHeader
              title="Topic coverage"
              description={
                untagged > 0
                  ? `${mastery.length} topics from your analysed problems — ${untagged} still to analyse.`
                  : `${mastery.length} topics across your list.`
              }
              icon={<MapIcon className="h-4 w-4 text-text-muted" aria-hidden />}
              action={analyseButton || undefined}
            />
            <TopicList topics={mastery} />
          </section>

          {untagged > 0 && (
            <Card className="p-4">
              <p className="text-[13px] text-text-muted">
                <span className="font-medium text-text">{untagged}</span> problem
                {untagged === 1 ? " has" : "s have"} no topic tags yet, so {untagged === 1 ? "it isn't" : "they aren't"}{" "}
                counted above. Analysing fetches them from LeetCode, 25 at a time.
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
