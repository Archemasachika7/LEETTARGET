import { useEffect, useState, type FormEvent } from "react";
import { GitBranch, FolderSync } from "lucide-react";
import { DEFAULT_PATH_TEMPLATE, parseRepoInput, type GithubLink } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import { getGithubLink, syncFromGithubRepo, upsertGithubLink } from "../lib/api.js";
import { leetCodeProxyUrl } from "../lib/leetcodeConfig.js";
import { Badge, Button, Card, ErrorNote, Field, Input, SectionHeader, useToast } from "../ui/index.js";

interface Props {
  userId: string;
  /** Called after a successful sync so the rest of the app (solved count,
   * difficulty chart) picks up whatever was just backfilled. */
  onSynced?: () => void;
}

/** Points Waypoint at the GitHub repo solutions live in (LeetHub-compatible
 * — no reorganising needed). "Sync from GitHub" runs the other direction: for
 * a repo that already has solutions committed, it scans and backfills solved
 * status rather than only tracking new solves. */
export function RepoMappingForm({ userId, onSynced }: Props) {
  const [repoInput, setRepoInput] = useState("");
  const [branch, setBranch] = useState("main");
  const [pathTemplate, setPathTemplate] = useState(DEFAULT_PATH_TEMPLATE);
  const [saved, setSaved] = useState<GithubLink>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string>();
  // In memory only for the sync request itself — never persisted to
  // github_links, never sent to Supabase.
  const [githubToken, setGithubToken] = useState("");
  const toast = useToast();

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
      toast("Repo mapping saved");
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
      const result = await syncFromGithubRepo(userId, saved, leetCodeProxyUrl, githubToken || undefined);
      setSyncResult(
        result.matched === 0
          ? "No matching problems found in that repo."
          : `Found ${result.matched} solved problem${result.matched === 1 ? "" : "s"} — ` +
              `${result.newlySynced} newly synced, ${result.pathsFilled} file path${
                result.pathsFilled === 1 ? "" : "s"
              } filled in.`
      );
      onSynced?.();
      toast("Repo scan complete");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="GitHub repo"
        description="Where your solutions live — e.g. your existing LeetHub repo."
        icon={<GitBranch className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Repository" htmlFor="repo" className="sm:col-span-2">
          <Input id="repo" required placeholder="owner/repo" value={repoInput} onChange={(e) => setRepoInput(e.target.value)} />
        </Field>
        <Field label="Branch" htmlFor="branch">
          <Input id="branch" required placeholder="main" value={branch} onChange={(e) => setBranch(e.target.value)} />
        </Field>
      </div>

      <Field
        label="Path template"
        htmlFor="path-template"
        hint="Where the extension expects each solution to live."
      >
        <Input
          id="path-template"
          required
          value={pathTemplate}
          onChange={(e) => setPathTemplate(e.target.value)}
          className="font-mono text-[13px]"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" loading={saving} loadingText="Saving…">
          Save mapping
        </Button>
        {saved && (
          <Badge tone="success">
            {saved.owner}/{saved.repo} @ {saved.branch}
          </Badge>
        )}
      </div>

      {saved && (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <SectionHeader
            title="Backfill from this repo"
            description="Already have solutions committed there? Scan the repo and record them as solved."
            icon={<FolderSync className="h-4 w-4 text-text-muted" aria-hidden />}
          />
          <Field
            label="GitHub token"
            htmlFor="gh-token"
            hint="Only needed for a private repo. Used for this one request — never saved, never sent anywhere but GitHub."
          >
            <Input
              id="gh-token"
              type="password"
              placeholder="github_pat_…"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
            />
          </Field>
          <Button type="button" onClick={handleSync} loading={syncing} loadingText="Scanning repo…" className="self-start">
            Sync from GitHub
          </Button>
          {syncResult && <p className="text-[13px] text-success">{syncResult}</p>}
        </div>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}
    </Card>
  );
}
