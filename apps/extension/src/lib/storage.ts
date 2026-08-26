/** Extension configuration, set from the options page and read by the
 * background service worker on every solve. */
export interface ExtensionConfig {
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  pathTemplate?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  /** The signed-in user's id — used as the `user_id` on synced rows. */
  leetTargetUserId?: string;
  /** The signed-in user's Supabase access token (JWT), so writes satisfy
   * row-level security as that user rather than as the anon role. Set from
   * the site's "Extension setup" page's copyable setup code. Short-lived
   * (Supabase's default is ~1hr) — `supabaseRefreshToken` is what keeps
   * this working past that; see `lib/supabaseAuth.ts`. */
  supabaseAccessToken?: string;
  /** Used to silently mint a new access token when the current one expires
   * or is rejected — see `lib/supabaseAuth.ts`. Supabase rotates this on
   * every use, so it's always overwritten together with the access token,
   * never read without also being replaced. */
  supabaseRefreshToken?: string;
  /** Unix seconds. Lets a refresh happen proactively, just before expiry,
   * rather than only reactively after a 401 — see `isTokenStale`. */
  supabaseExpiresAt?: number;
}

const STORAGE_KEY = "leettarget-config";

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ExtensionConfig | undefined) ?? {};
}

export async function setConfig(config: ExtensionConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}
