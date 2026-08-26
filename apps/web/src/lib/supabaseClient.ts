import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** `null` until `.env.local` is filled in — see `.env.example`. Callers
 * should check `isSupabaseConfigured` (or handle a null client) rather
 * than assume it's always ready, since this scaffold can run before a
 * Supabase project is wired up. */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;
