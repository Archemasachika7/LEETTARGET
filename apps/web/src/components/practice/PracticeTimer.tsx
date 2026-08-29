import { useState } from "react";
import { Clock, ExternalLink, Square, Users } from "lucide-react";
import { useUserData } from "../../lib/userData.js";
import { useTimer } from "../../lib/timerProvider.js";
import { formatCountdown } from "../../lib/useCountdown.js";
import { Button, Card, ChoiceGroup, ErrorNote, Field, Input, SectionHeader } from "../../ui/index.js";
import { cn } from "../../lib/cn.js";

const PRESETS = [
  { value: 15 * 60, label: "15m" },
  { value: 25 * 60, label: "25m" },
  { value: 45 * 60, label: "45m" },
  { value: 60 * 60, label: "60m" },
];

/** Starts, joins or displays a countdown. The countdown itself keeps
 * running from TimerProvider regardless of whether this component is
 * mounted — this is just the control surface for it, shown on the
 * Practice page. */
export function PracticeTimer() {
  const { userId } = useUserData();
  const { active, remainingSeconds, done, busy, error, pipOpen, pipSupported, startSolo, startShared, join, popOut, stop, clearError } =
    useTimer();
  const [preset, setPreset] = useState(PRESETS[1].value);
  const [joinCode, setJoinCode] = useState("");

  async function handleJoin() {
    if (!joinCode.trim()) return;
    const ok = await join(joinCode);
    if (ok) setJoinCode("");
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="Timer"
        description={active ? undefined : "Run your own countdown, or share a code so others count down with you."}
        icon={<Clock className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {!active ? (
        <div className="flex flex-col gap-4">
          <Field label="Duration">
            <ChoiceGroup
              label="Duration"
              value={preset}
              onChange={setPreset}
              options={PRESETS.map((p) => ({ value: p.value, label: p.label }))}
            />
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" size="sm" onClick={() => startSolo(preset)}>
              Start solo timer
            </Button>
            <Button variant="secondary" size="sm" onClick={() => startShared(userId, preset)} loading={busy} loadingText="Creating…">
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
            {done ? "Done" : formatCountdown(remainingSeconds)}
          </div>
          {active.code && (
            <p className="text-xs text-text-muted">
              Shared session · code <span className="font-mono font-medium text-text-secondary">{active.code}</span>
            </p>
          )}
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
