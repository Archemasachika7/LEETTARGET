import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import type { SkillItemKind } from "@leettarget/shared";
import { useUserData } from "../../lib/userData.js";
import { useSkillItems } from "../../lib/useSkillItems.js";
import { createSkillItem, deleteSkillItem, setSkillItemStatus } from "../../lib/skillItems.js";
import { getErrorMessage } from "../../lib/errors.js";
import {
  Button,
  Chassis,
  ErrorNote,
  Field,
  Input,
  MonoLabel,
  Panel,
  Reveal,
  Select,
  SkeletonRows,
  StatusDot,
  TelemetryBar,
  useToast,
} from "../../ui/index.js";

const KIND_LABEL: Record<SkillItemKind, string> = {
  "cloud-skills-boost": "Cloud Skills Boost",
  "career-certificate": "Career Certificate",
  general: "General",
};

/** The manually-logged skill list behind the Google Skills track — a badge,
 * course or self-declared skill with a status, not a synced catalogue.
 * Neither Cloud Skills Boost nor Coursera has a free public API to fetch
 * from (see migration 0013_google_skills.sql), so this stays honest by
 * only ever showing what was actually typed in.
 *
 * Shared between the Google Skills dashboard (paired with its `GoalDeck`)
 * and the practice page (on its own), the way GATE/CAT's stuck desk is its
 * own capture surface separate from their dashboard summary. */
export function GoogleSkillsLog({ trackLabel }: { trackLabel: string }) {
  const { userId } = useUserData();
  const { items, loading, refresh } = useSkillItems(userId);

  const done = items.filter((item) => item.status === "done").length;
  const inProgress = items.filter((item) => item.status === "in-progress").length;
  const planned = items.filter((item) => item.status === "planned").length;

  return (
    <>
      <Reveal as="section">
        <Chassis className="overflow-hidden">
          <TelemetryBar left={<span>{trackLabel} / skill log</span>} right={<span>Manually logged, not synced</span>} />
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <Panel mark>
              <div className="flex items-center gap-2">
                <StatusDot tone="muted" />
                <MonoLabel>Planned</MonoLabel>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{planned}</p>
            </Panel>
            <Panel>
              <div className="flex items-center gap-2">
                <StatusDot tone={inProgress > 0 ? "warning" : "muted"} />
                <MonoLabel>In progress</MonoLabel>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{inProgress}</p>
            </Panel>
            <Panel>
              <div className="flex items-center gap-2">
                <StatusDot tone={done > 0 ? "success" : "muted"} />
                <MonoLabel>Done</MonoLabel>
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-text tnum">{done}</p>
            </Panel>
          </div>
        </Chassis>
      </Reveal>

      <Reveal as="section" className="flex flex-col gap-3">
        <SkillItemForm userId={userId} onAdded={refresh} />
        {loading ? (
          <SkeletonRows rows={3} />
        ) : items.length === 0 ? (
          <p className="px-1 text-[13px] text-text-muted">
            Nothing logged yet — add the first badge, course or skill you're working toward.
          </p>
        ) : (
          <Chassis className="stagger divide-y divide-border">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-text-muted">
                  {KIND_LABEL[item.kind]}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-text">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </span>
                <select
                  value={item.status}
                  onChange={(e) => setSkillItemStatus(item.id, e.target.value as typeof item.status).then(refresh)}
                  className="h-8 border border-border bg-surface px-2 text-[12px] text-text"
                >
                  <option value="planned">Planned</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteSkillItem(item.id).then(refresh)}
                  className="text-text-muted"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </Chassis>
        )}
      </Reveal>
    </>
  );
}

function SkillItemForm({ userId, onAdded }: { userId: string; onAdded: () => void }) {
  const [kind, setKind] = useState<SkillItemKind>("cloud-skills-boost");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(undefined);
    try {
      await createSkillItem({ userId, kind, title, url: url.trim() || undefined });
      setTitle("");
      setUrl("");
      toast("Skill added");
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Chassis as="form" onSubmit={handleSubmit}>
      <Panel mark className="flex flex-col gap-3">
        {error && <ErrorNote>{error}</ErrorNote>}
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr_auto]">
          <Field label="Kind">
            <Select value={kind} onChange={(e) => setKind(e.target.value as SkillItemKind)}>
              <option value="cloud-skills-boost">Cloud Skills Boost</option>
              <option value="career-certificate">Career Certificate</option>
              <option value="general">General</option>
            </Select>
          </Field>
          <Field label="Title">
            <Input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Associate Cloud Engineer"
            />
          </Field>
          <Field label="Link" hint="Optional">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Badge or course URL" />
          </Field>
          <div className="flex items-end">
            <Button type="submit" size="sm" variant="primary" loading={saving} disabled={!title.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Panel>
    </Chassis>
  );
}
