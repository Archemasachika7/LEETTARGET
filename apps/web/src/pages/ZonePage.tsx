import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ZONE_SYLLABI,
  allTopicIds,
  daysUntil,
  nextTopicStatus,
  type PdsaVizId,
  type TopicStatus,
  type ZoneExam,
} from "@leettarget/shared";
import { useUserData } from "../lib/userData.js";
import { useGoals } from "../lib/useGoals.js";
import { useStudyDesk } from "../lib/studyDesk.js";
import { listBoard, listProgress, setTopicStatus, type BoardRow } from "../lib/zone/api.js";
import { ZONE_SOURCES } from "../lib/zone/sources.js";
import { useZoneTheme } from "../lib/zone/useZoneTheme.js";
import { getErrorMessage } from "../lib/errors.js";
import { SheetLabel, SlideSwitch, ZButton } from "../components/zone/primitives.js";
import { SyllabusChecklist } from "../components/zone/SyllabusChecklist.js";
import { PdsaLab } from "../components/zone/viz/PdsaLab.js";
import { SchedulePanel } from "../components/zone/SchedulePanel.js";
import { AssignmentsPanel } from "../components/zone/AssignmentsPanel.js";
import { DoubtsPanel } from "../components/zone/DoubtsPanel.js";
import { SourcesPanel } from "../components/zone/SourcesPanel.js";
import { PeerBoard } from "../components/zone/PeerBoard.js";
import { cn } from "../lib/cn.js";

const ZONES = {
  gate: {
    exam: "gate-da" as ZoneExam,
    track: "gate" as const,
    name: "GATE",
    title: "The GATE Zone",
    subtitle: "Data Science and Artificial Intelligence",
    doubtsSubject: "GATE DA",
  },
  cat: {
    exam: "cat" as ZoneExam,
    track: "cat" as const,
    name: "CAT",
    title: "The CAT Zone",
    subtitle: "VARC, DILR and Quant, for the IIMs",
    doubtsSubject: "CAT",
  },
};

type ZoneKey = keyof typeof ZONES;

type Sync =
  | { state: "loading" }
  | { state: "saving" }
  | { state: "synced"; at: Date }
  | { state: "error"; message: string };

export function ZonePage() {
  const { zone: param } = useParams();
  if (param !== "gate" && param !== "cat") return <Navigate to="/zone/gate" replace />;
  return <Zone key={param} zoneKey={param} />;
}

