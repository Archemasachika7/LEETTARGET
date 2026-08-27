import { useCallback, useEffect, useState } from "react";
import { focusAreas, topicMastery, type TopicMastery, type TopicProblem } from "@leettarget/shared";
import { enrichMissingTopics, listTopicProblems } from "./api.js";
import { leetCodeProxyUrl } from "./leetcodeConfig.js";
import { getErrorMessage } from "./errors.js";

export interface TopicsState {
  problems: TopicProblem[];
  mastery: TopicMastery[];
  focus: TopicMastery[];
  /** How many of the reader's problems still have no topic tags. Drives the
   * "analyse more" affordance rather than being hidden. */
  untagged: number;
  loading: boolean;
  enriching: boolean;
  error?: string;
  /** Fetches tags for a bounded batch of untagged problems, then reloads. */
  enrich: () => Promise<number>;
  reload: () => void;
}

/** Topic mastery for the signed-in user, plus the enrichment control that
 * fills `problems.tags` in.
 *
 * Enrichment is explicit rather than automatic on mount: it costs one
 * LeetCode request per problem, and firing that on every dashboard visit
 * would hammer their API for a feature the reader may not be looking at. */
export function useTopics(userId: string, refreshKey: number): TopicsState {
  const [problems, setProblems] = useState<TopicProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState<string>();
  const [localTick, setLocalTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listTopicProblems(userId)
      .then((rows) => {
        if (!cancelled) setProblems(rows);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshKey, localTick]);

  const reload = useCallback(() => setLocalTick((n) => n + 1), []);

  const enrich = useCallback(async () => {
    if (!leetCodeProxyUrl) return 0;
    setEnriching(true);
    setError(undefined);
    try {
      const updated = await enrichMissingTopics(userId, leetCodeProxyUrl);
      reload();
      return updated;
    } catch (err) {
      setError(getErrorMessage(err));
      return 0;
    } finally {
      setEnriching(false);
    }
  }, [userId, reload]);

  const mastery = topicMastery(problems);

  return {
    problems,
    mastery,
    focus: focusAreas(mastery),
    untagged: problems.filter((p) => p.topics.length === 0).length,
    loading,
    enriching,
    error,
    enrich,
    reload,
  };
}
