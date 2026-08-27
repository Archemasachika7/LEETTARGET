import { Code2, GraduationCap, Sigma } from "lucide-react";
import { STUDY_TRACKS, type StudyTrack, useStudyDesk } from "../../lib/studyDesk.js";
import { cn } from "../../lib/cn.js";

const ICONS = {
  leetcode: Code2,
  gate: GraduationCap,
  cat: Sigma,
} as const;

/**
 * This is deliberately a segmented control rather than a row of product cards.
 * Switching study tracks should feel like changing the lens on one workspace,
 * not leaving LeetTarget for a different app.
 */
export function TrackSwitcher({
  className,
  onTrackChange,
}: {
  className?: string;
  onTrackChange?: (track: StudyTrack) => void;
}) {
  const { mode, setMode } = useStudyDesk();

  return (
    <div
      className={cn(
        "inline-flex max-w-full items-center gap-1 overflow-x-auto border border-border bg-surface p-1",
        className
      )}
      aria-label="Study track"
      role="tablist"
    >
      {(Object.keys(STUDY_TRACKS) as StudyTrack[]).map((trackId) => {
        const track = STUDY_TRACKS[trackId];
        const Icon = ICONS[trackId];
        const active = mode === trackId;
        return (
          <button
            key={trackId}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => {
              setMode(trackId);
              onTrackChange?.(trackId);
            }}
            className={cn(
              "inline-flex h-8 shrink-0 items-center gap-1.5 px-3 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors duration-fast",
              active ? "bg-brand text-brand-contrast" : "text-text-muted hover:bg-elevated hover:text-text"
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {track.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
