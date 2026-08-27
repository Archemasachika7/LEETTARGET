import { useState } from "react";
import { useUserData } from "../lib/userData.js";
import { DifficultyBreakdown } from "../components/DifficultyBreakdown.js";
import { SolutionMappingTable } from "../components/SolutionMappingTable.js";
import { Leaderboard } from "../components/Leaderboard.js";
import { ProgressSummary } from "../components/ProgressSummary.js";
import { ChoiceGroup } from "../ui/index.js";

type View = "overview" | "solutions" | "leaderboard";

/** "How am I doing?" — both against your own history (overview, solutions)
 * and against everyone else (leaderboard). Grouped as views of one question
 * rather than scattered across separate nav entries. */
export function ProgressPage() {
  const { userId, targets, solved, refreshTick } = useUserData();
  const [view, setView] = useState<View>("overview");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Progress</h1>
          <p className="mt-1 text-sm text-text-muted">What you've solved, and how it maps to your repo.</p>
        </div>
        <ChoiceGroup
          label="Progress view"
          value={view}
          onChange={setView}
          options={[
            { value: "overview", label: "Overview" },
            { value: "solutions", label: "Solutions" },
            { value: "leaderboard", label: "Leaderboard" },
          ]}
        />
      </header>

      {view === "overview" && (
        <div className="flex flex-col gap-6">
          <ProgressSummary targets={targets} solved={solved} />
          <DifficultyBreakdown userId={userId} refreshKey={refreshTick} />
        </div>
      )}

      {view === "solutions" && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            Where LeetTarget thinks each solution lives in your repo — correct it if the guess is wrong.
          </p>
          <SolutionMappingTable userId={userId} refreshKey={refreshTick} />
        </section>
      )}

      {view === "leaderboard" && <Leaderboard currentUserId={userId} />}
    </div>
  );
}
