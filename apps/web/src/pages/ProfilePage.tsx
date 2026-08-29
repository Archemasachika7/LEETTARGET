import { useUserData } from "../lib/userData.js";
import { ProfileForm } from "../components/ProfileForm.js";
import { RepoMappingForm } from "../components/RepoMappingForm.js";
import { ExtensionSetup } from "../components/ExtensionSetup.js";
import { ColdmailerLink } from "../components/ColdmailerLink.js";

/** Identity and integrations in one place — who you are on the leaderboard,
 * the connections (GitHub repo, browser extension) that feed data in, and a
 * door out to Coldmailer for turning solved problems into applications. */
export function ProfilePage() {
  const { userId, refresh } = useUserData();

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">Profile</h1>
        <p className="mt-1 text-sm text-text-muted">Your public identity, and the integrations that sync your solves.</p>
      </header>

      <ProfileForm userId={userId} />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-text">Integrations</h2>
        <RepoMappingForm userId={userId} onSynced={refresh} />
        <ExtensionSetup userId={userId} />
        <ColdmailerLink />
      </section>
    </div>
  );
}
