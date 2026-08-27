import { Link } from "react-router-dom";
import { ArrowRight, ListChecks } from "lucide-react";
import { useUserData } from "../lib/userData.js";
import { ProgressSummary } from "../components/ProgressSummary.js";
import { DifficultyBreakdown } from "../components/DifficultyBreakdown.js";
import { ImportLeetCode } from "../components/ImportLeetCode.js";
import { TargetsTable } from "../components/TargetsTable.js";
import { Button, EmptyState, SectionHeader, SkeletonRows } from "../ui/index.js";

export function DashboardPage() {
  const { userId, targets, solved, refreshTick, refresh, loading } = useUserData();

  return (
    <div className="flex flex-col gap-8">
      <ProgressSummary targets={targets} solved={solved} />

      <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />

      <ImportLeetCode userId={userId} onImported={refresh} />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title="Recent targets"
          icon={<ListChecks className="h-4 w-4 text-text-muted" aria-hidden />}
          action={
            <Link to="/practice">
              <Button size="sm" variant="ghost">
                All targets
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </Link>
          }
        />
        {loading ? (
          <SkeletonRows rows={4} />
        ) : targets.length === 0 ? (
          <EmptyState
            title="No targets yet."
            description="Targets are the problems you plan to solve. Add one by hand or upload a CSV to build your list."
            action={
              <Link to="/practice">
                <Button variant="primary" size="sm">
                  Add targets
                </Button>
              </Link>
            }
          />
        ) : (
          <TargetsTable targets={targets.slice(0, 8)} />
        )}
      </section>
    </div>
  );
}
