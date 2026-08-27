import { useEffect, useState, type FormEvent } from "react";
import { RefreshCw, Download } from "lucide-react";
import { getErrorMessage } from "../lib/errors.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { getLeetCodeUsername, importFromLeetCode, type LeetCodeImportResult } from "../lib/api.js";
import { Badge, Button, Card, ErrorNote, Input, SectionHeader, useToast } from "../ui/index.js";

interface Props {
  userId: string;
  onImported: () => void;
}

/** Backfills solved problems from a public LeetCode profile — useful for
 * solves that predate installing the extension. A successful import also
 * enrols the username for the daily 9pm IST auto-import, so this doubles as
 * that feature's setup UI. */
export function ImportLeetCode({ userId, onImported }: Props) {
  const [username, setUsername] = useState("");
  const [savedUsername, setSavedUsername] = useState<string>();
  const [result, setResult] = useState<LeetCodeImportResult>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const toast = useToast();

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
      <Card className="p-4">
        <SectionHeader title="Import from LeetCode" />
        <p className="mt-2 text-[13px] text-text-muted">
          Not available yet — deploy the <code className="rounded-sm bg-surface px-1 font-mono">leetcode-proxy</code>{" "}
          edge function and set <code className="rounded-sm bg-surface px-1 font-mono">VITE_LEETCODE_PROXY_URL</code>.
        </p>
      </Card>
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
      toast(`Synced ${outcome.imported} recent solve${outcome.imported === 1 ? "" : "s"}`);
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

  // Both buttons run the same import — "Sync now" simply skips retyping a
  // username that's already known, so it accepts whichever is available
  // rather than sitting disabled until a separate first-time import happens.
  const syncTarget = (savedUsername ?? username).trim();

  return (
    <Card className="p-4">
      <SectionHeader
        title="Import from LeetCode"
        description="Backfills recent solves from a public profile."
        icon={<Download className="h-4 w-4 text-text-muted" aria-hidden />}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => syncTarget && void runImport(syncTarget)}
            disabled={!syncTarget}
            loading={loading}
            loadingText="Syncing…"
            title={syncTarget ? undefined : "Enter a username below first"}
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Sync now
          </Button>
        }
      />

      {savedUsername && (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-text-muted">
          Auto-imports daily at 9pm IST for
          <Badge tone="brand">{savedUsername}</Badge>
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <Input
          required
          aria-label="LeetCode username"
          placeholder={savedUsername ? "Different username?" : "LeetCode username"}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Button type="submit" loading={loading} loadingText="Importing…" className="shrink-0">
          Import
        </Button>
      </form>

      {error && <ErrorNote className="mt-3">{error}</ErrorNote>}
      {result && (
        <p className="mt-3 text-[13px] text-success">
          <span className="font-mono tabular-nums">{result.summary.totalSolved}</span> solved on LeetCode (
          {result.summary.easySolved}E / {result.summary.mediumSolved}M / {result.summary.hardSolved}H) — synced{" "}
          <span className="font-mono tabular-nums">{result.imported}</span> recent solve
          {result.imported === 1 ? "" : "s"}.
        </p>
      )}
    </Card>
  );
}