function Zone({ zoneKey }: { zoneKey: ZoneKey }) {
  const zone = ZONES[zoneKey];
  const syllabus = ZONE_SYLLABI[zone.exam];
  const navigate = useNavigate();
  const { userId } = useUserData();
  const { goals } = useGoals(userId);
  const { setMode } = useStudyDesk();
  const { theme, toggle } = useZoneTheme();

  const [progress, setProgress] = useState<Map<string, TopicStatus>>(new Map());
  const [sync, setSync] = useState<Sync>({ state: "loading" });
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [viz, setViz] = useState<PdsaVizId>("sorting");
  const inFlight = useRef(0);

  // Coming back to Waypoint from here should land on this exam's track.
  useEffect(() => setMode(zone.track), [setMode, zone.track]);

  useEffect(() => {
    document.title = `${zone.title} · Waypoint`;
    return () => {
      document.title = "Waypoint";
    };
  }, [zone.title]);

  const refresh = useCallback(async () => {
    setSync({ state: "loading" });
    setBoardLoading(true);
    try {
      const [mine, rows] = await Promise.all([listProgress(userId, zone.exam), listBoard(zone.exam)]);
      setProgress(mine);
      setBoard(rows);
      setSync({ state: "synced", at: new Date() });
    } catch (err) {
      setSync({ state: "error", message: getErrorMessage(err) });
    } finally {
      setBoardLoading(false);
    }
  }, [userId, zone.exam]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onToggle = useCallback(
    async (topicId: string) => {
      const before = progress.get(topicId);
      const after = nextTopicStatus(before);
      // Optimistic: the tick moves now, and moves back if the save fails.
      setProgress((current) => {
        const next = new Map(current);
        if (after) next.set(topicId, after);
        else next.delete(topicId);
        return next;
      });
      inFlight.current++;
      setSync({ state: "saving" });
      try {
        await setTopicStatus(userId, zone.exam, topicId, after);
        inFlight.current--;
        if (inFlight.current === 0) setSync({ state: "synced", at: new Date() });
      } catch (err) {
        inFlight.current--;
        setProgress((current) => {
          const next = new Map(current);
          if (before) next.set(topicId, before);
          else next.delete(topicId);
          return next;
        });
        setSync({ state: "error", message: getErrorMessage(err) });
      }
    },
    [progress, userId, zone.exam]
  );

  const total = useMemo(() => allTopicIds(syllabus).length, [syllabus]);
  const known = useMemo(() => new Set(allTopicIds(syllabus)), [syllabus]);
  const studied = [...progress.keys()].filter((id) => known.has(id)).length;

  const nextGoal = useMemo(
    () =>
      goals
        .filter((g) => g.track === zone.track && daysUntil(g.targetDate) >= 0)
        .sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0],
    [goals, zone.track]
  );

  const sections = [
    { id: "syllabus", label: "Syllabus" },
    ...(zoneKey === "gate" ? [{ id: "visualise", label: "PDSA, visualised" }] : []),
    { id: "schedule", label: "Schedule" },
    { id: "assignments", label: "Assignments" },
    { id: "doubts", label: "Doubts" },
    { id: "sources", label: "Sources" },
    { id: "peers", label: "Everyone's progress" },
  ];
  const index = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");

  const openViz = (id: PdsaVizId) => {
    setViz(id);
    document.getElementById("visualise")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="zone relative min-h-screen bg-z-bg font-sheet text-z-ink" data-zone-theme={theme}>
      <div className="zone-grid pointer-events-none fixed inset-0" aria-hidden />

      <header className="sticky top-0 z-30 border-b border-z-ink/15 bg-z-bg/90 backdrop-blur">
        <div className="mx-auto flex h-[52px] max-w-[1180px] items-center gap-4 px-4 sm:px-6">
          <Link
            to="/"
            aria-label="Back to Waypoint"
            className="shrink-0 font-plex text-[11px] uppercase tracking-[0.14em] text-z-muted transition-colors hover:text-z-ink"
          >
            ←<span className="hidden sm:inline"> Waypoint</span>
          </Link>

          <div className="mx-auto flex items-center gap-3 sm:gap-4">
            <div className="flex border border-z-ink/25" role="tablist" aria-label="Zone">
              {(Object.keys(ZONES) as ZoneKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={key === zoneKey}
                  onClick={() => navigate(`/zone/${key}`)}
                  className={cn(
                    "h-8 px-3 font-plex text-[11px] uppercase tracking-[0.14em] transition-colors",
                    key === zoneKey ? "bg-z-ink text-z-bg" : "text-z-muted hover:text-z-ink"
                  )}
                >
                  {ZONES[key].name}
                  <span className="hidden sm:inline"> Zone</span>
                </button>
              ))}
            </div>
            <span className="h-4 w-px bg-z-ink/20" aria-hidden />
            <SlideSwitch on={theme === "dark"} onToggle={toggle} labels={["Light", "Dark"]} ariaLabel="Dark theme for the zone" />
          </div>

          <SyncStatus sync={sync} onSync={refresh} />
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-4 pb-32 sm:px-6">
        {/* Title block, the way a drawing sheet carries one. */}
        <section className="pt-14 sm:pt-20">
          <p className="font-plex text-[11px] uppercase tracking-[0.14em] text-z-accent">Waypoint / {zone.name}</p>
          <h1 className="mt-4 text-[clamp(3rem,9vw,7rem)] font-medium leading-[0.92] tracking-[-0.045em]">{zone.title}</h1>
          <p className="mt-4 max-w-xl text-lg text-z-muted">{zone.subtitle}</p>

          <dl className="mt-12 grid grid-cols-2 border-y border-z-ink/20 sm:grid-cols-4">
            <Cell label="Syllabus" value={`${syllabus.sections.length} sections · ${total} topics`} />
            <Cell label="Covered" value={`${studied} of ${total}`} accent={studied > 0} />
            <Cell
              label="Next date"
              value={
                nextGoal ? (
                  `${nextGoal.title} · ${daysUntil(nextGoal.targetDate)} days`
                ) : (
                  <Link to="/" className="underline decoration-z-ink/30 underline-offset-2 hover:text-z-accent">
                    Set one on the dashboard
                  </Link>
                )
              }
            />
            <Cell label="List" value={syllabus.official ? "Official syllabus" : "Topic list, unofficial"} />
          </dl>

          <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2" aria-label="Sections">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="font-plex text-[11px] uppercase tracking-[0.12em] text-z-muted hover:text-z-accent">
                <span className="text-z-faint">{index(s.id)}</span> {s.label}
              </a>
            ))}
          </nav>
        </section>

        <Block id="syllabus" index={index("syllabus")} label="Syllabus" meta={syllabus.title}>
          <SyllabusChecklist
            syllabus={syllabus}
            progress={progress}
            onToggle={onToggle}
            onVisualise={zoneKey === "gate" ? openViz : undefined}
          />
        </Block>

        {zoneKey === "gate" && (
          <Block id="visualise" index={index("visualise")} label="PDSA, visualised" meta="Step through the real algorithm">
            <p className="mb-6 max-w-2xl text-[15px] leading-6 text-z-muted">
              Every algorithm in the PDSA section, run on numbers you pick. The comparison and move counts come from
              the algorithm itself, so running selection sort and mergesort on the same input shows the O(n²) gap in
              real numbers. Once you've clicked a control, the arrow keys step through.
            </p>
            <PdsaLab active={viz} onChange={setViz} />
          </Block>
        )}

        <Block id="schedule" index={index("schedule")} label="Schedule">
          <SchedulePanel userId={userId} exam={zone.exam} syllabus={syllabus} />
        </Block>

        <Block id="assignments" index={index("assignments")} label="Assignments" meta="Files stay private to you">
          <AssignmentsPanel userId={userId} exam={zone.exam} />
        </Block>

        <Block id="doubts" index={index("doubts")} label="Doubts">
          <DoubtsPanel userId={userId} subjectName={zone.doubtsSubject} />
        </Block>

        <Block id="sources" index={index("sources")} label="Sources" meta="Checked September 2026">
          <SourcesPanel groups={ZONE_SOURCES[zone.exam]} />
        </Block>

        <Block id="peers" index={index("peers")} label="Everyone's progress" meta={`${board.length} in this zone`}>
          <p className="mb-5 max-w-2xl text-[15px] leading-6 text-z-muted">
            Your ticks sync as you make them, so this list and every device you use show the same checklist. Other
            signed-in Waypoint users can see your count here, the same way the leaderboard shows solve counts.
            Schedules and assignments stay private.
          </p>
          <PeerBoard rows={board} total={total} userId={userId} loading={boardLoading} />
        </Block>
      </main>
    </div>
  );
}

