import { setConfig, type ExtensionConfig } from "./storage.js";

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
  expires_at?: number; // unix seconds
  expires_in?: number; // seconds
}

/** Refreshes the Supabase access token using the stored refresh token, and
 * persists the new pair back to extension storage. Supabase rotates the
 * refresh token on every use — the old one stops working immediately — so
 * this always saves the new refresh token too, never just the access
 * token, or the *next* refresh would fail. */
export async function refreshSupabaseToken(config: ExtensionConfig): Promise<ExtensionConfig> {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseRefreshToken) {
    throw new Error("Missing Supabase config for token refresh.");
  }

  const res = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: config.supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refresh_token: config.supabaseRefreshToken }),
  });

  if (!res.ok) {
    throw new Error(`Supabase token refresh failed: ${res.status}`);
  }

  const json = (await res.json()) as RefreshResponse;
  const updated: ExtensionConfig = {
    ...config,
    supabaseAccessToken: json.access_token,
    supabaseRefreshToken: json.refresh_token,
    supabaseExpiresAt: json.expires_at ?? Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
  };
  await setConfig(updated);
  return updated;
}

/** True when the stored token is known to be within a minute of expiring —
 * lets the caller refresh proactively instead of always waiting for a 401.
 * Unknown expiry (no timestamp recorded yet) reads as "not stale"; the
 * reactive 401-triggered refresh in `background.ts` covers that case. */
export function isTokenStale(config: ExtensionConfig): boolean {
  if (!config.supabaseExpiresAt) return false;
  return config.supabaseExpiresAt <= Math.floor(Date.now() / 1000) + 60;
}
