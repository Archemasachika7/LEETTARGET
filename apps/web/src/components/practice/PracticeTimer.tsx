import { useState } from "react";
import { Clock, ExternalLink, Square, Users } from "lucide-react";
import { useUserData } from "../../lib/userData.js";
import { useTimer } from "../../lib/timerProvider.js";
import { formatDuration } from "../../lib/useTimerTick.js";
import { Button, Card, ChoiceGroup, ErrorNote, Field, Input, SectionHeader } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

type Mode = "countdown" | "stopwatch";

const PRESETS = [
  { value: 15, label: "15m" },
  { value: 25, label: "25m" },
  { value: 45, label: "45m" },
  { value: 60, label: "60m" },
];

const MAX_MINUTES = 24 * 60; // matches the DB's 86400s check — a full day, not an arbitrary UI cap

/** Starts, joins or displays a countdown or stopwatch. The tick itself
 * keeps running from TimerProvider regardless of whether this component is
 * mounted — this is just the control surface for it, shown on the
 * Practice page. */
export function PracticeTimer() {
  const { userId } = useUserData();
  const {
    active,
    elapsedSeconds,
    remainingSeconds,
    done,
    isStopwatch,
    busy,
    error,
    pipOpen,
    pipSupported,
    startSolo,
    startShared,
    join,
    popOut,
    stop,
    clearError,
  } = useTimer();
  const [mode, setMode] = useState<Mode>("countdown");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [joinCode, setJoinCode] = useState("");

  const customSeconds = Math.round((hours * 60 + minutes) * 60);
  const canStartCountdown = customSeconds > 0 && customSeconds <= MAX_MINUTES * 60;
  const durationSeconds = mode === "countdown" ? customSeconds : undefined;

  function applyPreset(totalMinutes: number) {
    setHours(Math.floor(totalMinutes / 60));
    setMinutes(totalMinutes % 60);
  }

  async function handleJoin() {
    if (!joinCode.trim()) return;
    const ok = await join(joinCode);
    if (ok) setJoinCode("");
  }

  const displaySeconds = isStopwatch ? elapsedSeconds : remainingSeconds;

  return (
    <Card className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="Timer"
        description={active ? undefined : "Any length you want — a countdown, or an open-ended stopwatch. Solo, or share a code."}
        icon={<Clock className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {!active ? (
        <div className="flex flex-col gap-4">
          <ChoiceGroup
            label="Mode"
            value={mode}
            onChange={setMode}
            options={[
              { value: "countdown", label: "Countdown" },
              { value: "stopwatch", label: "Stopwatch" },
            ]}
          />

          {mode === "countdown" && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.value}
                    size="sm"
                    variant={hours * 60 + minutes === p.value ? "primary" : "secondary"}
                    onClick={() => applyPreset(p.value)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-end gap-3">
                <Field label="Hours" className="w-24">
                  <Input
                    type="number"
                    min={0}
                    max={24}
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Math.min(24, Number(e.target.value) || 0)))}
                  />
                </Field>
                <Field label="Minutes" className="w-24">
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, Number(e.target.value) || 0)))}
                  />
                </Field>
                <p className="pb-2 text-xs text-text-muted">
                  {canStartCountdown ? `= ${formatDuration(customSeconds)}` : "Enter a duration above 0."}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => startSolo(durationSeconds)}
              disabled={mode === "countdown" && !canStartCountdown}
            >
              Start solo {mode === "stopwatch" ? "stopwatch" : "timer"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => startShared(userId, durationSeconds)}
              disabled={mode === "countdown" && !canStartCountdown}
              loading={busy}
              loadingText="Creating…"
            >
              <Users className="h-3.5 w-3.5" aria-hidden />
              Start a shared session
            </Button>
          </div>

          <div className="flex items-end gap-2 border-t border-border pt-4">
            <Field label="Join a session" hint="Enter the code someone shared with you." className="flex-1">
              <Input
                value={joinCode}
                onChange={(e) => {
                  clearError();
                  setJoinCode(e.target.value.toUpperCase());
                }}
                placeholder="e.g. K7XQ2M"
                maxLength={8}
              />
            </Field>
            <Button size="sm" onClick={handleJoin} disabled={!joinCode.trim()} loading={busy}>
              Join
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className={cn("font-mono text-5xl font-bold tabular-nums", done ? "text-success" : "text-text")}>
            {done ? "Done" : formatDuration(displaySeconds)}
          </div>
          <p className="text-xs text-text-muted">
            {isStopwatch ? "Stopwatch" : "Countdown"}
            {active.code && (
              <>
                {" "}
                · shared session · code <span className="font-mono font-medium text-text-secondary">{active.code}</span>
              </>
            )}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {pipSupported && (
              <Button size="sm" variant="secondary" onClick={popOut} disabled={pipOpen}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {pipOpen ? "Floating" : "Pop out"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={stop}>
              <Square className="h-3.5 w-3.5" aria-hidden />
              Stop
            </Button>
          </div>
          {!pipSupported && (
            <p className="text-center text-[11px] text-text-muted">
              Picture-in-picture isn't supported in this browser — keep this tab open to keep watching the timer.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
