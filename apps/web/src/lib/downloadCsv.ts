import { exportTargetsCsv, type Target } from "@leettarget/shared";

function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Triggers a browser download of a target list as CSV, in the same
 * `Question,Link,Status` shape the CSV uploader reads — works for the
 * signed-in user's own targets, or (since RLS makes targets readable
 * cross-user — see migration 0004_leaderboard.sql) someone else's, viewed
 * from the leaderboard, so their list can be re-uploaded as a starting
 * point for your own. */
export function downloadTargetsAsCsv(targets: Target[], filenamePrefix: string): void {
  const rows = targets.map((t) => ({
    title: t.customTitle ?? t.problemId ?? "Untitled",
    url: t.customUrl ?? "",
    status: t.status,
  }));
  downloadTextFile(`${filenamePrefix}.csv`, exportTargetsCsv(rows));
}
