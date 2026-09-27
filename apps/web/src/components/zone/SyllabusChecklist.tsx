import { useMemo, useState } from "react";
import { summariseSections, type PdsaVizId, type TopicStatus, type ZoneSection, type ZoneSyllabus } from "@leettarget/shared";
import { CoverageBar, TopicMark } from "./primitives.js";
import { cn } from "../../lib/cn.js";

const STATUS_WORD: Record<string, string> = { studied: "studied", revised: "revised" };

export function SyllabusChecklist({
  syllabus,
  progress,
  onToggle,
  onVisualise,
}: {
  syllabus: ZoneSyllabus;
  progress: ReadonlyMap<string, TopicStatus>;
  onToggle: (topicId: string) => void;
  onVisualise?: (viz: PdsaVizId) => void;
}) {
  const summaries = useMemo(() => summariseSections(syllabus, progress), [syllabus, progress]);
  const total = summaries.reduce((n, s) => n + s.total, 0);
  const studied = summaries.reduce((n, s) => n + s.studied, 0);
  const revised = summaries.reduce((n, s) => n + s.revised, 0);
  const [open, setOpen] = useState<Set<string>>(() => new Set([syllabus.sections[0]?.id]));

  const toggleOpen = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="grid gap-6 border-y border-z-ink/15 py-5 sm:grid-cols-[auto_1fr] sm:items-end">
        <p className="font-sheet leading-none">
          <span className="text-[56px] font-medium tracking-[-0.04em] tabular-nums text-z-ink">{studied}</span>
          <span className="ml-2 font-plex text-sm text-z-muted">/ {total} topics studied</span>
        </p>
        <div className="flex flex-col gap-2 sm:pb-2">
          <CoverageBar total={total} studied={studied} revised={revised} className="h-2" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 font-plex text-[11px] text-z-muted">
            <span className="flex items-center gap-1.5"><TopicMark /> Not started</span>
            <span className="flex items-center gap-1.5"><TopicMark status="studied" /> Studied once</span>
            <span className="flex items-center gap-1.5"><TopicMark status="revised" /> Revised · {revised}</span>
            <span className="text-z-faint">Click a topic to move it along.</span>
          </div>
        </div>
      </div>

      <ol className="relative mt-2">
        {/* The spine: one hairline down the left edge, with a square node per section. */}
        <span className="absolute bottom-6 left-[6px] top-6 w-px bg-z-ink/15" aria-hidden />
        {syllabus.sections.map((section, i) => {
          const s = summaries[i];
          const isOpen = open.has(section.id);
          const complete = s.studied === s.total;
          return (
            <li key={section.id} className="relative pl-8">
              <span
                className={cn(
                  "absolute left-0 top-[26px] h-[13px] w-[13px] border",
                  complete ? "border-z-accent bg-z-accent" : s.studied > 0 ? "border-z-accent bg-z-bg" : "border-z-ink/40 bg-z-bg"
                )}
                aria-hidden
              />
              <button
                type="button"
                onClick={() => toggleOpen(section.id)}
                aria-expanded={isOpen}
                className="group grid w-full grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 py-5 text-left sm:grid-cols-[1fr_180px_auto]"
              >
                <span className="font-sheet text-lg font-medium tracking-[-0.01em] text-z-ink group-hover:text-z-accent sm:text-xl">
                  {section.name}
                </span>
                <CoverageBar total={s.total} studied={s.studied} revised={s.revised} className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" />
                <span className="font-plex text-[12px] tabular-nums text-z-muted">
                  {s.studied}/{s.total}
                  <span className="ml-3 inline-block w-3 text-z-faint">{isOpen ? "−" : "+"}</span>
                </span>
              </button>
              {isOpen && <TopicList section={section} progress={progress} onToggle={onToggle} onVisualise={onVisualise} />}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-z-ink/15 pt-3 font-plex text-[11px] leading-5 text-z-muted">
        {syllabus.official ? "Source: " : "Note: "}
        {syllabus.provenance}
      </p>
    </div>
  );
}

function TopicList({
  section,
  progress,
  onToggle,
  onVisualise,
}: {
  section: ZoneSection;
  progress: ReadonlyMap<string, TopicStatus>;
  onToggle: (topicId: string) => void;
  onVisualise?: (viz: PdsaVizId) => void;
}) {
  const byId = new Map(section.topics.map((topic) => [topic.id, topic]));
  const groups = section.groups ?? [{ name: "", topicIds: section.topics.map((topic) => topic.id) }];

  return (
    <div className="pb-6">
      {groups.map((group) => (
        <div key={group.name || "all"} className="mt-1">
          {group.name && (
            <p className="mb-1 mt-3 font-plex text-[10px] uppercase tracking-[0.14em] text-z-faint">{group.name}</p>
          )}
          <ul className="grid gap-x-8 md:grid-cols-2">
            {group.topicIds.map((id) => {
              const topic = byId.get(id)!;
              const status = progress.get(id);
              return (
                <li key={id} className="flex items-start gap-2 border-b border-z-ink/10">
                  <button
                    type="button"
                    onClick={() => onToggle(id)}
                    className="flex min-h-[44px] flex-1 items-start gap-3 py-2.5 text-left text-[14px] leading-5 text-z-ink transition-colors hover:text-z-accent"
                    aria-label={`${topic.name}: ${status ? STATUS_WORD[status] : "not started"}. Click to change.`}
                  >
                    <span className="mt-[3px]">
                      <TopicMark status={status} />
                    </span>
                    <span className={cn(status === "revised" && "text-z-muted")}>{topic.name}</span>
                  </button>
                  {topic.viz && onVisualise && (
                    <button
                      type="button"
                      onClick={() => onVisualise(topic.viz!)}
                      className="mt-2.5 shrink-0 font-plex text-[10px] uppercase tracking-[0.12em] text-z-accent hover:underline"
                    >
                      See it ↘
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
