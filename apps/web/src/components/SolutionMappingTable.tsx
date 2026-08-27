import { useEffect, useState } from "react";
import { ExternalLink, FileCode2 } from "lucide-react";
import { buildSolutionPath, DEFAULT_PATH_TEMPLATE, type GithubLink } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import {
  getGithubLink,
  listSolvedWithProblems,
  updateSolvedGithubPath,
  type SolvedWithProblem,
} from "../lib/api.js";
import { Button, Card, DifficultyBadge, EmptyState, ErrorNote, Input, SkeletonRows, useToast } from "../ui/index.js";

interface Props {
  userId: string;
  refreshKey: number;
}

function githubFileUrl(link: GithubLink | undefined, path: string): string | undefined {
  if (!link || !path) return undefined;
  return `https://github.com/${link.owner}/${link.repo}/blob/${link.branch}/${path}`;
}

/** Lets the reader see (and correct) the GitHub file path associated with
 * each solve. The extension records the real path when it can; for solves
 * without one — a LeetCode import, or a repo that doesn't follow the guessed
 * template — this is where that gets fixed by hand. */
export function SolutionMappingTable({ userId, refreshKey }: Props) {
  const [rows, setRows] = useState<SolvedWithProblem[]>();
  const [githubLink, setGithubLink] = useState<GithubLink>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState<string>();
  const toast = useToast();

  useEffect(() => {
    Promise.all([listSolvedWithProblems(userId), getGithubLink(userId)])
      .then(([solved, link]) => {
        setRows(solved);
        setGithubLink(link);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [userId, refreshKey]);

  async function handleSave(id: string) {
    const path = (drafts[id] ?? "").trim();
    if (!path) return;
    setSavingId(id);
    setError(undefined);
    try {
      await updateSolvedGithubPath(id, path);
      setRows((prev) => prev?.map((r) => (r.id === id ? { ...r, githubPath: path } : r)));
      toast("Path updated");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(undefined);
    }
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!rows) return <SkeletonRows rows={5} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<FileCode2 className="h-6 w-6" aria-hidden />}
        title="No solves recorded yet."
        description="This fills in once a solve syncs from the extension, a LeetCode import, or a GitHub repo scan."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const suggested = buildSolutionPath(
            githubLink?.pathTemplate ?? DEFAULT_PATH_TEMPLATE,
            { slug: row.problemSlug, difficulty: row.difficulty },
            row.language ?? "unknown"
          );
          const draft = drafts[row.id] ?? row.githubPath ?? "";
          const fileUrl = githubFileUrl(githubLink, row.githubPath ?? "");
          const dirty = draft.trim() !== "" && draft !== row.githubPath;

          return (
            <li key={row.id} className="flex flex-col gap-3 p-3 transition-colors duration-fast hover:bg-surface md:flex-row md:items-center">
              <div className="min-w-0 md:w-64 md:shrink-0">
                <a
                  href={row.problemUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm text-text transition-colors duration-fast hover:text-brand"
                >
                  {row.problemTitle}
                </a>
                <div className="mt-1 flex items-center gap-3">
                  <DifficultyBadge difficulty={row.difficulty} />
                  <span className="font-mono text-[11px] text-text-muted">{row.language ?? "—"}</span>
                </div>
              </div>

              <Input
                value={draft}
                placeholder={suggested}
                aria-label={`GitHub path for ${row.problemTitle}`}
                onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                className="flex-1 font-mono text-[12px]"
              />

              <div className="flex shrink-0 items-center gap-2">
                {fileUrl && (
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] text-text-muted transition-colors duration-fast hover:bg-surface hover:text-brand"
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    View
                  </a>
                )}
                <Button size="sm" onClick={() => handleSave(row.id)} disabled={!dirty} loading={savingId === row.id}>
                  Save
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
