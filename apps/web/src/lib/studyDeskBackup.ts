import type { StuckItem } from "./studyDesk.js";
import { exportStudyAttachments, type StudyAttachmentMeta, type StudyDeskBackupAttachment } from "./studyDeskAttachments.js";

/** Deliberately keeps its pre-rename value. This string is the format marker
 * inside every backup file already sitting in someone's downloads folder —
 * changing it would make the app reject its own past exports for no reason a
 * user would ever see or care about. The product name changed; the file
 * format didn't. */
export const STUDY_DESK_BACKUP_KIND = "leettarget-study-desk-backup";
export const STUDY_DESK_BACKUP_VERSION = 1;

export interface StudyDeskBackup {
  kind: typeof STUDY_DESK_BACKUP_KIND;
  version: typeof STUDY_DESK_BACKUP_VERSION;
  exportedAt: string;
  items: StuckItem[];
  attachments: StudyDeskBackupAttachment[];
}

export interface BackupImportResult {
  items: StuckItem[];
  attachments: StudyDeskBackupAttachment[];
  exportedAt: string;
}

/**
 * Backups carry only the learner's GATE/CAT desk entries—never their login,
 * LeetCode targets, GitHub mapping or other app data. The explicit kind and
 * version keep the format durable while leaving room for future improvements.
 */
export function createStudyDeskBackup(items: StuckItem[], attachments: StudyDeskBackupAttachment[] = []): StudyDeskBackup {
  return {
    kind: STUDY_DESK_BACKUP_KIND,
    version: STUDY_DESK_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    items,
    attachments,
  };
}

/** The one place the old name was actually visible — a downloaded file lands
 * in someone's folder with this on it, so it follows the product name. The
 * `kind` marker inside the file does not (see above). */
export function studyDeskBackupFilename(now = new Date()): string {
  return `waypoint-study-desk-${now.toISOString().slice(0, 10)}.json`;
}

export async function downloadStudyDeskBackup(items: StuckItem[]): Promise<void> {
  const attachments = await exportStudyAttachments(items.map((item) => item.id));
  const backup = createStudyDeskBackup(items, attachments);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = studyDeskBackupFilename();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function parseStudyDeskBackup(raw: string): BackupImportResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!isRecord(value) || value.kind !== STUDY_DESK_BACKUP_KIND) {
    throw new Error("This isn't a Waypoint study-desk backup.");
  }
  if (value.version !== STUDY_DESK_BACKUP_VERSION) {
    throw new Error("This backup was made with an unsupported version of Waypoint.");
  }
  if (!isIsoDate(value.exportedAt)) {
    throw new Error("This backup is missing a valid export date.");
  }
  if (!Array.isArray(value.items)) {
    throw new Error("This backup has no valid study-desk items.");
  }
  if (value.attachments !== undefined && !Array.isArray(value.attachments)) {
    throw new Error("This backup has invalid attachments.");
  }

  const items = value.items.map(parseStuckItem);
  const attachments = (value.attachments ?? []).map(parseBackupAttachment);
  const itemIds = new Set(items.map((item) => item.id));
  const attachmentCounts = new Map<string, number>();
  for (const attachment of attachments) {
    if (!itemIds.has(attachment.itemId)) throw new Error("A backup attachment does not belong to a saved question.");
    const count = (attachmentCounts.get(attachment.itemId) ?? 0) + 1;
    if (count > 8) throw new Error("A saved question has more than 8 attachments.");
    attachmentCounts.set(attachment.itemId, count);
  }

  return { items, attachments, exportedAt: value.exportedAt };
}

function parseStuckItem(value: unknown): StuckItem {
  if (!isRecord(value)) throw new Error("One of the saved questions is malformed.");
  if (!isShortText(value.id, 180)) throw new Error("One saved question is missing its identifier.");
  if (value.track !== "gate" && value.track !== "cat") throw new Error("A saved question has an unsupported study track.");
  if (!isShortText(value.title, 140)) throw new Error("A saved question needs a title under 140 characters.");
  if (!isShortText(value.subject, 100)) throw new Error("A saved question needs a subject under 100 characters.");
  if (value.note !== undefined && (!isShortText(value.note, 500) || value.note.trim().length === 0)) {
    throw new Error("A saved note must be under 500 characters.");
  }
  if (value.answer !== undefined && (!isShortText(value.answer, 4000) || value.answer.trim().length === 0)) {
    throw new Error("A saved answer must be under 4,000 characters.");
  }
  if (value.method !== undefined && (!isShortText(value.method, 4000) || value.method.trim().length === 0)) {
    throw new Error("A saved method must be under 4,000 characters.");
  }
  if (value.attachments !== undefined && !Array.isArray(value.attachments)) {
    throw new Error("A saved question has invalid attachments.");
  }
  if (Array.isArray(value.attachments) && value.attachments.length > 8) {
    throw new Error("A saved question has more than 8 attachments.");
  }
  if (value.status !== "stuck" && value.status !== "revisit" && value.status !== "cleared") {
    throw new Error("A saved question has an unsupported status.");
  }
  if (!isIsoDate(value.createdAt)) throw new Error("A saved question has an invalid creation date.");

  return {
    id: value.id,
    track: value.track,
    title: value.title.trim(),
    subject: value.subject.trim(),
    note: value.note?.trim() || undefined,
    answer: value.answer?.trim() || undefined,
    method: value.method?.trim() || undefined,
    attachments: value.attachments?.map(parseAttachmentMeta),
    status: value.status,
    createdAt: value.createdAt,
  };
}

function parseAttachmentMeta(value: unknown): StudyAttachmentMeta {
  if (!isRecord(value)) throw new Error("A saved question has malformed attachment metadata.");
  if (!isShortText(value.id, 180) || !isShortText(value.name, 180) || !isShortText(value.type, 140)) {
    throw new Error("A saved question has malformed attachment metadata.");
  }
  if (typeof value.size !== "number" || !Number.isFinite(value.size) || value.size < 0 || value.size > 12 * 1024 * 1024) {
    throw new Error("A saved attachment has an invalid file size.");
  }
  return { id: value.id, name: value.name, type: value.type, size: value.size };
}

function parseBackupAttachment(value: unknown): StudyDeskBackupAttachment {
  if (!isRecord(value)) throw new Error("One attachment in this backup is malformed.");
  const meta = parseAttachmentMeta(value);
  if (!isShortText(value.itemId, 180) || !isShortText(value.dataUrl, 18 * 1024 * 1024) || !value.dataUrl.startsWith("data:")) {
    throw new Error("One attachment in this backup is malformed.");
  }
  return { ...meta, itemId: value.itemId, dataUrl: value.dataUrl };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isShortText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}
