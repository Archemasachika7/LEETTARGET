/** URL of the deployed `supabase/functions/leetcode-proxy` edge function.
 * Browsers can't call LeetCode's GraphQL endpoint directly (no CORS
 * headers), so the "Import from LeetCode" feature routes through this
 * instead — see `supabase/README.md` for the deploy step. Unset until a
 * project deploys the function; the import UI hides itself until then. */
export const leetCodeProxyUrl: string | undefined = import.meta.env.VITE_LEETCODE_PROXY_URL || undefined;
