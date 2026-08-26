import { useState } from "react";
import { parseTargetsCsv, type CsvTargetRow } from "@leettarget/shared";
import { replaceCsvTargets } from "../lib/api.js";

interface Props {
  userId: string;
  onImported: () => void;
}

/** Upload (or re-upload, to "update the map") a CSV of target problems.
 * Accepts `Question,Link` where Link is a plain URL or an Excel
 * `=HYPERLINK(url,"label")` formula. */
export function CsvUploader({ userId, onImported }: Props) {
  const [rows, setRows] = useState<CsvTargetRow[]>([]);
  const [filename, setFilename] = useState<string>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

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

      {rows.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-slate-600">
            Parsed {rows.length} row{rows.length === 1 ? "" : "s"} from{" "}
            <span className="font-medium">{filename}</span>.
          </p>
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
