import { getErrorMessage } from "./lib/errors.js";
import { useCallback, useEffect, useState } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { SolvedProblem, Target } from "@leettarget/shared";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { deleteTarget, listSolvedProblems, listTargets } from "./lib/api.js";
import { applyTheme, getInitialTheme, type Theme } from "./lib/theme.js";
import { CsvUploader } from "./components/CsvUploader.js";
import { ImportLeetCode } from "./components/ImportLeetCode.js";
import { AddTargetForm } from "./components/AddTargetForm.js";
import { RepoMappingForm } from "./components/RepoMappingForm.js";
import { TargetsTable } from "./components/TargetsTable.js";
import { ProgressSummary } from "./components/ProgressSummary.js";
import { DifficultyBreakdown } from "./components/DifficultyBreakdown.js";
import { SolutionMappingTable } from "./components/SolutionMappingTable.js";
import { ExtensionSetup } from "./components/ExtensionSetup.js";
import { ProfileForm } from "./components/ProfileForm.js";

export default function App() {
  if (!isSupabaseConfigured || !supabase) {
    return <SetupNotice />;
  }
  return <SignedInApp supabase={supabase} />;
}

function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">LeetTarget</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        Supabase isn't configured yet. Copy{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">apps/web/.env.example</code> to{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env.local</code> and fill in your
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
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">LeetTarget</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Track your LeetCode progress and map it to your GitHub solutions repo.
        </p>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
          className="mt-6 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 dark:bg-slate-100 dark:text-slate-900"
        >
          Sign in with GitHub
        </button>
      </div>
    </div>
  );
}

/** Small sun/moon toggle — deliberately a plain icon swap, not an
 * animated switch track, to keep this in line with "restrained", not
 * "look how much motion we can add". */
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded border border-slate-300 px-2 py-1.5 text-sm text-slate-600 transition-colors duration-200 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}

type Tab = "dashboard" | "targets" | "solved" | "repo";

function Dashboard({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [targets, setTargets] = useState<Target[]>([]);
  const [solved, setSolved] = useState<SolvedProblem[]>([]);
  const [error, setError] = useState<string>();
  const [refreshTick, setRefreshTick] = useState(0);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const refresh = useCallback(() => {
    Promise.all([listTargets(userId), listSolvedProblems(userId)])
      .then(([t, s]) => {
        setTargets(t);
        setSolved(s);
        setRefreshTick((n) => n + 1);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleRemove(id: string) {
    try {
      await deleteTarget(id);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen bg-white transition-colors duration-300 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl p-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">LeetTarget</h1>
          <div className="flex items-center gap-3">
            <ThemeToggle theme={theme} onToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))} />
            <button
              onClick={onSignOut}
              className="text-sm text-slate-500 transition-colors duration-200 hover:underline dark:text-slate-400"
            >
              Sign out
            </button>
          </div>
        </header>

        <nav className="mt-6 flex gap-4 border-b border-slate-200 text-sm dark:border-slate-700">
          {(["dashboard", "targets", "solved", "repo"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={
                "border-b-2 px-1 pb-2 transition-colors duration-200 " +
                (tab === t
                  ? "border-slate-900 font-medium text-slate-900 dark:border-slate-100 dark:text-slate-100"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200")
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

        {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

        {/* `key={tab}` remounts this on every tab switch, which restarts the
         * fade-in animation — a small, one-shot cue that the view changed,
         * not a persistent motion effect. */}
        <div key={tab} className="mt-6 flex flex-col gap-6 animate-fade-in">
          {tab === "dashboard" && (
            <>
              <ProfileForm userId={userId} />
              <ProgressSummary targets={targets} solved={solved} />
              <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />
              <ImportLeetCode userId={userId} onImported={refresh} />
              <div>
                <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Recent targets</h2>
                <TargetsTable targets={targets.slice(0, 10)} />
              </div>
            </>
          )}

          {tab === "targets" && (
            <>
              <AddTargetForm userId={userId} onAdded={refresh} />
              <CsvUploader userId={userId} targets={targets} onImported={refresh} />
              <div>
                <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">All targets</h2>
                <TargetsTable targets={targets} onRemove={handleRemove} />
              </div>
            </>
          )}

          {tab === "solved" && (
            <div>
              <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Solved problems &amp; solution mapping
              </h2>
              <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                Where LeetTarget thinks each solution lives in your repo — correct it if the guess is wrong.
              </p>
              <SolutionMappingTable userId={userId} refreshKey={refreshTick} />
            </div>
          )}

          {tab === "repo" && (
            <>
              <RepoMappingForm userId={userId} />
              <ExtensionSetup userId={userId} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
