import { useEffect, useState } from "react";

/** True once the page has scrolled past `threshold` pixels.
 *
 * Drives the header's transition from "sitting on the page" to "floating over
 * it" — the small shift in weight that tells you the content is moving
 * underneath a fixed bar, rather than the bar being a static strip at the
 * top.
 *
 * Reads are passive and the state only flips on the crossing, so a scroll
 * doesn't re-render on every frame — the listener runs constantly, and
 * setting state each time would make scrolling measurably worse for a purely
 * decorative effect. */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > threshold;
      setScrolled((current) => (current === next ? current : next));
    };
    onScroll(); // a reload part-way down the page starts in the right state
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return scrolled;
}
