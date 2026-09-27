import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { applyTheme, getInitialTheme, type Theme } from "./lib/theme.js";
import { UserDataProvider } from "./lib/userData.js";
import { StudyDeskProvider } from "./lib/studyDesk.js";
import { TimerProvider } from "./lib/timerProvider.js";
import { AppShell } from "./components/shell/AppShell.js";
import { Logo } from "./components/brand/Logo.js";
import { HeroSequence, PANEL_COUNT, SequenceDots } from "./components/brand/HeroSequence.js";
import { ArrowUpRight, Play } from "lucide-react";
import { GithubIcon } from "./components/brand/GithubIcon.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PracticePage } from "./pages/PracticePage.js";
import { RoadmapPage } from "./pages/RoadmapPage.js";
import { ProgressPage } from "./pages/ProgressPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { DoubtsPage } from "./pages/DoubtsPage.js";
import { SubjectDoubtsPage } from "./pages/SubjectDoubtsPage.js";
import AtsPage from "./pages/AtsPage.js";
import { ZonePage } from "./pages/ZonePage.js";
import { Button, Card, Reveal, ToastProvider } from "./ui/index.js";

export default function App() {
  if (!isSupabaseConfigured || !supabase) {
    return <SetupNotice />;
  }
  return <SignedInApp supabase={supabase} />;
}

function SetupNotice() {
  return (
    <CenteredPanel>
      <p className="text-sm text-text-secondary">
        Supabase isn't configured yet. Copy <Code>apps/web/.env.example</Code> to <Code>.env.local</Code>, fill in your
        project's URL and anon key, then restart the dev server.
      </p>
    </CenteredPanel>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-sm bg-surface px-1 py-0.5 font-mono text-[12px] text-text">{children}</code>;
}

function CenteredPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <Logo className="mb-5 justify-center" markClassName="h-7 w-7" />
        {children}
      </Card>
    </div>
  );
}

function SignedInApp({ supabase }: { supabase: SupabaseClient }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  if (loading) return <div className="min-h-screen bg-bg" />;
  if (!session) return <SignInScreen supabase={supabase} />;

  return (
    <ToastProvider>
      <BrowserRouter>
        <UserDataProvider userId={session.user.id}>
          <StudyDeskProvider userId={session.user.id}>
            <TimerProvider>
              <Routes>
                {/* The exam zones sit outside the shell: they carry their own
                 * header, their own look and their own light/dark switch. */}
                <Route path="/zone" element={<Navigate to="/zone/gate" replace />} />
                <Route path="/zone/:zone" element={<ZonePage />} />
                <Route
                  path="*"
                  element={
                    <AppShell theme={theme} onToggleTheme={toggleTheme} onSignOut={() => supabase.auth.signOut()}>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/practice" element={<PracticePage />} />
                        <Route path="/ats" element={<AtsPage />} />
                        <Route path="/roadmap" element={<RoadmapPage />} />
                        <Route path="/doubts" element={<DoubtsPage />} />
                        <Route path="/doubts/:slug" element={<SubjectDoubtsPage />} />
                        <Route path="/progress" element={<ProgressPage />} />
                        <Route path="/profile" element={<ProfilePage />} />
                        {/* Anything unrecognised lands on the dashboard rather than a
                         * dead end — there's no deep content worth a 404 page here. */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppShell>
                  }
                />
              </Routes>
            </TimerProvider>
          </StudyDeskProvider>
        </UserDataProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

function SignInScreen({ supabase }: { supabase: SupabaseClient }) {
  const [panel, setPanel] = useState(0);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg bg-grid px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      {/* A faint wash keeps the entry screen from reading as an empty auth wall,
       * while the grid retains the product's measured, engineering-led character. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_76%_28%,rgb(var(--brand)_/_0.10),transparent_25rem),radial-gradient(circle_at_13%_78%,rgb(var(--info)_/_0.06),transparent_22rem)]"
      />

      <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between border-b border-border pb-4">
          <Logo markClassName="h-7 w-7" />
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted sm:inline">
            Solve / Track / Repeat{" "}
            <span className="text-brand">
              {String(panel + 1).padStart(2, "0")} — {String(PANEL_COUNT).padStart(2, "0")}
            </span>
          </span>
        </header>

        <HeroSequence
          onIndexChange={setPanel}
          cta={
            <>
              <Button
                variant="primary"
                size="lg"
                className="w-full active:scale-[0.985]"
                onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
              >
                <GithubIcon />
                Continue with GitHub
                <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden />
              </Button>
              <a
                href="#tour"
                className="mt-4 flex w-fit items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted transition-colors duration-fast hover:text-text"
              >
                <Play className="h-3 w-3" aria-hidden />
                Watch the 21-second tour
              </a>
            </>
          }
        />

        <footer className="flex flex-col gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <SequenceDots index={panel} />
            Made for deliberate practice
          </span>
          <span>LeetCode progress, made legible</span>
        </footer>
      </div>

      {/* Below the fold on purpose: the hero stays the first impression, and
       * the tour is there for anyone who scrolls or follows the link. It has a
       * soundtrack, so it never autoplays — preload="none" also keeps the
       * sign-in screen from downloading it until someone presses play. */}
      <section id="tour" aria-labelledby="tour-title" className="relative mx-auto max-w-6xl scroll-mt-6 pb-16 pt-12">
        <Reveal>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">The tour / 0:21</p>
              <h2 id="tour-title" className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-text sm:text-4xl">
                See Waypoint in 21 seconds.
              </h2>
            </div>
            <p className="max-w-sm font-mono text-[12px] leading-5 text-text-muted">
              Four tracks with dated goals, and solves that commit themselves to GitHub.
            </p>
          </div>

          <div className="mt-6 border border-border bg-elevated">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex gap-1.5" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
                <span className="h-1.5 w-1.5 rounded-full bg-border-strong" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Waypoint / Launch tour</span>
            </div>
            <video
              className="block aspect-video w-full bg-bg"
              poster="/waypoint-tour.jpg"
              controls
              playsInline
              preload="none"
            >
              {/* MP4 first for Safari; builds without H.264 (open-source
               * Chromium on Linux, some Firefox installs) fall through to WebM. */}
              <source src="/waypoint-tour.mp4" type='video/mp4; codecs="avc1.640028, mp4a.40.2"' />
              <source src="/waypoint-tour.webm" type='video/webm; codecs="vp9, opus"' />
              A 21-second tour of Waypoint: dated goals across LeetCode, GATE, CAT and Google Skills, GitHub sync, and
              shared practice sessions.
            </video>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
