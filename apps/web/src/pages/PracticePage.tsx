import { Download, ListChecks } from "lucide-react";
import { useUserData } from "../lib/userData.js";
import { deleteTarget } from "../lib/api.js";
import { downloadTargetsAsCsv } from "../lib/downloadCsv.js";
import { getErrorMessage } from "../lib/errors.js";
import { AddTargetForm } from "../components/AddTargetForm.js";
import { CsvUploader } from "../components/CsvUploader.js";
import { TargetsTable } from "../components/TargetsTable.js";
import { Button, EmptyState, ErrorNote, SectionHeader, SkeletonRows, useToast } from "../ui/index.js";
import { useState } from "react";

/** Where the plan gets built and worked through: add targets, bulk-import a
 * list, and see everything still outstanding. */
export function PracticePage() {
  const { userId, targets, refresh, loading } = useUserData();
  const toast = useToast();
  const [error, setError] = useState<string>();

  async function handleRemove(id: string) {
    try {
      await deleteTarget(id);
      refresh();
      toast("Target removed");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Practice</h1>
        <p className="mt-1 text-sm text-text-muted">
          Build the list of problems you intend to solve, then work through it.
        </p>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid gap-4 lg:grid-cols-2">
        <AddTargetForm userId={userId} onAdded={refresh} />
        <CsvUploader userId={userId} targets={targets} onImported={refresh} />
      </div>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="All targets"
          description={`${targets.filter((t) => t.status === "done").length} of ${targets.length} done`}
          icon={<ListChecks className="h-4 w-4 text-text-muted" aria-hidden />}
          action={
            targets.length > 0 && (
              <Button size="sm" variant="secondary" onClick={() => downloadTargetsAsCsv(targets, "my-targets")}>
                <Download className="h-3.5 w-3.5" aria-hidden />
                Download CSV
              </Button>
            )
          }
        />
        {loading ? (
          <SkeletonRows rows={6} />
        ) : targets.length === 0 ? (
          <EmptyState
            title="Nothing to practise yet."
            description="Add a single problem above, or upload a CSV of a roadmap you're working through."
          />
        ) : (
          <TargetsTable targets={targets} onRemove={handleRemove} />
        )}
      </section>
    </div>
  );
}
