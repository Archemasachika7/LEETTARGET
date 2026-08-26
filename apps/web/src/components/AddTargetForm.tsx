import { getErrorMessage } from "../lib/errors.js";
import { useState, type FormEvent } from "react";
import { addManualTarget } from "../lib/api.js";

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await addManualTarget(userId, title, url);
      setTitle("");
      setUrl("");
      onAdded();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">Add a target</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          required
          placeholder="Question name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          required
          type="url"
          placeholder="https://leetcode.com/problems/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
