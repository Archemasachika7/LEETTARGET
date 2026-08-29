import type { PracticeSession } from "@leettarget/shared";
import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  }
  return supabase;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — easy to read aloud

function randomCode(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function rowToSession(row: any): PracticeSession {
  return {
    id: row.id,
    code: row.code,
    hostUserId: row.host_user_id,
    label: row.label ?? undefined,
    durationSeconds: row.duration_seconds,
    startedAt: row.started_at,
    createdAt: row.created_at,
  };
}

/** Creates a shared session and returns it with its shareable code. Retries
 * a handful of times on a code collision (vanishingly unlikely at 6
 * characters from a 33-symbol alphabet, but cheap to handle). */
export async function createPracticeSession(
  hostUserId: string,
  durationSeconds: number,
  label?: string
): Promise<PracticeSession> {
  const client = requireClient();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const { data, error } = await client
      .from("practice_sessions")
      .insert({ code, host_user_id: hostUserId, duration_seconds: durationSeconds, label: label || null })
      .select()
      .single();
    if (!error) return rowToSession(data);
    if (error.code !== "23505") throw error; // anything but "code already taken" is a real failure
  }
  throw new Error("Couldn't generate a free session code — try again.");
}

/** Looks up a shared session by its code (case-insensitive, trims
 * whitespace — codes are meant to be read aloud and typed by hand). */
export async function getPracticeSessionByCode(code: string): Promise<PracticeSession | undefined> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return undefined;
  const { data, error } = await requireClient()
    .from("practice_sessions")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToSession(data) : undefined;
}
