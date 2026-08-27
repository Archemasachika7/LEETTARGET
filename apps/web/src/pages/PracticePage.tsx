import { useEffect, useState } from "react";
import { Download, ListChecks, Plus } from "lucide-react";
import { useUserData } from "../lib/userData.js";
import { deleteTarget, listDetailedTargets, type DetailedTarget } from "../lib/api.js";
import { downloadTargetsAsCsv } from "../lib/downloadCsv.js";
import { getErrorMessage } from "../lib/errors.js";
import { AddTargetForm } from "../components/AddTargetForm.js";
import { CsvUploader } from "../components/CsvUploader.js";
import { TargetsTable } from "../components/TargetsTable.js";
import { PracticeSession } from "../components/practice/PracticeSession.js";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  SectionHeader,
  SkeletonRows,
  useToast,
} from "../ui/index.js";

/** Where solving happens: run a focused session, or manage the list the
 * session draws from. The session leads, because working the queue is the
 * point and list management is the setup for it. */
export function PracticePage() {
  const { userId, targets, refresh, refreshTick, loading } = useUserData();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [detailed, setDetailed] = useState<DetailedTarget[]>();
  const [showPlanner, setShowPlanner] = useState(false);

  useEffect(() => {
    listDetailedTargets(userId)
      .then(setDetailed)
      .catch((err) => setError(getErrorMessage(err)));
  }, [userId, refreshTick]);

  async function handleRemove(id: string) {
    try {
      await deleteTarget(id);
      refresh();
      toast("Target removed");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  const done = targets.filter((t) => t.status === "done").length;
  const hasTargets = targets.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Practice</h1>
        <p className="mt-1 text-sm text-text-muted">Work through a focused run, or shape the list it draws from.</p>
      </header>

      {error && <ErrorNote>{error}</ErrorNote>}

      {loading || !detailed ? (
        <SkeletonRows rows={3} />
      ) : !hasTargets ? (
        <EmptyState
          title="Nothing to practise yet."
          description="A practice session runs through problems from your target list. Add one below, or upload a CSV of a roadmap you're working through."
          action={
            <Button variant="primary" size="sm" onClick={() => setShowPlanner(true)}>
              Add targets
            </Button>
          }
        />
      ) : (
        <PracticeSession targets={detailed} onFinished={refresh} />
      )}

      <section className="flex flex-col gap-4">
        <SectionHeader
          title="Your list"
          description={`${done} of ${targets.length} done`}
          icon={<ListChecks className="h-4 w-4 text-text-muted" aria-hidden />}
          action={
            <div className="flex gap-2">
              {hasTargets && (
                <Button size="sm" onClick={() => downloadTargetsAsCsv(targets, "my-targets")}>
                  <Download className="h-3.5 w-3.5" aria-hidden />
                  CSV
                </Button>
              )}
              <Button size="sm" variant={showPlanner ? "ghost" : "secondary"} onClick={() => setShowPlanner((s) => !s)}>
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {showPlanner ? "Hide" : "Add"}
              </Button>
            </div>
          }
        />

        {/* Collapsed by default once a list exists: on a return visit the
         * reader wants to practise, not to re-import. */}
        {(showPlanner || !hasTargets) && (
          <div className="animate-enter grid gap-4 lg:grid-cols-2">
            <AddTargetForm userId={userId} onAdded={refresh} />
            <CsvUploader userId={userId} targets={targets} onImported={refresh} />
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={6} />
        ) : hasTargets ? (
          <TargetsTable targets={targets} onRemove={handleRemove} />
        ) : (
          <Card className="p-4">
            <p className="text-sm text-text-muted">Your targets will appear here.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
