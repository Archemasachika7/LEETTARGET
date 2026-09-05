import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type { Goal, GoalTrack } from "@leettarget/shared";
import { archiveGoal, createGoal, updateGoal } from "../../lib/goals.js";
import { getErrorMessage } from "../../lib/errors.js";
import { Button, Chassis, ErrorNote, Field, Input, Panel, TelemetryBar, useToast } from "../../ui/index.js";

/** Sensible starting titles per track, so the common case is one tap and a
 * date rather than a blank field. These are suggestions in the placeholder,
 * never prefilled values — a goal someone didn't type isn't their goal. */
const PLACEHOLDER: Record<GoalTrack, { title: string; unit: string }> = {
  leetcode: { title: "500 problems before placements", unit: "problems" },
  gate: { title: "GATE 2027", unit: "topics" },
  cat: { title: "CAT 2026", unit: "mocks" },
  "google-skills": { title: "Associate Cloud Engineer badges", unit: "badges" },
};

interface Props {
  userId: string;
  track: GoalTrack;
  existing?: Goal;
  onDone: () => void;
  onCancel: () => void;
}

export function GoalForm({ userId, track, existing, onDone, onCancel }: Props) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [targetDate, setTargetDate] = useState(existing?.targetDate?.slice(0, 10) ?? "");
  const [targetCount, setTargetCount] = useState(existing?.targetCount?.toString() ?? "");
  const [unit, setUnit] = useState(existing?.unit ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  const hint = PLACEHOLDER[track];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    setSaving(true);
    setError(undefined);
    try {
      // An empty count is meaningful, not missing: it makes this a pure date
      // marker, which the summary treats as "untracked" rather than 0%.
      const count = targetCount.trim() ? Number(targetCount) : undefined;
      if (count !== undefined && (!Number.isFinite(count) || count <= 0)) {
        throw new Error("A target count has to be a positive number — or leave it empty for a date-only goal.");
      }

      if (existing) {
        await updateGoal(existing.id, { title, targetDate, targetCount: count, unit });
        toast("Goal updated");
      } else {
        await createGoal({ userId, track, title, targetDate, targetCount: count, unit });
        toast("Goal added");
      }
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    if (!existing) return;
    setSaving(true);
    try {
      await archiveGoal(existing.id);
      toast("Goal archived");
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Chassis as="form" onSubmit={handleSubmit} className="edge-lit">
      <TelemetryBar
        left={<span>{existing ? "Edit goal" : "New goal"}</span>}
        right={<span>{track.toUpperCase()}</span>}
      />
      <Panel mark className="flex flex-col gap-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Field label="What are you working toward?">
          <Input
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={hint.title}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <Input required type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </Field>
          <Field label="Target" hint="Optional">
            <Input
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              placeholder="e.g. 500"
            />
          </Field>
          <Field label="Unit" hint="Optional">
            <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder={hint.unit} />
          </Field>
        </div>

        <p className="text-[12px] leading-5 text-text-muted">
          Leave the target empty for a date you just want to see counted down — an exam, an application window.
          Add one and this goal also reports whether the work is keeping up with the calendar.
        </p>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {existing && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleArchive}
              className="mr-auto text-text-muted"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Archive
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            variant="primary"
            loading={saving}
            loadingText="Saving…"
            disabled={!title.trim() || !targetDate}
          >
            {existing ? "Save changes" : "Add goal"}
          </Button>
        </div>
      </Panel>
    </Chassis>
  );
}
