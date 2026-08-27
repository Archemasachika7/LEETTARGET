import { useState, type FormEvent } from "react";
import { DEFAULT_GOALS, type PracticeFocus, type UserGoals } from "@leettarget/shared";
import { upsertUserGoals } from "../../lib/api.js";
import { getErrorMessage } from "../../lib/errors.js";
import { Button, ChoiceGroup, ErrorNote, Field, useToast } from "../../ui/index.js";

const FOCUS_OPTIONS: { value: PracticeFocus; label: string }[] = [
  { value: "interview", label: "Interviews" },
  { value: "competitive", label: "Competitive" },
  { value: "fundamentals", label: "Fundamentals" },
  { value: "general", label: "General" },
];

const DAILY_OPTIONS = [1, 2, 3, 5, 8].map((n) => ({ value: n, label: `${n}` }));

interface Props {
  userId: string;
  existing?: UserGoals;
  onSaved: () => void;
  /** First run asks the "why" as well; editing later keeps it to the numbers
   * that actually drive the dashboard. */
  onboarding?: boolean;
}

/** Deliberately one short form rather than a multi-page onboarding flow:
 * two numbers and an optional reason is everything the dashboard needs. */
export function GoalsForm({ userId, existing, onSaved, onboarding }: Props) {
  const [dailyTarget, setDailyTarget] = useState(existing?.dailyTarget ?? DEFAULT_GOALS.dailyTarget);
  const [weeklyTarget, setWeeklyTarget] = useState(existing?.weeklyTarget ?? DEFAULT_GOALS.weeklyTarget);
  const [focus, setFocus] = useState<PracticeFocus>(existing?.focus ?? "interview");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await upsertUserGoals(userId, {
        dailyTarget,
        weeklyTarget,
        focus,
        goalTotal: existing?.goalTotal,
        goalDeadline: existing?.goalDeadline,
        markOnboarded: true,
      });
      onSaved();
      toast(onboarding ? "Target set — good luck." : "Goals updated");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Field label="Problems per day" hint="What a good day looks like.">
          <ChoiceGroup label="Daily target" value={dailyTarget} onChange={setDailyTarget} options={DAILY_OPTIONS} />
        </Field>
        <Field label="Per week" hint="Room for rest days.">
          <ChoiceGroup
            label="Weekly target"
            value={weeklyTarget}
            onChange={setWeeklyTarget}
            options={[7, 10, 15, 20, 30].map((n) => ({ value: n, label: `${n}` }))}
          />
        </Field>
      </div>

      {onboarding && (
        <Field label="What are you practising for?" hint="Only used to phrase your dashboard.">
          <ChoiceGroup label="Focus" value={focus} onChange={setFocus} options={FOCUS_OPTIONS} />
        </Field>
      )}

      <Button type="submit" variant="primary" loading={saving} loadingText="Saving…" className="self-start">
        {onboarding ? "Set my target" : "Save goals"}
      </Button>

      {error && <ErrorNote>{error}</ErrorNote>}
    </form>
  );
}
