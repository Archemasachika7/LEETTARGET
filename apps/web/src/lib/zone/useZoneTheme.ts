import { useCallback, useState } from "react";
import { flushSync } from "react-dom";

export type ZoneTheme = "light" | "dark";

const KEY = "waypoint-zone-theme";

function read(): ZoneTheme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** The zone's own light/dark switch, separate from Waypoint's.
 *
 * Paper (light) is the default whatever the OS says, the way the portfolio
 * this zone is modelled on opens on a light sheet. Switching wipes the new
 * sheet down over the old one with a View Transition; browsers without it,
 * and anyone who asked for reduced motion, just switch. */
export function useZoneTheme() {
  const [theme, setTheme] = useState<ZoneTheme>(read);

  const toggle = useCallback(() => {
    const next: ZoneTheme = theme === "dark" ? "light" : "dark";
    const apply = () => {
      // flushSync so the DOM has the new theme by the time the transition
      // snapshots it; otherwise both snapshots show the old sheet.
      flushSync(() => setTheme(next));
      try {
        localStorage.setItem(KEY, next);
      } catch {
        // theme just won't persist
      }
    };
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || reduce) {
      apply();
      return;
    }
    const transition = doc.startViewTransition(apply);
    transition.ready
      .then(() =>
        document.documentElement.animate(
          { clipPath: ["inset(0 0 100% 0)", "inset(0 0 0% 0)"] },
          { duration: 700, easing: "cubic-bezier(0.65, 0, 0.08, 1)", pseudoElement: "::view-transition-new(root)" }
        )
      )
      .catch(() => {});
  }, [theme]);

  return { theme, toggle };
}
