import type { Goal, GoalTrack } from "@leettarget/shared";
import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  }
  return supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToGoal(row: any): Goal {
  return {
    id: row.id,
    userId: row.user_id,
    track: row.track,
    title: row.title,
    targetDate: row.target_date,
    targetCount: row.target_count ?? undefined,
    unit: row.unit ?? undefined,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? undefined,
  };
}

/** Live goals for a user, soonest deadline first. Archived ones are excluded:
 * they're kept for the record (see migration 0012), not for planning against. */
export async function listGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await requireClient()
    .from("goals")
    .select("*")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("target_date");
  if (error) throw error;
  return (data ?? []).map(rowToGoal);
}

export interface CreateGoalInput {
  userId: string;
  track: GoalTrack;
  title: string;
  targetDate: string;
  targetCount?: number;
  unit?: string;
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data, error } = await requireClient()
    .from("goals")
    .insert({
      user_id: input.userId,
      track: input.track,
      title: input.title.trim(),
      target_date: input.targetDate,
      target_count: input.targetCount ?? null,
      unit: input.unit?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function updateGoal(
  id: string,
  patch: Partial<Pick<Goal, "title" | "targetDate" | "targetCount" | "unit">>
): Promise<void> {
  const { error } = await requireClient()
    .from("goals")
    .update({
      ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
      ...(patch.targetDate !== undefined ? { target_date: patch.targetDate } : {}),
      ...(patch.targetCount !== undefined ? { target_count: patch.targetCount || null } : {}),
      ...(patch.unit !== undefined ? { unit: patch.unit?.trim() || null } : {}),
    })
    .eq("id", id);
  if (error) throw error;
}

/** Closes a goal out without losing it — a passed exam should stay in the
 * record of what was being worked toward, not disappear. */
export async function archiveGoal(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("goals")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await requireClient().from("goals").delete().eq("id", id);
  if (error) throw error;
}