function Block({ id, index, label, meta, children }: {
  id: string;
  index: string;
  label: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-24 sm:mt-32">
      <SheetLabel id={id} index={index} label={label} meta={meta} />
      <div className="mt-8">{children}</div>
    </section>
  );
}

function Cell({ label, value, accent }: { label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="border-z-ink/20 px-0 py-4 pr-4 odd:border-r sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
      <dt className="font-plex text-[10px] uppercase tracking-[0.14em] text-z-faint">{label}</dt>
      <dd className={cn("mt-1.5 text-[15px]", accent ? "text-z-accent" : "text-z-ink")}>{value}</dd>
    </div>
  );
}

function SyncStatus({ sync, onSync }: { sync: Sync; onSync: () => void }) {
  const text =
    sync.state === "loading" ? "Syncing…" :
    sync.state === "saving" ? "Saving…" :
    sync.state === "synced" ? `Synced ${sync.at.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` :
    "Not saved";
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn("hidden font-plex text-[11px] sm:inline", sync.state === "error" ? "text-z-accent" : "text-z-muted")}
        title={sync.state === "error" ? sync.message : undefined}
        aria-live="polite"
      >
        {text}
      </span>
      <ZButton variant="ghost" onClick={onSync} disabled={sync.state === "loading"} className="h-8 px-2">
        Sync
      </ZButton>
    </div>
  );
}
