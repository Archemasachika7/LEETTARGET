import { useCallback, useEffect, useState } from "react";
import type { SkillItem } from "@leettarget/shared";
import { listSkillItems } from "./skillItems.js";
import { getErrorMessage } from "./errors.js";

/** Loads this user's Google Skills items — mirrors `useGoals`. */
export function useSkillItems(userId: string) {
  const [items, setItems] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => {
    listSkillItems(userId)
      .then((rows) => {
        setItems(rows);
        setError(undefined);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
