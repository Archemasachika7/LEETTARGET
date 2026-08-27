import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { getErrorMessage } from "../lib/errors.js";
import { addManualTarget } from "../lib/api.js";
import { Button, Card, ErrorNote, Field, Input, SectionHeader, useToast } from "../ui/index.js";

interface Props {
  userId: string;
  onAdded: () => void;
}

/** Add a single target from the site — no CSV required. */
export function AddTargetForm({ userId, onAdded }: Props) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await addManualTarget(userId, title, url);
      setTitle("");
      setUrl("");
      onAdded();
      toast("Target added");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
      <SectionHeader
        title="Add a target"
        description="One problem you plan to solve."
        icon={<Plus className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <Field label="Question" htmlFor="target-title">
        <Input
          id="target-title"
          required
          placeholder="Two Sum"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </Field>

      <Field label="Link" htmlFor="target-url">
        <Input
          id="target-url"
          required
          type="url"
          placeholder="https://leetcode.com/problems/two-sum/"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" variant="primary" loading={saving} loadingText="Adding…">
          Add target
        </Button>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
    </Card>
  );
}
