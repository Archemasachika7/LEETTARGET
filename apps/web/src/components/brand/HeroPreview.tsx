import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Bot, CircleDot, Clock, GitBranch, ListChecks, Map as MapIcon } from "lucide-react";
import { cn } from "../../lib/cn.js";

interface Panel {
  eyebrow: string;
  caption: string;
  icon: ComponentType<{ className?: string }>;
  render: () => ReactNode;
}

const PANELS: Panel[] = [
  {
    eyebrow: "Practice",
    caption: "Today's focus",
    icon: CircleDot,
    render: () => (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-brand/40 bg-brand/10 text-brand">
            <CircleDot className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-medium text-text">Arrays &amp; hashing</span>
              <span className="shrink-0 font-mono text-[11px] text-text-muted">2 / 3</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden bg-surface">
              <div className="h-full w-2/3 bg-brand" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 border-t border-border pt-4 text-sm">
          <ListChecks className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
          <span className="flex-1 text-text-secondary">Next: Sliding window patterns</span>
          <GitBranch className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
        </div>
      </div>
    ),
  },
  {
    eyebrow: "Timer",
    caption: "Shared session · code K7XQ2M",
    icon: Clock,
    render: () => (
      <div className="flex flex-col items-center gap-2 p-6">
        <Clock className="h-4 w-4 text-text-muted" aria-hidden />
        <div className="font-mono text-4xl font-bold tabular-nums text-text">24:58</div>
        <p className="text-xs text-text-muted">Two others are counting down with you.</p>
      </div>
    ),
  },
  {
    eyebrow: "Roadmap",
    caption: "Topic coverage",
    icon: MapIcon,
    render: () => (
      <div className="space-y-3 p-4">
        {[
          { topic: "Array", pct: 90, tone: "bg-brand" },
          { topic: "Hash Table", pct: 55, tone: "bg-warning" },
          { topic: "Two Pointers", pct: 40, tone: "bg-warning" },
        ].map((row) => (
          <div key={row.topic}>
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="text-text-secondary">{row.topic}</span>
              <span className="font-mono text-[11px] text-text-muted">{row.pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden bg-surface">
              <div className={cn("h-full", row.tone)} style={{ width: `${row.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    eyebrow: "Assistant",
    caption: "Ask it about your own data",
    icon: Bot,
    render: () => (
      <div className="space-y-2 p-4">
        <p className="ml-auto max-w-[80%] rounded-sm bg-brand px-3 py-1.5 text-[13px] text-brand-contrast">
          what's my weakness?
        </p>
        <p className="max-w-[85%] rounded-sm bg-surface px-3 py-1.5 text-[13px] text-text">
          Hash Table and Two Pointers are steady. Array's your strongest.
        </p>
      </div>
    ),
  },
];

const INTERVAL_MS = 4000;

/** Cycles through a few real screens rather than one static mock — every
 * panel here mirrors an actual shipped feature (Practice, the timer,
 * Roadmap, the assistant), not an invented preview. Auto-advances on a
 * plain interval; the global `prefers-reduced-motion` rule in index.css
 * already collapses the per-panel `animate-enter` transition to nothing,
 * so no extra handling is needed here for that. */
export function HeroPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % PANELS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const panel = PANELS[index];

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">A glimpse of the rhythm</p>
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">
          {String(index + 1).padStart(2, "0")} / {String(PANELS.length).padStart(2, "0")}
        </span>
      </div>

      <div key={index} className="animate-enter mt-4 border border-border bg-bg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text">
            <panel.icon className="h-4 w-4 text-brand" />
            {panel.eyebrow}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">{panel.caption}</span>
        </div>
        {panel.render()}
      </div>

      <div className="mt-4 flex items-center justify-center gap-1.5" role="tablist" aria-label="Preview panel">
        {PANELS.map((p, i) => (
          <span
            key={p.eyebrow}
            role="tab"
            aria-selected={i === index}
            className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-normal", i === index ? "bg-brand" : "bg-border-strong")}
          />
        ))}
      </div>
    </div>
  );
}
