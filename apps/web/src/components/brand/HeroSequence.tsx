import { useEffect, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn.js";

interface Panel {
  /** "01 / THE SCATTERED QUEUE" — the section marker above the headline. */
  eyebrow: string;
  /** Headline split into lines so alternating ones can take the accent
   * colour, the way the reference two-tones its type. */
  headline: { text: string; accent?: boolean }[];
  body: string;
  /** Bottom-right marginalia — a short phrase framing the panel. */
  tagline: string;
  /** The small mock screen on the right. Rows fade in staggered. */
  screen: { caption: string; rows: ReactNode[] };
}

const PANELS: Panel[] = [
  {
    eyebrow: "01 / The scattered queue",
    headline: [{ text: "Too many tabs." }, { text: "One next move.", accent: true }],
    body: "Waypoint turns a loose pile of problems into a trail you can actually follow.",
    tagline: "From noise to signal",
    screen: {
      caption: "Unsorted / 84",
      rows: [
        <div className="flex flex-wrap gap-1.5">
          {["two-sum", "merge-k-lists", "word-ladder", "lru-cache", "valid-tree"].map((slug) => (
            <span
              key={slug}
              className={cn(
                "border px-2 py-1 font-mono text-[11px]",
                slug === "merge-k-lists" ? "border-brand/50 bg-brand/10 text-brand" : "border-border text-text-muted"
              )}
            >
              {slug}
            </span>
          ))}
        </div>,
        <div className="border-t border-border pt-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Today</p>
          <p className="mt-1 text-sm text-text">Pick one, finish one.</p>
        </div>,
      ],
    },
  },
  {
    eyebrow: "02 / The daily view",
    headline: [{ text: "See the" }, { text: "shape", accent: true }, { text: "of your work." }],
    body: "Targets, solves and streaks in one place, measured against numbers you set yourself.",
    tagline: "Progress, in context",
    screen: {
      caption: "Waypoint / Dashboard",
      rows: [
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-3xl font-bold tabular-nums text-text">47.2</span>
          <span className="font-mono text-sm text-text-muted">%</span>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Roadmap</span>
        </div>,
        <div className="h-1.5 overflow-hidden bg-surface">
          <div className="h-full w-[47%] bg-brand" />
        </div>,
        <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
          <span className="text-text-secondary">Solved this week</span>
          <span className="font-mono tabular-nums text-text">8 / 20</span>
        </div>,
      ],
    },
  },
  {
    eyebrow: "03 / The practice loop",
    headline: [{ text: "Practice" }, { text: "with proof.", accent: true }],
    body: "A session has a start, a signal, and a clean place to leave your thinking.",
    tagline: "The loop is the lesson",
    screen: {
      caption: "Session / sliding-window",
      rows: [
        <div className="text-center font-mono text-4xl font-bold tabular-nums text-text">18:42</div>,
        <p className="text-center font-mono text-[11px] text-text-muted">Shared session · code K7XQ2M</p>,
        <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
          <span className="text-text-secondary">Two others counting down</span>
          <span className="font-mono text-brand">live</span>
        </div>,
      ],
    },
  },
  {
    eyebrow: "04 / The handoff",
    headline: [{ text: "Your code" }, { text: "comes with you.", accent: true }],
    body: "GitHub sync closes the loop between solving the problem and remembering the win.",
    tagline: "From editor to evidence",
    screen: {
      caption: "Extension / GitHub bridge",
      rows: [
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text">Waypoint extension</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Repository / solutions</p>
          </div>
          <span className="border border-brand/50 bg-brand/10 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-brand">
            Synced
          </span>
        </div>,
        <div className="flex items-center justify-between border-t border-border pt-3 font-mono text-[11px] text-text-muted">
          <span>Weekly transfer</span>
          <span className="tabular-nums">18 / 22</span>
        </div>,
      ],
    },
  },
  {
    eyebrow: "05 / Visible momentum",
    headline: [{ text: "Keep" }, { text: "going.", accent: true }],
    body: "Not more noise. Just the next problem, the next proof, the next small mark.",
    tagline: "Keep the trace",
    screen: {
      caption: "Streak",
      rows: [
        <div className="text-center">
          <div className="font-mono text-4xl font-bold tabular-nums text-text">09</div>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Day streak</p>
        </div>,
        <div className="flex items-center justify-between border-t border-border pt-3 text-[13px]">
          <span className="text-text-secondary">Next checkpoint</span>
          <span className="font-mono tabular-nums text-text">21 / 40</span>
        </div>,
      ],
    },
  },
];

const HOLD_MS = 4200;
const FADE_MS = 420;
const ROW_STAGGER_MS = 90;

export const PANEL_COUNT = PANELS.length;

/** The rotating narrative on the sign-in screen.
 *
 * Motion is calibrated from the reference: content holds, fades out
 * together to near-nothing, and the next panel fades back in — a
 * fade-through-empty rather than a slide or crossfade, so the two panels
 * never overlap mid-transition. Inside the mock screen, the frame lands
 * first and its rows stagger in behind it, which is how a real screen
 * populates.
 *
 * `prefers-reduced-motion` is handled globally in index.css (every
 * transition and animation collapses to ~0ms), so this degrades to a
 * plain instant swap without extra handling here. */
export function HeroSequence({
  cta,
  onIndexChange,
}: {
  /** Rendered under the rotating copy but outside the fade, so the primary
   * action stays put and fully visible while panels cycle behind it. */
  cta?: ReactNode;
  onIndexChange?: (index: number) => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  // Hold the current panel, then start the fade out.
  useEffect(() => {
    const id = setTimeout(() => setShown(false), HOLD_MS);
    return () => clearTimeout(id);
  }, [index]);

  // Once faded out, swap in the next panel and fade back in.
  useEffect(() => {
    if (shown) return;
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % PANELS.length);
      setShown(true);
    }, FADE_MS);
    return () => clearTimeout(id);
  }, [shown]);

  const panel = PANELS[index];
  const fade = cn("transition-opacity ease-smooth", shown ? "opacity-100" : "opacity-0");
  const fadeStyle = { transitionDuration: `${FADE_MS}ms` };

  return (
    <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)] lg:gap-16">
      <div className="max-w-xl">
        <section className={fade} style={fadeStyle}>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">{panel.eyebrow}</p>

          {/* One fixed-height block around headline + body, rather than a
           * min-height on each: the body still sits directly under the
           * headline whatever its length, while the block as a whole keeps
           * the sign-in button below from shifting between panels. */}
          <div className="mt-6 min-h-[17rem] sm:min-h-[19rem]">
            <h1 className="text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl lg:text-[3.5rem]">
              {panel.headline.map((line, i) => (
                <span
                  key={i}
                  className={cn("block animate-enter", line.accent ? "text-brand" : "text-text")}
                  style={{ animationDelay: `${i * ROW_STAGGER_MS}ms` }}
                >
                  {line.text}
                </span>
              ))}
            </h1>

            <p className="mt-6 max-w-md font-mono text-[13px] leading-6 text-text-secondary">{panel.body}</p>
          </div>
        </section>

        {cta && <div className="mt-8 max-w-sm">{cta}</div>}
      </div>

      <section className={cn(fade)} style={fadeStyle}>
        <div className="border border-border bg-elevated/70 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex gap-1.5" aria-hidden>
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
              <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
              {panel.screen.caption}
            </span>
          </div>
          <div className="space-y-3 p-4">
            {panel.screen.rows.map((row, i) => (
              <div key={i} className="animate-enter" style={{ animationDelay: `${(i + 1) * ROW_STAGGER_MS}ms` }}>
                {row}
              </div>
            ))}
          </div>
        </div>
        <p className="mt-3 text-right font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          {panel.tagline}
        </p>
      </section>
    </div>
  );
}

export function SequenceDots({ index }: { index: number }) {
  return (
    <span className="flex items-center gap-1.5">
      {PANELS.map((p, i) => (
        <span
          key={p.eyebrow}
          className={cn("h-1.5 w-1.5 rounded-full transition-colors duration-normal", i === index ? "bg-brand" : "bg-border-strong")}
        />
      ))}
    </span>
  );
}
