import { useStudyDesk } from "../../lib/studyDesk.js";
import { useUserData } from "../../lib/userData.js";
import { useGoals } from "../../lib/useGoals.js";
import { GoalDeck } from "../goals/GoalDeck.js";
import { GoogleSkillsLog } from "./GoogleSkillsLog.js";
import { PageHeader, SkeletonRows } from "../../ui/index.js";
import { useSkillItems } from "../../lib/useSkillItems.js";

/** The Google Skills track's home. Same dated spine as every other track
 * (a `GoalDeck` up top, progress read as items marked done), followed by
 * the manually-logged skill list — see `GoogleSkillsLog` for why there's
 * nothing synced to show instead. */
export function GoogleSkillsDashboard() {
  const { track } = useStudyDesk();
  const { userId } = useUserData();
  const { goals, loading: goalsLoading, refresh: refreshGoals } = useGoals(userId);
  const { items } = useSkillItems(userId);
  const done = items.filter((item) => item.status === "done").length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`${track.label} · ${track.kicker}`}
        title="Badges, courses and skills, tracked honestly."
        description={track.description}
      />

      {goalsLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <GoalDeck goals={goals} track="google-skills" userId={userId} progressFor={() => done} onChanged={refreshGoals} />
      )}

      <GoogleSkillsLog trackLabel={track.label} />
    </div>
  );
}
