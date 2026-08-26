import { useMemo, useState } from "react";
import { parseTargetsCsv, type CsvTargetRow, type Target } from "@leettarget/shared";
import { replaceCsvTargets } from "../lib/api.js";

interface Props {
  userId: string;
  /** Current targets, used only to diff a freshly parsed CSV against what
   * re-uploading would actually change (pending, CSV-sourced rows — the
   * only ones `replaceCsvTargets` touches). */
  targets: Target[];
  onImported: () => void;
}

function rowKey(row: { slug?: string; url: string }): string {
  return row.slug ?? row.url;
}

/** Upload (or re-upload, to "update the map") a CSV of target problems.
 * Accepts `Question,Link` where Link is a plain URL or an Excel
 * `=HYPERLINK(url,"label")` formula. */
export function CsvUploader({ userId, targets, onImported }: Props) {
  const [rows, setRows] = useState<CsvTargetRow[]>([]);
  const [filename, setFilename] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const pendingCsvTargets = useMemo(
    () => targets.filter((t) => t.source === "csv" && t.status === "pending"),
    [targets]
  );

  const diff = useMemo(() => {
    if (rows.length === 0) return undefined;

    const existingByKey = new Map(
      pendingCsvTargets.map((t) => [t.slug ?? t.customUrl ?? t.id, t])
    );
    const newKeys = new Set(rows.map(rowKey));

    const added = rows.filter((r) => !existingByKey.has(rowKey(r)));
    const removed = pendingCsvTargets.filter((t) => !newKeys.has(t.slug ?? t.customUrl ?? t.id));
    const unchanged = rows.length - added.length;

    return { added, removed, unchanged };
  }, [rows, pendingCsvTargets]);

  async function handleFile(file: File) {
    setError(undefined);
    try {
      const text = await file.text();
      const parsed = parseTargetsCsv(text);
      setRows(parsed);
      setFilename(file.name);
    } catch (err) {
      setRows([]);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    try {
      await replaceCsvTargets(userId, rows);
      onImported();
      setRows([]);
      setFilename(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">Upload targets CSV</h3>
      <p className="mt-1 text-sm text-slate-500">
        Columns: a question/title column and a link column. Re-upload anytime
        to update the map — solved targets are kept.
      </p>

      <input
        type="file"
        accept=".csv,text/csv"
        className="mt-3 block text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {rows.length > 0 && diff && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            Parsed {rows.length} row{rows.length === 1 ? "" : "s"} from{" "}
            <span className="font-medium">{filename}</span>.
          </p>

          {pendingCsvTargets.length > 0 && (
            <p className="mt-1 text-sm">
              <span className="text-green-700">+{diff.added.length} new</span>
              {", "}
              <span className={diff.removed.length > 0 ? "text-red-600" : "text-slate-500"}>
                -{diff.removed.length} removed
              </span>
              {", "}
              <span className="text-slate-500">{diff.unchanged} unchanged</span>
            </p>
          )}

          {diff.removed.length > 0 && (
            <div className="mt-2 rounded border border-red-100 bg-red-50 p-2 text-sm text-red-700">
              Saving will remove {diff.removed.length} target
              {diff.removed.length === 1 ? "" : "s"} no longer in this file:
              <ul className="mt-1 list-inside list-disc">
                {diff.removed.map((t) => (
                  <li key={t.id} className="truncate">
                    {t.customTitle ?? t.customUrl}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <ul className="mt-2 max-h-48 overflow-auto text-sm">
            {rows.map((row, i) => (
              <li key={i} className="truncate">
                <a
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {row.title}
                </a>
              </li>
            ))}
          </ul>
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save as targets"}
          </button>
        </div>
      )}
    </div>
  );
}
