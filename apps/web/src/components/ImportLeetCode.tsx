import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState, type FormEvent } from "react";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { getLeetCodeUsername, importFromLeetCode, type LeetCodeImportResult } from "../lib/api.js";

interface Props {
  userId: string;
  onImported: () => void;
}

/** Backfills solved problems from a public LeetCode profile — useful for
 * solves that predate installing the extension. Hides itself when no proxy
 * is configured, since browsers can't call LeetCode's API directly. A
 * successful import also enrolls the username for the daily 9pm IST
 * auto-import (see `supabase/functions/daily-import`), so this doubles as
 * that feature's setup UI — and once enrolled, "Sync now" re-runs it for
 * the saved username with one click, no retyping needed. */
export function ImportLeetCode({ userId, onImported }: Props) {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string>();
  const [result, setResult] = useState<LeetCodeImportResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLeetCodeUsername(userId)
      .then((saved) => {
        setSavedUsername(saved);
        if (saved) setUsername((current) => current || saved);
      })
      .catch(() => {}); // non-critical — just skips the prefill/status line
  }, [userId]);

  if (!leetCodeProxyUrl) {
    return (
      <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500">
        <h3 className="font-semibold text-slate-900">Import from LeetCode</h3>
        <p className="mt-1">
          Not available yet — deploy <code className="rounded bg-slate-100 px-1">leetcode-proxy</code> and
          set <code className="rounded bg-slate-100 px-1">VITE_LEETCODE_PROXY_URL</code>. See{" "}
          <code className="rounded bg-slate-100 px-1">supabase/README.md</code>.
        </p>
      </div>
    );
  }

  async function runImport(name: string) {
    setLoading(true);
    setError(undefined);
    setResult(undefined);
    try {
      const outcome = await importFromLeetCode(userId, name, leetCodeProxyUrl!);
      setResult(outcome);
      setSavedUsername(name);
      onImported();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void runImport(username);
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Import from LeetCode</h3>
        {savedUsername && (
          <button
            onClick={() => void runImport(savedUsername)}
            disabled={loading}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Syncing..." : "Sync now"}
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Backfills recent solves from a public profile — handy before the extension has seen everything.
      </p>

      {savedUsername && (
        <p className="mt-2 text-xs text-slate-400">
          Auto-imports daily at 9pm IST for <span className="font-medium">{savedUsername}</span>. "Sync
          now" runs it immediately.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          required
          placeholder={savedUsername ? "Different username?" : "LeetCode username"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          {loading ? "Importing..." : "Import"}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <p className="mt-2 text-sm text-green-700">
          {result.summary.totalSolved} solved on LeetCode ({result.summary.easySolved}E /{" "}
          {result.summary.mediumSolved}M / {result.summary.hardSolved}H) — synced {result.imported} recent
          solve{result.imported === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
