export type Theme = "light" | "dark";

const STORAGE_KEY = "leettarget-theme";

/** Mirrors the inline bootstrap script in index.html — that script sets the
 * class before React mounts (avoiding a flash of the wrong theme); this
 * reads back the same decision so React's state agrees with the DOM. */
export function getInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) — fall through to OS preference
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // theme just won't persist across reloads
  }
}
