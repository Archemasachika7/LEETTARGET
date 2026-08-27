import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, RotateCcw, TimerReset } from "lucide-react";
import { type StudyTrack, useStudyDesk } from "../../lib/studyDesk.js";
import { Button, Chassis, MonoLabel, Panel, SectionHeader, StatusDot, TelemetryBar } from "../../ui/index.js";

/**
 * A small, honest home for the exam modes. It doesn't pretend CAT or GATE are
 * a solved-data product yet; it points the learner back to the questions they
 * deliberately parked, which is the behavior this feature is built to support.
 */
export function StudyTrackDashboard({ mode }: { mode: Exclude<StudyTrack, "leetcode"> }) {
  const { track, stuckItems } = useStudyDesk();
  const items = stuckItems.filter((item) => item.track === mode);
  const stuck = items.filter((item) => item.status === "stuck").length;
  const revisit = items.filter((item) => item.status === "revisit").length;
  const cleared = items.filter((item) => item.status === "cleared").length;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <MonoLabel index={track.shortLabel}>{track.kicker}</MonoLabel>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">A place to return to difficult work.</h1>
        <p className="mt-2 text-sm leading-6 text-text-muted">{track.description}</p>
      </header>

      <Chassis as="section" className="overflow-hidden">
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="border border-border bg-elevated p-5 sm:p-6">
          <SectionHeader
            title="One useful next move"
            description="A strong review habit starts by making the return easy."
            icon={<BookOpenCheck className="h-4 w-4 text-brand" aria-hidden />}
          />
          <p className="mt-6 max-w-xl text-lg font-medium leading-7 tracking-tight text-text">
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
            <TimerReset className="h-4 w-4" aria-hidden />
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
      </div>
    </div>
  );
}
