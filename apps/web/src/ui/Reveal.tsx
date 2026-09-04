import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

/** True when the reader has asked the OS for less motion. Read at call time
 * rather than cached, so a mid-session change to the system setting is
 * honoured on the next mount instead of needing a reload. */
function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Fades and lifts its children into place as they enter the viewport.
 *
 * The behaviour every well-made marketing page shares, and the reason those
 * pages feel deliberate rather than dumped on screen: content arrives as you
 * reach it, slowly, one thing at a time.
 *
 * Three rules keep it from becoming a nuisance in an app you open twenty
 * times a day rather than read once:
 *
 * 1. **It fires once.** Scrolling back up doesn't replay anything — a panel
 *    that re-animates every time it passes the fold turns a page into a
 *    flickering mess.
 * 2. **It never hides content it can't reveal.** The element renders visible
 *    and is only hidden after this effect has confirmed an observer exists
 *    and motion is permitted, so a failure anywhere leaves the content on
 *    screen rather than blanking it.
 * 3. **It defers to `prefers-reduced-motion`** by rendering the final state
 *    immediately, with no transition at all.
 *
 * `rootMargin` pulls the trigger line slightly *above* the fold: waiting for
 * an element to be strictly inside the viewport means the reader watches it
 * animate after it has already arrived, which reads as lag. */
export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Milliseconds to hold before this element starts. Used to stagger a
   * group — keep the steps short (60–90ms) so a row resolves in reading
   * order rather than queueing visibly. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  // Starts undefined so the very first render commits neither state: the
  // effect decides, and until it runs the element stays plainly visible.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      // Nothing to animate — leave the element in its natural visible state.
      return;
    }

    // Already in view on first paint (above the fold): skip the hidden state
    // entirely and transition in from where it stands. Arming it first would
    // flash the content out and back, which is worse than not animating.
    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;

    setArmed(true);
    if (alreadyVisible) {
      const id = window.setTimeout(() => setShown(true), delay + 20);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          window.setTimeout(() => setShown(true), delay);
          observer.disconnect(); // rule 1: once only
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <Tag
      ref={ref}
      data-reveal={!armed ? undefined : shown ? "shown" : "pending"}
      className={className && cn(className)}
    >
      {children}
    </Tag>
  );
}
