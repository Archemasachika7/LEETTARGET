import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPracticeSession, getPracticeSessionByCode } from "./timerSession.js";
import { openTimerPip, pipSupported as pipIsSupported, type PipHandle } from "./pip.js";
import { formatCountdown, useCountdown } from "./useCountdown.js";
import { getErrorMessage } from "./errors.js";

export interface ActiveTimerSession {
  startedAt: string;
  durationSeconds: number;
  /** Free-text description, host-set — shared sessions only. */
  label?: string;
  /** Present only for a shared session; absent for a solo timer. */
  code?: string;
}

interface TimerContextValue {
  active?: ActiveTimerSession;
  remainingSeconds: number;
  done: boolean;
  busy: boolean;
  error?: string;
  pipOpen: boolean;
  pipSupported: boolean;
  startSolo: (durationSeconds: number) => void;
  startShared: (userId: string, durationSeconds: number, label?: string) => Promise<void>;
  join: (code: string) => Promise<boolean>;
  popOut: () => Promise<void>;
  stop: () => void;
  clearError: () => void;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

/** Lives above the router (see AppShell), not inside the Practice page, so
 * the countdown and an open Picture-in-Picture window both keep running
 * while you navigate to other pages in the app — not just while you're on
 * a different tab or site entirely. A page-scoped component would stop
 * ticking (and freeze the PiP display) the moment you left /practice. */
export function TimerProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveTimerSession>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [pipOpen, setPipOpen] = useState(false);
  const pipRef = useRef<PipHandle>();

  const { remainingSeconds, done } = useCountdown(active?.startedAt, active?.durationSeconds);

  useEffect(() => {
    if (!active || !pipRef.current) return;
    const label = active.label ?? (active.code ? `Session ${active.code}` : undefined);
    pipRef.current.setText(done ? "Done" : formatCountdown(remainingSeconds), label);
  }, [remainingSeconds, done, active]);

  const startSolo = useCallback((durationSeconds: number) => {
    setActive({ startedAt: new Date().toISOString(), durationSeconds });
    setError(undefined);
  }, []);

  const startShared = useCallback(async (userId: string, durationSeconds: number, label?: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const session = await createPracticeSession(userId, durationSeconds, label);
      setActive({
        startedAt: session.startedAt,
        durationSeconds: session.durationSeconds,
        label: session.label,
        code: session.code,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, []);

  const join = useCallback(async (code: string) => {
    setBusy(true);
    setError(undefined);
    try {
      const session = await getPracticeSessionByCode(code);
      if (!session) {
        setError("No session with that code — check it and try again.");
        return false;
      }
      setActive({
        startedAt: session.startedAt,
        durationSeconds: session.durationSeconds,
        label: session.label,
        code: session.code,
      });
      return true;
    } catch (err) {
      setError(getErrorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const popOut = useCallback(async () => {
    if (pipRef.current || !active) return;
    const label = active.label ?? (active.code ? `Session ${active.code}` : undefined);
    const handle = await openTimerPip(label);
    if (!handle) return;
    handle.onClosedByUser(() => {
      pipRef.current = undefined;
      setPipOpen(false);
    });
    handle.setText(formatCountdown(remainingSeconds));
    pipRef.current = handle;
    setPipOpen(true);
  }, [active, remainingSeconds]);

  const stop = useCallback(() => {
    pipRef.current?.close();
    pipRef.current = undefined;
    setPipOpen(false);
    setActive(undefined);
  }, []);

  const clearError = useCallback(() => setError(undefined), []);

  return (
    <TimerContext.Provider
      value={{
        active,
        remainingSeconds,
        done,
        busy,
        error,
        pipOpen,
        pipSupported: pipIsSupported(),
        startSolo,
        startShared,
        join,
        popOut,
        stop,
        clearError,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer must be used inside <TimerProvider>.");
  return ctx;
}
