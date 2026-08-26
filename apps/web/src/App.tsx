import { useCallback, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { SolvedProblem, Target } from "@leettarget/shared";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { deleteTarget, listSolvedProblems, listTargets } from "./lib/api.js";
import { CsvUploader } from "./components/CsvUploader.js";
import { ImportLeetCode } from "./components/ImportLeetCode.js";
import { AddTargetForm } from "./components/AddTargetForm.js";
import { RepoMappingForm } from "./components/RepoMappingForm.js";
import { TargetsTable } from "./components/TargetsTable.js";
import { ProgressSummary } from "./components/ProgressSummary.js";
import { DifficultyBreakdown } from "./components/DifficultyBreakdown.js";
import { SolutionMappingTable } from "./components/SolutionMappingTable.js";

export default function App() {
  if (!isSupabaseConfigured || !supabase) {
    return <SetupNotice />;
  }
  return <SignedInApp supabase={supabase} />;
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">LeetTarget</h1>
      <p className="mt-3 text-sm text-slate-600">
        Supabase isn't configured yet. Copy{" "}
        <code className="rounded bg-slate-100 px-1">apps/web/.env.example</code> to{" "}
        <code className="rounded bg-slate-100 px-1">.env.local</code> and fill in your
        project's URL and anon key, then restart the dev server.
      </p>
    </div>
  );
}

function SignedInApp({ supabase }: { supabase: SupabaseClient }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  if (loading) return null;
  if (!session) return <SignInScreen supabase={supabase} />;

  return <Dashboard userId={session.user.id} onSignOut={() => supabase.auth.signOut()} />;
}

function SignInScreen({ supabase }: { supabase: SupabaseClient }) {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900">LeetTarget</h1>
      <p className="mt-3 text-sm text-slate-600">
        Track your LeetCode progress and map it to your GitHub solutions repo.
      </p>
      <button
        onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
        className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Sign in with GitHub
      </button>
    </div>
  );
}

type Tab = "dashboard" | "targets" | "solved" | "repo";

function Dashboard({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [targets, setTargets] = useState<Target[]>([]);
  const [solved, setSolved] = useState<SolvedProblem[]>([]);
  const [error, setError] = useState<string>();
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => {
    Promise.all([listTargets(userId), listSolvedProblems(userId)])
      .then(([t, s]) => {
        setTargets(t);
        setSolved(s);
        setRefreshTick((n) => n + 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRemove(id: string) {
    try {
      await deleteTarget(id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">LeetTarget</h1>
        <button onClick={onSignOut} className="text-sm text-slate-500 hover:underline">
          Sign out
        </button>
      </header>

      <nav className="mt-6 flex gap-4 border-b border-slate-200 text-sm">
        {(["dashboard", "targets", "solved", "repo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "border-b-2 px-1 pb-2 " +
              (tab === t ? "border-slate-900 font-medium text-slate-900" : "border-transparent text-slate-500")
            }
          >
            {t === "dashboard"
              ? "Dashboard"
              : t === "targets"
                ? "Targets"
                : t === "solved"
                  ? "Solved"
                  : "Repo mapping"}
          </button>
        ))}
      </nav>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col gap-6">
        {tab === "dashboard" && (
          <>
            <ProgressSummary targets={targets} solved={solved} />
            <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />
            <ImportLeetCode userId={userId} onImported={refresh} />
            <div>
              <h2 className="mb-2 text-sm font-medium text-slate-700">Recent targets</h2>
              <TargetsTable targets={targets.slice(0, 10)} />
            </div>
          </>
        )}

        {tab === "targets" && (
          <>
            <AddTargetForm userId={userId} onAdded={refresh} />
            <CsvUploader userId={userId} targets={targets} onImported={refresh} />
            <div>
              <h2 className="mb-2 text-sm font-medium text-slate-700">All targets</h2>
              <TargetsTable targets={targets} onRemove={handleRemove} />
            </div>
          </>
        )}

        {tab === "solved" && (
          <div>
            <h2 className="mb-2 text-sm font-medium text-slate-700">Solved problems &amp; solution mapping</h2>
            <p className="mb-3 text-sm text-slate-500">
              Where LeetTarget thinks each solution lives in your repo — correct it if the guess is wrong.
            </p>
            <SolutionMappingTable userId={userId} refreshKey={refreshTick} />
          </div>
        )}

        {tab === "repo" && <RepoMappingForm userId={userId} />}
      </div>
    </div>
  );
}
