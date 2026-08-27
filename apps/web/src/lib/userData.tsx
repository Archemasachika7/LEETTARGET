import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SolvedProblem, Target } from "@leettarget/shared";
import { listSolvedProblems, listTargets } from "./api.js";
import { getErrorMessage } from "./errors.js";

interface UserData {
  userId: string;
  targets: Target[];
  solved: SolvedProblem[];
  /** Bumped on every refresh so components that own their own queries (the
   * difficulty join, the solved/mapping table) know to refetch. */
  refreshTick: number;
  loading: boolean;
  error?: string;
  refresh: () => void;
}

const UserDataContext = createContext<UserData | undefined>(undefined);

/** Targets and solves are read by nearly every page, so they're fetched once
 * here rather than re-queried per route — navigating between Dashboard,
 * Practice and Progress shouldn't cost three round-trips for the same rows. */
export function UserDataProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [solved, setSolved] = useState<SolvedProblem[]>([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(() => {
    Promise.all([listTargets(userId), listSolvedProblems(userId)])
      .then(([t, s]) => {
        setTargets(t);
        setSolved(s);
        setError(undefined);
        setRefreshTick((n) => n + 1);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ userId, targets, solved, refreshTick, loading, error, refresh }),
    [userId, targets, solved, refreshTick, loading, error, refresh]
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserData {
  const ctx = useContext(UserDataContext);
  if (!ctx) throw new Error("useUserData must be used inside <UserDataProvider>.");
  return ctx;
}
