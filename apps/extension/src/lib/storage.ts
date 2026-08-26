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
   * row-level security as that user rather than as the anon role. Copy it
   * from the site's "Extension setup" page. Short-lived by design — a
   * proper refresh-token flow is tracked as an M1 open item in Plan.md;
   * for now, re-copying it when sync starts failing is the workaround. */
  supabaseAccessToken?: string;
}

const STORAGE_KEY = "leettarget-config";

export async function getConfig(): Promise<ExtensionConfig> {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ExtensionConfig | undefined) ?? {};
}

export async function setConfig(config: ExtensionConfig): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}
