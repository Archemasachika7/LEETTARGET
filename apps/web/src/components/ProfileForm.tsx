import { getErrorMessage } from "../lib/errors.js";
import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import type { Profile } from "@leettarget/shared";
import { getLeetCodeUsername, getProfile, upsertProfileDetails, uploadAvatar } from "../lib/api.js";

interface Props {
  userId: string;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Avatar + display name + bio, shown on the Settings tab. Uploading a
 * photo is independent of the name/bio form — each saves on its own.
 * Display name and bio are also what a leaderboard row shows for this
 * user (see the "Leaderboard" tab) — this is the public-facing identity,
 * separate from the LeetCode username shown read-only below (that's
 * actually set/changed from the Dashboard's "Import from LeetCode"
 * section, so there's one place that owns that flow rather than two). */
export function ProfileForm({ userId }: Props) {
  const [profile, setProfile] = useState<Profile>();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [leetCodeUsername, setLeetCodeUsernameDisplay] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile(userId)
      .then((p) => {
        setProfile(p);
        setDisplayName(p?.displayName ?? "");
        setBio(p?.bio ?? "");
      })
      .catch((err) => setError(getErrorMessage(err)));
    getLeetCodeUsername(userId)
      .then(setLeetCodeUsernameDisplay)
      .catch(() => {}); // non-critical — just skips the display line
  }, [userId]);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image is too large — please choose one under 2MB.");
      return;
    }

    setUploading(true);
    setError(undefined);
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      setProfile((prev) => ({ userId, displayName: prev?.displayName, bio: prev?.bio, avatarUrl }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDetailsSubmit(e: FormEvent) {
    e.preventDefault();
    setSavingDetails(true);
    setError(undefined);
    try {
      await upsertProfileDetails(userId, { bio, displayName });
      setProfile((prev) => ({ userId, avatarUrl: prev?.avatarUrl, displayName, bio }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSavingDetails(false);
    }
  }

  const detailsChanged = displayName !== (profile?.displayName ?? "") || bio !== (profile?.bio ?? "");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors duration-300 dark:border-slate-700 dark:bg-slate-800">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Profile</h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Shown on the leaderboard — your name/bio here, and the difficulty breakdown and target list from
        the rest of the app, are visible to other signed-in users.
      </p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        LeetCode:{" "}
        {leetCodeUsername ? (
          <span className="font-medium text-slate-700 dark:text-slate-300">{leetCodeUsername}</span>
        ) : (
          <span>not linked yet — set it from the Dashboard's "Import from LeetCode" section.</span>
        )}
      </p>

      <div className="mt-4 flex items-center gap-4">
        <div className="relative">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile avatar"
              className="h-16 w-16 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
              ?
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 text-xs text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              ...
            </div>
          )}
        </div>

        <label className="cursor-pointer rounded border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700">
          {uploading ? "Uploading..." : profile?.avatarUrl ? "Change photo" : "Upload photo"}
          <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} disabled={uploading} />
        </label>
      </div>

      <form onSubmit={handleDetailsSubmit} className="mt-4 flex flex-col gap-3">
        <div>
          <label htmlFor="displayName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Display name
          </label>
          <input
            id="displayName"
            maxLength={60}
            placeholder="Shown on the leaderboard instead of a blank row"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div>
          <label htmlFor="bio" className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Bio
          </label>
          <textarea
            id="bio"
            rows={3}
            maxLength={280}
            placeholder="A short line about your LeetCode journey..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 transition-colors duration-200 placeholder:text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={savingDetails || !detailsChanged}
            className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors duration-200 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900"
          >
            {savingDetails ? "Saving..." : "Save"}
          </button>
          {saved && <span className="text-sm text-green-700 dark:text-green-400">Saved.</span>}
        </div>
      </form>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
