import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState } from "react";
import { buildSolutionPath, DEFAULT_PATH_TEMPLATE, type GithubLink } from "@leettarget/shared";
import {
  getGithubLink,
  listSolvedWithProblems,
  updateSolvedGithubPath,
  type SolvedWithProblem,
} from "../lib/api.js";

interface Props {
  userId: string;
  refreshKey: number;
}

function githubFileUrl(link: GithubLink | undefined, path: string): string | undefined {
  if (!link || !path) return undefined;
  return `https://github.com/${link.owner}/${link.repo}/blob/${link.branch}/${path}`;
}

/** Lets the user see (and correct) the GitHub file path LeetTarget
 * associates with each solve. The extension records the real path it
 * committed to when it can, but for solves without one (a LeetCode import,
 * or a repo that doesn't follow the `{difficulty}/{slug}` guess) this is
 * where that gets fixed by hand. */
export function SolutionMappingTable({ userId, refreshKey }: Props) {
  const [rows, setRows] = useState<SolvedWithProblem[]>();
  const [githubLink, setGithubLink] = useState<GithubLink>();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string>();
  const [error, setError] = useState<string>();

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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingId(undefined);
    }
  }

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!rows) return null;

  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No solves yet — this fills in once a solve syncs from the extension or an import.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">Problem</th>
            <th className="px-3 py-2 font-medium">Language</th>
            <th className="px-3 py-2 font-medium">GitHub path</th>
            <th className="px-3 py-2 font-medium" />
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800">
          {rows.map((row) => {
            const suggested = buildSolutionPath(
              githubLink?.pathTemplate ?? DEFAULT_PATH_TEMPLATE,
              { slug: row.problemSlug, difficulty: row.difficulty },
              row.language ?? "unknown"
            );
            const draft = drafts[row.id] ?? row.githubPath ?? "";
            const fileUrl = githubFileUrl(githubLink, row.githubPath ?? "");

            return (
              <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
                <td className="px-3 py-2">
                  <a
                    href={row.problemUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {row.problemTitle}
                  </a>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{row.difficulty}</div>
                </td>
                <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.language ?? "—"}</td>
                <td className="px-3 py-2">
                  <input
                    value={draft}
                    placeholder={suggested}
                    onChange={(e) => setDrafts((d) => ({ ...d, [row.id]: e.target.value }))}
                    className="w-full min-w-[16rem] rounded border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-slate-400 transition-colors duration-200 hover:text-blue-600 dark:text-slate-500 dark:hover:text-blue-400"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => handleSave(row.id)}
                      disabled={savingId === row.id || !draft.trim() || draft === row.githubPath}
                      className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white transition-colors duration-200 disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
                    >
                      {savingId === row.id ? "Saving..." : "Save"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
