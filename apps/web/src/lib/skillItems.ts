import type { SkillItem, SkillItemKind, SkillItemStatus } from "@leettarget/shared";
import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  }
  return supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSkillItem(row: any): SkillItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    title: row.title,
    url: row.url ?? undefined,
    status: row.status,
    targetDate: row.target_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
  };
}

/** Every Google Skills item for a user, newest first. Manually logged, not
 * synced from Cloud Skills Boost or Coursera — see migration
 * 0013_google_skills.sql for why. */
export async function listSkillItems(userId: string): Promise<SkillItem[]> {
  const { data, error } = await requireClient()
    .from("skill_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSkillItem);
}

export interface CreateSkillItemInput {
  userId: string;
  kind: SkillItemKind;
  title: string;
  url?: string;
  targetDate?: string;
}

export async function createSkillItem(input: CreateSkillItemInput): Promise<SkillItem> {
  const { data, error } = await requireClient()
    .from("skill_items")
    .insert({
      user_id: input.userId,
      kind: input.kind,
      title: input.title.trim(),
      url: input.url?.trim() || null,
      target_date: input.targetDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSkillItem(data);
}

/** Setting status to "done" stamps `completedAt`; moving off "done" clears
 * it again, so the two never disagree about whether this item is finished. */
export async function setSkillItemStatus(id: string, status: SkillItemStatus): Promise<void> {
  const { error } = await requireClient()
    .from("skill_items")
    .update({ status, completed_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteSkillItem(id: string): Promise<void> {
  const { error } = await requireClient().from("skill_items").delete().eq("id", id);
  if (error) throw error;
}
