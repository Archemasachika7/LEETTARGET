interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

function documentPip(): DocumentPictureInPicture | undefined {
  return (window as unknown as { documentPictureInPicture?: DocumentPictureInPicture }).documentPictureInPicture;
}

/** Document Picture-in-Picture (Chrome/Edge desktop only, as of writing —
 * no Firefox or Safari support) is the only web API that keeps a window
 * visibly floating above other apps and tabs, which is the whole point of
 * a timer you want on screen while you're working somewhere else. */
export function pipSupported(): boolean {
  return typeof window !== "undefined" && Boolean(documentPip());
}

export interface PipHandle {
  /** Updates the displayed time and (for a shared session) the label. */
  setText: (time: string, label?: string) => void;
  /** Fires when the viewer closes the PiP window directly (the OS "x"),
   * not when the caller calls `close()` itself. */
  onClosedByUser: (fn: () => void) => void;
  close: () => void;
}

/** Opens a small always-on-top window and renders a countdown into it with
 * plain DOM calls — no React portal, no copying stylesheets across
 * documents. The PiP window is a different `document`, so anything built
 * with Tailwind classes wouldn't pick up styles there anyway; inline
 * styles on a couple of elements is simpler and has nothing to keep in
 * sync with the app's theme. */
export async function openTimerPip(initialLabel?: string): Promise<PipHandle | undefined> {
  const pip = documentPip();
  if (!pip) return undefined;

  const pipWindow = await pip.requestWindow({ width: 260, height: 140 });
  const doc = pipWindow.document;

  doc.title = "Waypoint timer";
  doc.body.style.cssText =
    "margin:0;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;" +
    "background:#09090b;color:#f4f4f5;font-family:ui-monospace,'Geist Mono',monospace;gap:6px;";

  const timeEl = doc.createElement("div");
  timeEl.style.cssText = "font-size:2.75rem;font-weight:700;letter-spacing:0.02em;font-variant-numeric:tabular-nums;";
  timeEl.textContent = "--:--";

  const labelEl = doc.createElement("div");
  labelEl.style.cssText = "font-size:0.75rem;color:#a1a1aa;text-align:center;padding:0 14px;max-width:100%;";
  labelEl.textContent = initialLabel ?? "";

  doc.body.append(timeEl, labelEl);

  return {
    setText: (time, label) => {
      timeEl.textContent = time;
      if (label !== undefined) labelEl.textContent = label;
    },
    onClosedByUser: (fn) => pipWindow.addEventListener("pagehide", fn, { once: true }),
    close: () => pipWindow.close(),
  };
}
