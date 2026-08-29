import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { applyTheme, getInitialTheme, type Theme } from "./lib/theme.js";
import { UserDataProvider } from "./lib/userData.js";
import { StudyDeskProvider } from "./lib/studyDesk.js";
import { AppShell } from "./components/shell/AppShell.js";
import { Logo, LogoMark } from "./components/brand/Logo.js";
import { ArrowUpRight, Check, CircleDot, GitBranch, ListChecks } from "lucide-react";
import { GithubIcon } from "./components/brand/GithubIcon.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PracticePage } from "./pages/PracticePage.js";
import { RoadmapPage } from "./pages/RoadmapPage.js";
import { ProgressPage } from "./pages/ProgressPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
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
            <AppShell theme={theme} onToggleTheme={toggleTheme} onSignOut={() => supabase.auth.signOut()}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/practice" element={<PracticePage />} />
                <Route path="/ats" element={<AtsPage />} />
                <Route path="/roadmap" element={<RoadmapPage />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                {/* Anything unrecognised lands on the dashboard rather than a
                 * dead end — there's no deep content worth a 404 page here. */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </StudyDeskProvider>
        </UserDataProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

function SignInScreen({ supabase }: { supabase: SupabaseClient }) {
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
            Practice system / v1
          </span>
        </header>

        <main className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-20 lg:py-16">
          <section className="max-w-xl animate-enter">
            <div className="mb-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">
              <span className="h-px w-8 bg-brand" />
              A quieter way to get better
            </div>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-text sm:text-5xl lg:text-[3.65rem]">
              Let every difficult problem point somewhere.
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-text-secondary sm:text-[17px]">
              LeetTarget turns scattered coding, GATE and CAT sessions into a considered practice loop: choose a
              focus, notice the pattern in your progress, and leave yourself a clean way back into difficult work.
            </p>

            <dl className="mt-10 grid gap-5 border-t border-border pt-6 sm:grid-cols-3">
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">01 / LeetCode</dt>
                <dd className="mt-2 text-sm font-medium text-text">Keep coding practice deliberate</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">02 / GATE</dt>
                <dd className="mt-2 text-sm font-medium text-text">Return to concepts that need time</dd>
              </div>
              <div>
                <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">03 / CAT</dt>
                <dd className="mt-2 text-sm font-medium text-text">Learn from a missed method or set</dd>
              </div>
            </dl>
          </section>

          <section className="relative animate-enter border border-border bg-elevated/80 p-5 shadow-[0_18px_50px_rgb(0_0_0_/_0.06)] backdrop-blur-sm sm:p-7 [animation-delay:80ms]">
            <span aria-hidden className="absolute -left-px -top-px h-3 w-3 border-l border-t border-brand" />
            <span aria-hidden className="absolute -bottom-px -right-px h-3 w-3 border-b border-r border-brand" />

            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-brand">Begin here</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-text">Build your practice trail.</h2>
              </div>
              <LogoMark className="h-8 w-8 shrink-0" title="LeetTarget" />
            </div>

            <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
              Sign in to organise coding practice, revisit GATE concepts and keep CAT methods close when they need another pass.
            </p>

            <Button
              variant="primary"
              size="lg"
              className="mt-6 w-full active:scale-[0.985]"
              onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
            >
              <GithubIcon />
              Continue with GitHub
              <ArrowUpRight className="ml-auto h-4 w-4" aria-hidden />
            </Button>

            <div className="my-7 h-px bg-border" />

            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted">A glimpse of the rhythm</p>
              <span className="text-[11px] text-text-muted">Example view</span>
            </div>

            <div className="mt-4 border border-border bg-bg">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-text">
                  <CircleDot className="h-4 w-4 text-brand" aria-hidden />
                  Today&apos;s focus
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted">Session 018</span>
              </div>
              <div className="space-y-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center border border-success/40 bg-success/10 text-success">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-text">Arrays &amp; hashing</span>
                      <span className="shrink-0 font-mono text-[11px] text-text-muted">2 / 3</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden bg-surface">
                      <div className="h-full w-2/3 bg-brand" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 border-t border-border pt-4 text-sm">
                  <ListChecks className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                  <span className="flex-1 text-text-secondary">Next: Sliding window patterns</span>
                  <GitBranch className="h-4 w-4 shrink-0 text-text-muted" aria-hidden />
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs leading-5 text-text-muted">
              One place for your targets, your repetition, and your proof of work.
            </p>
          </section>
        </main>

        <footer className="flex flex-col gap-2 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-[0.12em] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Made for deliberate practice</span>
          <span>LeetCode progress, made legible</span>
        </footer>
      </div>
    </div>
  );
}
