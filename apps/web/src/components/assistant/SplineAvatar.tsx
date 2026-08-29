import { useEffect, useRef } from "react";

const VIEWER_SCRIPT_SRC = "https://unpkg.com/@splinetool/viewer/build/spline-viewer.js";

let scriptPromise: Promise<void> | undefined;

function loadSplineViewer(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (customElements.get("spline-viewer")) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = VIEWER_SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the Spline viewer script."));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export function splineSceneUrl(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const url = env?.VITE_SPLINE_SCENE_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

/** Renders a Spline 3D scene as the assistant's avatar when a scene URL is
 * configured. The ~300KB viewer script is only fetched on demand — most
 * installs won't set VITE_SPLINE_SCENE_URL, so it never ships to them.
 * Silently leaves the container empty on any load failure; the caller
 * always has a static icon underneath. */
export function SplineAvatar({ url, className }: { url: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadSplineViewer()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const el = document.createElement("spline-viewer");
        el.setAttribute("url", url);
        el.setAttribute("loading-anim-type", "none");
        containerRef.current.replaceChildren(el);
      })
      .catch(() => {
        // Leave the container empty — the caller renders a static icon behind this.
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return <div ref={containerRef} className={className} aria-hidden />;
}
