import { useCallback, useEffect, useState } from "react";
import type { Goal } from "@leettarget/shared";
import { listGoals } from "./goals.js";
import { getErrorMessage } from "./errors.js";

/** Loads this user's live goals across every track.
 *
 * Fetched once and filtered per track by the caller rather than queried per
 * track: it's a handful of rows, and switching tracks shouldn't cost a
 * round-trip when the whole set already fits in memory. */
export function useGoals(userId: string) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => {
    listGoals(userId)
      .then((rows) => {
        setGoals(rows);
        setError(undefined);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { goals, loading, error, refresh };
}
