import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState } from "react";
import type { LeaderboardEntry, Target } from "@leettarget/shared";
import { listLeaderboard, listTargets } from "../lib/api.js";
import { downloadTargetsAsCsv } from "../lib/downloadCsv.js";
import { DifficultyBreakdown } from "./DifficultyBreakdown.js";
import { TargetsTable } from "./TargetsTable.js";

interface Props {
  currentUserId: string;
}

function displayNameFor(entry: LeaderboardEntry): string {
  return entry.displayName || entry.leetcodeUsername || "Anonymous";
}

/** Public leaderboard — every signed-in user with at least one target or
 * solve, ranked by solved count. Clicking a row opens that user's profile:
 * their difficulty breakdown and full target list, both readable
 * cross-user now (see migration 0004_leaderboard.sql), so you can size up
 * — or borrow — someone else's target list as your own competition set. */
export function Leaderboard({ currentUserId }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>();
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<LeaderboardEntry>();

  useEffect(() => {
    listLeaderboard()
      .then(setEntries)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;

  if (selected) {
    return (
      <ProfileDetail entry={selected} isSelf={selected.userId === currentUserId} onBack={() => setSelected(undefined)} />
    );
  }

  if (!entries) return null;

  if (entries.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Nobody's added a target or solved anything yet — the leaderboard fills in as people do.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">User</th>
            <th className="px-3 py-2 font-medium">Solved</th>
            <th className="px-3 py-2 font-medium">Targets done</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-slate-800">
          {entries.map((entry, i) => (
            <tr
              key={entry.userId}
              onClick={() => setSelected(entry)}
              className="cursor-pointer border-b border-slate-100 transition-colors duration-200 last:border-0 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/50"
            >
              <td className="px-3 py-2 text-slate-400 dark:text-slate-500">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                      ?
                    </div>
                  )}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {displayNameFor(entry)}
                    {entry.userId === currentUserId && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400 dark:text-slate-500">(you)</span>
                    )}
                  </span>
                </div>
              </td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{entry.solvedCount}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-slate-300">
                {entry.doneCount}/{entry.targetCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProfileDetail({ entry, isSelf, onBack }: { entry: LeaderboardEntry; isSelf: boolean; onBack: () => void }) {
  const [targets, setTargets] = useState<Target[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    listTargets(entry.userId)
      .then(setTargets)
      .catch((err) => setError(getErrorMessage(err)));
  }, [entry.userId]);

  return (
    <div className="flex flex-col gap-4">
      <button
        onClick={onBack}
        className="self-start text-sm text-slate-500 transition-colors duration-200 hover:underline dark:text-slate-400"
      >
        ← Back to leaderboard
      </button>

      <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          {entry.avatarUrl ? (
            <img src={entry.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
              ?
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              {displayNameFor(entry)} {isSelf && <span className="text-sm font-normal text-slate-400">(you)</span>}
            </h3>
            {entry.leetcodeUsername && (
              <p className="text-xs text-slate-400 dark:text-slate-500">LeetCode: {entry.leetcodeUsername}</p>
            )}
          </div>
        </div>
        {entry.bio && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{entry.bio}</p>}
      </div>

      <DifficultyBreakdown userId={entry.userId} refreshKey={0} />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {isSelf ? "Your targets" : "Their targets"}
          </h2>
          {targets && targets.length > 0 && (
            <button
              onClick={() => downloadTargetsAsCsv(targets, `${displayNameFor(entry)}-targets`)}
              className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition-colors duration-200 dark:border-slate-600 dark:text-slate-300"
            >
              Download CSV
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {targets && <TargetsTable targets={targets} />}
      </div>
    </div>
  );
}
