/** URL of the deployed `supabase/functions/leetcode-proxy` edge function.
 * Browsers can't call LeetCode's GraphQL endpoint directly (no CORS
 * headers), so the "Import from LeetCode" feature routes through this
 * instead — see `supabase/README.md` for the deploy step. Unset until a
 * project deploys the function; the import UI hides itself until then. */
export const leetCodeProxyUrl: string | undefined = import.meta.env.VITE_LEETCODE_PROXY_URL || undefined;

/** URL of the deployed `supabase/functions/sync-all-profiles` edge
 * function, behind the Leaderboard's public "Sync everyone" button — an
 * on-demand version of the daily 9pm IST auto-import that runs for every
 * enrolled user at once, not just the signed-in one. Unset until a project
 * deploys the function; the button hides itself until then, same as
 * `leetCodeProxyUrl` above. */
export const syncAllProfilesUrl: string | undefined = import.meta.env.VITE_SYNC_ALL_PROFILES_URL || undefined;
