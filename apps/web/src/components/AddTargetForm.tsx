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
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800"
    >
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Add a target</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          required
          placeholder="Question name"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <input
          required
          type="url"
          placeholder="https://leetcode.com/problems/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
        >
          {saving ? "Adding..." : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
