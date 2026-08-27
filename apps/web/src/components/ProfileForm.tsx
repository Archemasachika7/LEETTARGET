import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { UserCircle } from "lucide-react";
import type { Profile } from "@leettarget/shared";
import { getErrorMessage } from "../lib/errors.js";
import { getLeetCodeUsername, getProfile, upsertProfileDetails, uploadAvatar } from "../lib/api.js";
import { Badge, Button, Card, ErrorNote, Field, Input, SectionHeader, Textarea, useToast } from "../ui/index.js";

interface Props {
  userId: string;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** Avatar, display name and bio — the public-facing identity other users see
 * on the leaderboard. The linked LeetCode username is shown read-only because
 * it's set from the Dashboard's import section; two places to change one
 * value would just create a "which one wins?" question. */
export function ProfileForm({ userId }: Props) {
  const [profile, setProfile] = useState<Profile>();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [leetCodeUsername, setLeetCodeUsername] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  useEffect(() => {
    getProfile(userId)
      .then((p) => {
        setProfile(p);
        setDisplayName(p?.displayName ?? "");
        setBio(p?.bio ?? "");
      })
      .catch((err) => setError(getErrorMessage(err)));
    getLeetCodeUsername(userId)
      .then(setLeetCodeUsername)
      .catch(() => {});
  }, [userId]);

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.");
    if (file.size > MAX_AVATAR_BYTES) return setError("Image is too large — please choose one under 2MB.");

    setUploading(true);
    setError(undefined);
    try {
      const avatarUrl = await uploadAvatar(userId, file);
      setProfile((prev) => ({ userId, displayName: prev?.displayName, bio: prev?.bio, avatarUrl }));
      toast("Photo updated");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(undefined);
    try {
      await upsertProfileDetails(userId, { bio, displayName });
      setProfile((prev) => ({ userId, avatarUrl: prev?.avatarUrl, displayName, bio }));
      toast("Profile saved");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const changed = displayName !== (profile?.displayName ?? "") || bio !== (profile?.bio ?? "");

  return (
    <Card as="form" onSubmit={handleSubmit} className="flex flex-col gap-5 p-4">
      <SectionHeader
        title="Public profile"
        description="Shown on the leaderboard, along with your difficulty breakdown and target list."
        icon={<UserCircle className="h-4 w-4 text-text-muted" aria-hidden />}
      />

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface ring-1 ring-border">
              <UserCircle className="h-7 w-7 text-text-muted" aria-hidden />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-bg/70 text-[11px] text-text-secondary">
              …
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label className="inline-flex h-9 cursor-pointer items-center rounded border border-border bg-elevated px-3.5 text-sm font-medium text-text transition-colors duration-fast hover:border-border-strong hover:bg-surface">
            {uploading ? "Uploading…" : profile?.avatarUrl ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} disabled={uploading} />
          </label>
          <p className="mt-1.5 text-[12px] text-text-muted">PNG or JPG, up to 2MB.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
        LeetCode account:
        {leetCodeUsername ? (
          <Badge tone="brand">{leetCodeUsername}</Badge>
        ) : (
          <span>not linked — set it from the Dashboard's import section.</span>
        )}
      </div>

      <Field label="Display name" htmlFor="display-name" hint="Shown on the leaderboard instead of a blank row.">
        <Input
          id="display-name"
          maxLength={60}
          placeholder="How you want to appear"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </Field>

      <Field label="Bio" htmlFor="bio">
        <Textarea
          id="bio"
          rows={3}
          maxLength={280}
          placeholder="A short line about your LeetCode journey…"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </Field>

      <Button type="submit" variant="primary" disabled={!changed} loading={saving} loadingText="Saving…" className="self-start">
        Save profile
      </Button>

      {error && <ErrorNote>{error}</ErrorNote>}
    </Card>
  );
}
