import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Clock3, Download, ListChecks, MessageCircleQuestion, Plus, Wrench } from "lucide-react";
import type { TargetFlagLevel } from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { deleteTarget, listDetailedTargets, requeueTarget, setTargetFlagLevel, type DetailedTarget } from "../lib/api.js";
import { downloadTargetsAsCsv } from "../lib/downloadCsv.js";
import { getErrorMessage } from "../lib/errors.js";
import { useStudyDesk } from "../lib/studyDesk.js";
import { AddTargetForm } from "../components/AddTargetForm.js";
import { CsvUploader } from "../components/CsvUploader.js";
import { TargetsTable } from "../components/TargetsTable.js";
import { PracticeSession } from "../components/practice/PracticeSession.js";
import { PracticeTimer } from "../components/practice/PracticeTimer.js";
import { StuckDesk } from "../components/study/StuckDesk.js";
import { GoogleSkillsLog } from "../components/study/GoogleSkillsLog.js";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  SectionHeader,
  PageHeader,
  SkeletonRows,
  useToast,
} from "../ui/index.js";

/** Where solving happens: run a focused session, or manage the list the
 * session draws from. The session leads, because working the queue is the
 * point and list management is the setup for it. */
export function PracticePage() {
  const { mode, track } = useStudyDesk();
  const { userId, targets, refresh, refreshTick, loading } = useUserData();
  const toast = useToast();
  const [error, setError] = useState<string>();
  const [detailed, setDetailed] = useState<DetailedTarget[]>();
  const [showPlanner, setShowPlanner] = useState(false);
  const [tab, setTab] = useState<"active" | "yellow" | "red" | "solved">("active");

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

  // These aren't mutually exclusive — a target keeps its plain done/pending
  // status regardless of category, so a solved-and-categorized target shows
  // up under both Solved and its category tab, not one or the other.
  const activeTargets = targets.filter((t) => t.status !== "done");
  const solvedTargets = targets.filter((t) => t.status === "done");
  const seeLaterTargets = targets.filter((t) => t.flagLevel === "yellow");
  const doLaterTargets = targets.filter((t) => t.flagLevel === "red");
  const done = solvedTargets.length;
  const hasTargets = targets.length > 0;
  const visibleTargets = { active: activeTargets, yellow: seeLaterTargets, red: doLaterTargets, solved: solvedTargets }[tab];

  async function handleCategorize(id: string, category: TargetFlagLevel, notes: string) {
    try {
      await setTargetFlagLevel(id, category, notes);
      refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleRepeat(id: string) {
    try {
      await requeueTarget(id);
      setTab("active");
      refresh();
      toast("Back in your active list");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  // GATE and CAT are purposefully independent from LeetCode targets. Their
  // work is a concise recall desk, not a second attempt to force exam questions
  // through the coding-problem and GitHub-sync schema. Google Skills has no
  // "solve a problem" workflow at all, so it gets its own log instead.
  if (mode === "google-skills") {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader eyebrow={track.label} title={track.deskTitle} description={track.capturePrompt} />
        <GoogleSkillsLog trackLabel={track.label} />
      </div>
    );
  }
  if (mode !== "leetcode") return <StuckDesk mode={mode} />;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="LeetCode"
        title="Practice"
        description="Work through a focused run, or shape the list it draws from."
        action={
          <Link to="/doubts">
            <Button size="sm" variant="ghost">
              <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden />
              Community doubts
            </Button>
          </Link>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <PracticeTimer />

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

        {hasTargets && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={tab === "active" ? "secondary" : "ghost"} onClick={() => setTab("active")}>
              Active ({activeTargets.length})
            </Button>
            <Button size="sm" variant={tab === "yellow" ? "secondary" : "ghost"} onClick={() => setTab("yellow")}>
              <Clock3 className="h-3.5 w-3.5" aria-hidden />
              See later ({seeLaterTargets.length})
            </Button>
            <Button size="sm" variant={tab === "red" ? "secondary" : "ghost"} onClick={() => setTab("red")}>
              <Wrench className="h-3.5 w-3.5" aria-hidden />
              Do later ({doLaterTargets.length})
            </Button>
            <Button size="sm" variant={tab === "solved" ? "secondary" : "ghost"} onClick={() => setTab("solved")}>
              <Archive className="h-3.5 w-3.5" aria-hidden />
              Solved ({solvedTargets.length})
            </Button>
          </div>
        )}

        {loading ? (
          <SkeletonRows rows={6} />
        ) : hasTargets ? (
          <TargetsTable targets={visibleTargets} onRemove={handleRemove} onCategorize={handleCategorize} onRepeat={handleRepeat} />
        ) : (
          <Card className="p-4">
            <p className="text-sm text-text-muted">Your targets will appear here.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
