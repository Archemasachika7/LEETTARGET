import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient.js";
import { applyTheme, getInitialTheme, type Theme } from "./lib/theme.js";
import { UserDataProvider } from "./lib/userData.js";
import { AppShell } from "./components/shell/AppShell.js";
import { Logo, LogoMark } from "./components/brand/Logo.js";
import { GithubIcon } from "./components/brand/GithubIcon.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PracticePage } from "./pages/PracticePage.js";
import { ProgressPage } from "./pages/ProgressPage.js";
import { ProfilePage } from "./pages/ProfilePage.js";
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
          <AppShell theme={theme} onToggleTheme={toggleTheme} onSignOut={() => supabase.auth.signOut()}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              {/* Anything unrecognised lands on the dashboard rather than a
               * dead end — there's no deep content worth a 404 page here. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </UserDataProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

function SignInScreen({ supabase }: { supabase: SupabaseClient }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm text-center">
        <LogoMark className="mx-auto h-10 w-10" title="LeetTarget" />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-text">
          Leet<span className="text-brand">Target</span>
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Plan, solve, track and analyse your LeetCode practice — and map every solution back to your GitHub repo.
        </p>
        <Button
          variant="primary"
          size="lg"
          className="mt-7 w-full"
          onClick={() => supabase.auth.signInWithOAuth({ provider: "github" })}
        >
          <GithubIcon />
          Sign in with GitHub
        </Button>
      </div>
    </div>
  );
}
