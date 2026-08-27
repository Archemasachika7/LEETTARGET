import { useMemo, useState } from "react";
import { Upload } from "lucide-react";
import { parseTargetsCsv, type CsvTargetRow, type Target } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import { replaceCsvTargets } from "../lib/api.js";
import { Button, Card, ErrorNote, SectionHeader, useToast } from "../ui/index.js";

interface Props {
  userId: string;
  /** Current targets, used only to diff a freshly parsed CSV against what
   * re-uploading would actually change (pending, CSV-sourced rows — the only
   * ones `replaceCsvTargets` touches). */
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
  const toast = useToast();

  const pendingCsvTargets = useMemo(
    () => targets.filter((t) => t.source === "csv" && t.status === "pending"),
    [targets]
  );

  const diff = useMemo(() => {
    if (rows.length === 0) return undefined;
    const existingByKey = new Map(pendingCsvTargets.map((t) => [t.slug ?? t.customUrl ?? t.id, t]));
    const newKeys = new Set(rows.map(rowKey));
    const added = rows.filter((r) => !existingByKey.has(rowKey(r)));
    const removed = pendingCsvTargets.filter((t) => !newKeys.has(t.slug ?? t.customUrl ?? t.id));
    return { added, removed, unchanged: rows.length - added.length };
  }, [rows, pendingCsvTargets]);

  async function handleFile(file: File) {
    setError(undefined);
    try {
      const parsed = parseTargetsCsv(await file.text());
      setRows(parsed);
      setFilename(file.name);
    } catch (err) {
      setRows([]);
      setError(getErrorMessage(err));
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(undefined);
    try {
      await replaceCsvTargets(userId, rows);
      onImported();
      toast(`Imported ${rows.length} target${rows.length === 1 ? "" : "s"}`);
      setRows([]);
      setFilename(undefined);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="Upload a targets CSV"
        description="A question column and a link column. Re-upload anytime — solved targets are kept."
        icon={<Upload className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border px-4 py-6 text-center transition-colors duration-fast hover:border-brand/50 hover:bg-brand/5">
        <Upload className="h-5 w-5 text-text-muted" aria-hidden />
        <span className="mt-2 text-[13px] font-medium text-text">Choose a CSV file</span>
        <span className="mt-0.5 text-[12px] text-text-muted">or drop it here</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </label>

      {error && <ErrorNote>{error}</ErrorNote>}

      {rows.length > 0 && diff && (
        <div className="animate-enter flex flex-col gap-3">
          <p className="text-[13px] text-text-secondary">
            Parsed <span className="font-mono tabular-nums text-text">{rows.length}</span> row
            {rows.length === 1 ? "" : "s"} from <span className="font-medium text-text">{filename}</span>.
          </p>

          {pendingCsvTargets.length > 0 && (
            <p className="flex flex-wrap gap-x-3 text-[13px]">
              <span className="text-success">+{diff.added.length} new</span>
              <span className={diff.removed.length > 0 ? "text-danger" : "text-text-muted"}>
                −{diff.removed.length} removed
              </span>
              <span className="text-text-muted">{diff.unchanged} unchanged</span>
            </p>
          )}

          {diff.removed.length > 0 && (
            <div className="rounded border border-warning/25 bg-warning/10 p-2.5 text-[12px] text-warning">
              Saving removes {diff.removed.length} target{diff.removed.length === 1 ? "" : "s"} no longer in this file:
              <ul className="mt-1 list-inside list-disc">
                {diff.removed.slice(0, 5).map((t) => (
                  <li key={t.id} className="truncate">
                    {t.customTitle ?? t.customUrl}
                  </li>
                ))}
                {diff.removed.length > 5 && <li>and {diff.removed.length - 5} more</li>}
              </ul>
            </div>
          )}

          <Button variant="primary" onClick={handleSave} loading={saving} loadingText="Saving…" className="self-start">
            Save as targets
          </Button>
        </div>
      )}
    </Card>
  );
}
