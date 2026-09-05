import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Layers, RotateCcw } from "lucide-react";
import { type StuckDeskTrack, useStudyDesk } from "../../lib/studyDesk.js";
import { useUserData } from "../../lib/userData.js";
import { useGoals } from "../../lib/useGoals.js";
import { GoalDeck } from "../goals/GoalDeck.js";
import {
  Button,
  Chassis,
  MonoLabel,
  PageHeader,
  Reveal,
  Panel,
  ProgressBar,
  SectionHeader,
  SkeletonRows,
  StatusDot,
  TelemetryBar,
} from "../../ui/index.js";

/**
 * The exam tracks' home. This used to be three counters and an encouraging
 * sentence, on the reasoning that GATE and CAT were a lighter side-feature
 * next to LeetCode. That was the wrong shape: an exam has a fixed date and a
 * syllabus, which is *more* structure than a problem queue, not less.
 *
 * So it now leads with the same thing the LeetCode dashboard does — the
 * nearest dated commitment and whether the work is keeping up with it — and
 * follows with coverage across the track's own subjects, which is the exam
 * equivalent of topic mastery.
 */
export function StudyTrackDashboard({ mode }: { mode: StuckDeskTrack }) {
  const { track, stuckItems } = useStudyDesk();
  const { userId } = useUserData();
  const { goals, loading: goalsLoading, refresh: refreshGoals } = useGoals(userId);

  const items = stuckItems.filter((item) => item.track === mode);
  const stuck = items.filter((item) => item.status === "stuck").length;
  const revisit = items.filter((item) => item.status === "revisit").length;
  const cleared = items.filter((item) => item.status === "cleared").length;

  // Coverage per subject, from the track's own declared syllabus rather than
  // whatever subjects happen to appear in saved items — a subject with nothing
  // logged against it is the most informative row on the list.
  const bySubject = track.subjects.map((subject) => {
    const subjectItems = items.filter((item) => item.subject === subject);
    return {
      subject,
      total: subjectItems.length,
      cleared: subjectItems.filter((item) => item.status === "cleared").length,
    };
  });
  const touched = bySubject.filter((s) => s.total > 0).length;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`${track.label} · ${track.kicker}`}
        title="A place to return to difficult work."
        description={track.description}
      />

      {/* The same dated spine as every other track. Progress on an exam goal is
       * counted as items worked through and cleared — the only quantity this
       * track actually records. */}
      {goalsLoading ? (
        <SkeletonRows rows={2} />
      ) : (
        <GoalDeck
          goals={goals}
          track={mode}
          userId={userId}
          progressFor={() => cleared}
          onChanged={refreshGoals}
        />
      )}

      <Reveal as="section">
      <Chassis className="overflow-hidden">
        <TelemetryBar left={<span>{track.label} / recall desk</span>} right={<span>Keep the useful friction</span>} />
        <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Panel mark>
            <div className="flex items-center gap-2">
              <StatusDot tone={stuck > 0 ? "danger" : "muted"} />
              <MonoLabel>Stuck now</MonoLabel>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{stuck}</p>
            <p className="mt-1 text-[13px] leading-5 text-text-muted">Questions where the method or concept is still unclear.</p>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2">
              <StatusDot tone={revisit > 0 ? "warning" : "muted"} />
              <MonoLabel>Ready to revisit</MonoLabel>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{revisit}</p>
            <p className="mt-1 text-[13px] leading-5 text-text-muted">Saved with enough context for a better second attempt.</p>
          </Panel>
          <Panel>
            <div className="flex items-center gap-2">
              <StatusDot tone={cleared > 0 ? "success" : "muted"} />
              <MonoLabel>Cleared</MonoLabel>
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{cleared}</p>
            <p className="mt-1 text-[13px] leading-5 text-text-muted">Questions you have come back to and worked through.</p>
          </Panel>
        </div>
      </Chassis>
      </Reveal>

      {/* Subject coverage — the exam-track answer to topic mastery. */}
      <Reveal as="section" className="flex flex-col gap-3">
        <SectionHeader
          title="Subject coverage"
          description={`${touched} of ${track.subjects.length} subjects have something logged`}
          icon={<Layers className="h-4 w-4 text-text-muted" aria-hidden />}
        />
        <Chassis className="stagger divide-y divide-border">
          {bySubject.map((row) => (
            <div key={row.subject} className="flex items-center gap-4 px-4 py-3">
              <span className="min-w-0 flex-1 truncate text-sm text-text">{row.subject}</span>
              {row.total === 0 ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
                  Nothing logged
                </span>
              ) : (
                <>
                  <ProgressBar
                    value={row.cleared}
                    max={row.total}
                    className="hidden w-40 sm:block"
                    label={`${row.subject}: ${row.cleared} of ${row.total} cleared`}
                  />
                  <span className="shrink-0 font-mono text-[11px] text-text-muted tnum">
                    {row.cleared}/{row.total}
                  </span>
                </>
              )}
            </div>
          ))}
        </Chassis>
      </Reveal>

      <Reveal className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="border border-border bg-elevated p-5 sm:p-6">
          <SectionHeader
            title="One useful next move"
            description="A strong review habit starts by making the return easy."
            icon={<BookOpenCheck className="h-4 w-4 text-brand" aria-hidden />}
          />
          <p className="mt-6 max-w-xl text-title font-medium text-text">
            {items.length === 0
              ? "Save the next question that slows you down. You are not making a backlog—you are leaving a clear trail back into the work."
              : revisit > 0
                ? "Pick one item marked for revisit. Read your original note first, then attempt the question before looking for a solution."
                : "Choose one open question and add the sentence that explains what stopped you. It turns a vague miss into a deliberate revisit."}
          </p>
          <Link to="/practice" className="mt-6 inline-flex">
            <Button variant="primary" className="active:scale-[0.985]">
              {items.length === 0 ? "Open the desk" : "Return to the desk"}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </section>

        <aside className="relative isolate overflow-hidden border border-border bg-surface p-5">
          <img
            src="/study-desk-archive.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.13] grayscale mix-blend-multiply dark:opacity-[0.08] dark:mix-blend-screen"
          />
          <div className="flex h-7 w-7 items-center justify-center border border-border bg-elevated text-brand">
            <RotateCcw className="h-4 w-4" aria-hidden />
          </div>
          <h2 className="mt-4 text-sm font-semibold text-text">The revisit rule</h2>
          <p className="mt-2 text-[13px] leading-6 text-text-muted">
            Do not save every question. Save the ones whose mistake you could explain in a sentence and want to understand more deeply.
          </p>
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Recall over accumulation
          </div>
        </aside>
      </Reveal>
    </div>
  );
}
