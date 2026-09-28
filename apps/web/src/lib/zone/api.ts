import type { TopicStatus, ZoneExam } from "@leettarget/shared";
import { supabase } from "../supabaseClient.js";

function requireClient() {
  if (!supabase) throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  return supabase;
}

// ---- checklist progress ------------------------------------------------

export async function listProgress(userId: string, exam: ZoneExam): Promise<Map<string, TopicStatus>> {
  const { data, error } = await requireClient()
    .from("zone_progress")
    .select("topic_id, status")
    .eq("user_id", userId)
    .eq("exam", exam);
  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.topic_id as string, row.status as TopicStatus]));
}

/** `undefined` clears the tick: an untouched topic has no row at all. */
export async function setTopicStatus(
  userId: string,
  exam: ZoneExam,
  topicId: string,
  status: TopicStatus | undefined
): Promise<void> {
  const client = requireClient();
  if (status === undefined) {
    const { error } = await client
      .from("zone_progress")
      .delete()
      .eq("user_id", userId)
      .eq("exam", exam)
      .eq("topic_id", topicId);
    if (error) throw error;
    return;
  }
  const { error } = await client
    .from("zone_progress")
    .upsert(
      { user_id: userId, exam, topic_id: topicId, status, updated_at: new Date().toISOString() },
      { onConflict: "user_id,exam,topic_id" }
    );
  if (error) throw error;
}

export interface BoardRow {
  userId: string;
  displayName?: string;
  leetcodeUsername?: string;
  avatarUrl?: string;
  studied: number;
  revised: number;
  lastActive: string;
}

export async function listBoard(exam: ZoneExam): Promise<BoardRow[]> {
  const { data, error } = await requireClient()
    .from("zone_board")
    .select("*")
    .eq("exam", exam)
    .order("studied", { ascending: false })
    .limit(50);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    leetcodeUsername: row.leetcode_username ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    studied: Number(row.studied),
    revised: Number(row.revised),
    lastActive: row.last_active,
  }));
}

// ---- assignments ---------------------------------------------------------

export interface Assignment {
  id: string;
  title: string;
  note?: string;
  dueOn?: string;
  storagePath?: string;
  fileName?: string;
  byteSize?: number;
  doneAt?: string;
  createdAt: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAssignment(row: any): Assignment {
  return {
    id: row.id,
    title: row.title,
    note: row.note ?? undefined,
    dueOn: row.due_on ?? undefined,
    storagePath: row.storage_path ?? undefined,
    fileName: row.file_name ?? undefined,
    byteSize: row.byte_size ?? undefined,
    doneAt: row.done_at ?? undefined,
    createdAt: row.created_at,
  };
}

export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export async function listAssignments(userId: string, exam: ZoneExam): Promise<Assignment[]> {
  const { data, error } = await requireClient()
    .from("zone_assignments")
    .select("*")
    .eq("user_id", userId)
    .eq("exam", exam)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToAssignment);
}

export async function createAssignment(input: {
  userId: string;
  exam: ZoneExam;
  title: string;
  note?: string;
  dueOn?: string;
  file?: File;
}): Promise<Assignment> {
  const client = requireClient();
  let upload: { storage_path: string; file_name: string; content_type: string; byte_size: number } | undefined;

  if (input.file) {
    if (input.file.size > MAX_FILE_BYTES) throw new Error("Files are capped at 20 MB.");
    // Folder layout is what the storage policies check: {user_id}/{exam}/...
    const safeName = input.file.name.replace(/[^\w.-]+/g, "_").slice(-120);
    const path = `${input.userId}/${input.exam}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await client.storage
      .from("zone-files")
      .upload(path, input.file, { contentType: input.file.type || "application/octet-stream" });
    if (error) throw error;
    upload = {
      storage_path: path,
      file_name: input.file.name.slice(0, 180),
      content_type: input.file.type || "application/octet-stream",
      byte_size: input.file.size,
    };
  }

  const { data, error } = await client
    .from("zone_assignments")
    .insert({
      user_id: input.userId,
      exam: input.exam,
      title: input.title.trim(),
      note: input.note?.trim() || null,
      due_on: input.dueOn || null,
      ...upload,
    })
    .select()
    .single();
  if (error) {
    // Don't leave an orphaned file behind a row that never got written.
    if (upload) await client.storage.from("zone-files").remove([upload.storage_path]);
    throw error;
  }
  return rowToAssignment(data);
}

export async function setAssignmentDone(id: string, done: boolean): Promise<void> {
  const { error } = await requireClient()
    .from("zone_assignments")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAssignment(assignment: Assignment): Promise<void> {
  const client = requireClient();
  if (assignment.storagePath) {
    const { error } = await client.storage.from("zone-files").remove([assignment.storagePath]);
    if (error) throw error;
  }
  const { error } = await client.from("zone_assignments").delete().eq("id", assignment.id);
  if (error) throw error;
}

/** The bucket is private, so every open needs a short-lived signed URL. */
export async function assignmentFileUrl(storagePath: string): Promise<string> {
  const { data, error } = await requireClient().storage.from("zone-files").createSignedUrl(storagePath, 600);
  if (error) throw error;
  return data.signedUrl;
}

// ---- schedule --------------------------------------------------------------

export type ScheduleKind = "study" | "revision" | "mock" | "deadline";

export interface ScheduleItem {
  id: string;
  title: string;
  kind: ScheduleKind;
  onDate: string;
  topicId?: string;
  doneAt?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSchedule(row: any): ScheduleItem {
  return {
    id: row.id,
    title: row.title,
    kind: row.kind,
    onDate: row.on_date,
    topicId: row.topic_id ?? undefined,
    doneAt: row.done_at ?? undefined,
  };
}

export async function listSchedule(userId: string, exam: ZoneExam): Promise<ScheduleItem[]> {
  const { data, error } = await requireClient()
    .from("zone_schedule")
    .select("*")
    .eq("user_id", userId)
    .eq("exam", exam)
    .order("on_date");
  if (error) throw error;
  return (data ?? []).map(rowToSchedule);
}

export async function createScheduleItem(input: {
  userId: string;
  exam: ZoneExam;
  title: string;
  kind: ScheduleKind;
  onDate: string;
  topicId?: string;
}): Promise<ScheduleItem> {
  const { data, error } = await requireClient()
    .from("zone_schedule")
    .insert({
      user_id: input.userId,
      exam: input.exam,
      title: input.title.trim(),
      kind: input.kind,
      on_date: input.onDate,
      topic_id: input.topicId || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToSchedule(data);
}

export async function setScheduleDone(id: string, done: boolean): Promise<void> {
  const { error } = await requireClient()
    .from("zone_schedule")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteScheduleItem(id: string): Promise<void> {
  const { error } = await requireClient().from("zone_schedule").delete().eq("id", id);
  if (error) throw error;
}
