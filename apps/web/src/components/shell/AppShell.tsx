import { type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Target, FileText, Map, TrendingUp, User, Moon, Sun, LogOut } from "lucide-react";
import { Logo, LogoMark } from "../brand/Logo.js";
import { Tooltip } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";
import type { Theme } from "../../lib/theme.js";
import { TrackSwitcher } from "../study/TrackSwitcher.js";
import { AssistantWidget } from "../assistant/AssistantWidget.js";

/** The primary destinations, in the order of the product loop: see status
 * (Dashboard) → solve (Practice) → see where that's heading
 * (Roadmap) → analyse (Progress) → configure (Profile). Everything else in
 * the app is reachable from within one of these rather than competing for a
 * nav slot. */
export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/practice", label: "Practice", icon: Target, end: false },
  { to: "/ats", label: "ATS", icon: FileText, end: false },
  { to: "/roadmap", label: "Roadmap", icon: Map, end: false },
  { to: "/progress", label: "Progress", icon: TrendingUp, end: false },
  { to: "/profile", label: "Profile", icon: User, end: false },
] as const;

interface Props {
  children: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  onSignOut: () => void;
}

export function AppShell({ children, theme, onToggleTheme, onSignOut }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg bg-grid">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-elevated focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-content items-center gap-6 px-4 sm:px-6">
          <NavLink to="/" className="shrink-0" aria-label="LeetTarget home">
            <Logo className="hidden sm:inline-flex" />
            <LogoMark className="sm:hidden" title="LeetTarget" />
          </NavLink>

          {/* Desktop navigation. Hidden on small screens, where the bottom bar
           * takes over — duplicating both would waste vertical space on the
           * viewport that has least of it. */}
          <div className="hidden xl:block">
            <TrackSwitcher onTrackChange={() => navigate("/practice")} />
          </div>

          <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    // Mono uppercase reads as an instrument channel label
                    // rather than website chrome, and the active state is a
                    // 1px underline instead of a filled pill.
                    "border-b-2 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors duration-fast",
                    isActive
                      ? "border-brand text-text"
                      : "border-transparent text-text-muted hover:text-text"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Tooltip label={theme === "dark" ? "Light theme" : "Dark theme"}>
              <button
                onClick={onToggleTheme}
                aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
                className="rounded-sm p-2 text-text-muted transition-colors duration-fast hover:bg-surface hover:text-text"
              >
                {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </button>
            </Tooltip>
            <Tooltip label="Sign out">
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                className="rounded-sm p-2 text-text-muted transition-colors duration-fast hover:bg-surface hover:text-text"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* `key` on the route path restarts the enter animation on navigation —
       * a 6px rise, not a flight across the screen. */}
      <div className="border-b border-border bg-bg/70 px-4 py-2 sm:px-6 xl:hidden">
        <div className="mx-auto max-w-content overflow-x-auto">
          <TrackSwitcher onTrackChange={() => navigate("/practice")} />
        </div>
      </div>

      <main
        id="main"
        key={location.pathname}
        className="animate-enter mx-auto max-w-content px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-16"
      >
        {children}
      </main>

      {/* Mobile bottom navigation: five destinations is right at the limit for
       * a thumb-reachable bar, and it keeps the primary IA visible instead of
       * hiding it behind a hamburger. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 backdrop-blur md:hidden"
        aria-label="Primary"
      >
        <div className="flex pb-[env(safe-area-inset-bottom)]">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  // 44px minimum touch target, met by the 56px row height.
                  "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 font-mono text-[9px] uppercase tracking-wider transition-colors duration-fast",
                  isActive ? "text-brand" : "text-text-muted"
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <AssistantWidget />
    </div>
  );
}
