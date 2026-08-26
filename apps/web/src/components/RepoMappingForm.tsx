import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_PATH_TEMPLATE, parseRepoInput, type GithubLink } from "@leettarget/shared";
import { getGithubLink, syncFromGithubRepo, upsertGithubLink } from "../lib/api.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";

interface Props {
  userId: string;
  /** Called after a successful "Sync from GitHub" so the dashboard (solved
   * count, difficulty chart) picks up whatever it just backfilled. */
  onSynced?: () => void;
}

/** Lets the user point LeetTarget at the GitHub repo they already commit
 * LeetCode solutions to (LeetHub-compatible — no migration needed). The
 * extension reads this same mapping to know where to commit. "Sync from
 * GitHub" goes the other direction: for a repo that already has solutions
 * committed (e.g. from LeetHub, before this mapping existed), it scans the
 * repo and backfills solved status instead of only tracking new solves. */
export function RepoMappingForm({ userId, onSynced }: Props) {
  const [repoInput, setRepoInput] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathTemplate, setPathTemplate] = useState(DEFAULT_PATH_TEMPLATE);
  const [saved, setSaved] = useState<GithubLink>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();

  useEffect(() => {
    getGithubLink(userId).then((link) => {
      if (!link) return;
      setSaved(link);
      setRepoInput(`${link.owner}/${link.repo}`);
      setBranch(link.branch);
      setPathTemplate(link.pathTemplate);
    });
  }, [userId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      const { owner, repo } = parseRepoInput(repoInput);
      const link: GithubLink = { userId, owner, repo, branch, pathTemplate };
      await upsertGithubLink(link);
      setSaved(link);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    if (!saved) return;
    setSyncing(true);
    setError(undefined);
    setSyncResult(undefined);
    try {
      const result = await syncFromGithubRepo(userId, saved, leetCodeProxyUrl);
      setSyncResult(
        result.matched === 0
          ? "No matching problems found in that repo."
          : `Found ${result.matched} solved problem${result.matched === 1 ? "" : "s"} in the repo — ${result.newlySynced} newly synced.`
      );
      onSynced?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800"
    >
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">GitHub repo mapping</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        The repo your solutions live in (or will) — e.g. your existing
        LeetHub repo. The path template controls where the extension expects
        to find each solution.
      </p>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input
          required
          placeholder="owner/repo"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 sm:col-span-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <input
          required
          placeholder="branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <input
          required
          placeholder="path template"
          value={pathTemplate}
          onChange={(e) => setPathTemplate(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 sm:col-span-3 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="mt-3 rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
      >
        {saving ? "Saving..." : "Save mapping"}
      </button>

      {saved && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
          <p className="text-sm text-green-700 dark:text-green-400">
            Mapped to {saved.owner}/{saved.repo} @ {saved.branch}
          </p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Already have solutions committed there (e.g. from LeetHub)? Scan the repo and backfill solved
            status instead of only tracking new solves.
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-200 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
          >
            {syncing ? "Scanning repo..." : "Sync from GitHub"}
          </button>
          {syncResult && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{syncResult}</p>}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
