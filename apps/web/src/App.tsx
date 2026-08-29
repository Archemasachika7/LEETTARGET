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
import { ArrowUpRight } from "lucide-react";
import { GithubIcon } from "./components/brand/GithubIcon.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PracticePage } from "./pages/PracticePage.js";
import { RoadmapPage } from "./pages/RoadmapPage.js";
import { ProgressPage } from "./pages/ProgressPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
import { DoubtsPage } from "./pages/DoubtsPage.js";
import { SubjectDoubtsPage } from "./pages/SubjectDoubtsPage.js";
import AtsPage from "./pages/AtsPage.js";
import { Button, Card, ToastProvider } from "./ui/index.js";

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
    </div>
  );
}
