import type { Doubt, DoubtImage, DoubtImageKind, Problem, Subject } from "@leettarget/shared";
import { slugFromLeetCodeUrl, slugifySubject } from "@leettarget/shared";
import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  }
  return supabase;
}

function rowToSubject(row: any): Subject {
  return { id: row.id, slug: row.slug, name: row.name, createdBy: row.created_by, createdAt: row.created_at };
}

function rowToDoubt(row: any): Doubt {
  return {
    id: row.id,
    subjectId: row.subject_id,
    authorId: row.author_id,
    problemId: row.problem_id ?? undefined,
    title: row.title,
    questionText: row.question_text ?? undefined,
    solutionText: row.solution_text ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToImage(row: any): DoubtImage {
  return {
    id: row.id,
    doubtId: row.doubt_id,
    uploadedBy: row.uploaded_by,
    kind: row.kind,
    storagePath: row.storage_path,
    createdAt: row.created_at,
  };
}

// --- subjects ----------------------------------------------------------

/** Every subject that exists — a directory to browse and join, not scoped
 * to membership (RLS opens `select` on subjects to any signed-in user; it's
 * `doubts` that's actually membership-gated). */
export async function listSubjects(): Promise<Subject[]> {
  const { data, error } = await requireClient().from("subjects").select("*").order("name");
  if (error) throw error;
  return (data ?? []).map(rowToSubject);
}

/** Subjects this user has joined — including implicitly, by having posted a
 * doubt in one (see the `doubts_author_joins_subject` trigger). */
export async function listMySubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await requireClient()
    .from("subject_members")
    .select("subjects(*)")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((row: any) => rowToSubject(row.subjects)).sort((a, b) => a.name.localeCompare(b.name));
}

/** Creates a subject, or — if its normalised slug already exists — returns
 * the existing one instead of erroring, so "create" reads as idempotent
 * from the caller's side even though subject creation is open to everyone
 * and duplicate names are expected. */
export async function findOrCreateSubject(userId: string, name: string): Promise<Subject> {
  const trimmed = name.trim();
  const slug = slugifySubject(trimmed);
  if (!slug) throw new Error("That name doesn't have anything usable in it — try adding a letter or number.");

  const client = requireClient();
  const { data: inserted, error: insertError } = await client
    .from("subjects")
    .insert({ slug, name: trimmed, created_by: userId })
    .select()
    .single();
  if (!insertError) return rowToSubject(inserted);
  if (insertError.code !== "23505") throw insertError; // anything but "slug already taken" is a real failure

  const { data: existing, error: selectError } = await client.from("subjects").select("*").eq("slug", slug).single();
  if (selectError) throw selectError;
  return rowToSubject(existing);
}

export async function getSubjectBySlug(slug: string): Promise<Subject | undefined> {
  const { data, error } = await requireClient().from("subjects").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? rowToSubject(data) : undefined;
}

/** `listDoubts` on a subject the reader hasn't joined just returns an empty
 * list — RLS filters rows silently, it doesn't error — so callers need this
 * to tell "no doubts yet" apart from "you haven't joined, so you can't see
 * any yet" and render the right prompt. */
export async function isSubjectMember(userId: string, subjectId: string): Promise<boolean> {
  const { data, error } = await requireClient()
    .from("subject_members")
    .select("subject_id")
    .eq("subject_id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function joinSubject(userId: string, subjectId: string): Promise<void> {
  const { error } = await requireClient()
    .from("subject_members")
    .upsert({ subject_id: subjectId, user_id: userId }, { onConflict: "subject_id,user_id" });
  if (error) throw error;
}

export async function leaveSubject(userId: string, subjectId: string): Promise<void> {
  const { error } = await requireClient()
    .from("subject_members")
    .delete()
    .eq("subject_id", subjectId)
    .eq("user_id", userId);
  if (error) throw error;
}

// --- linking a doubt to a LeetCode problem --------------------------------

/** Resolves a pasted LeetCode URL or bare slug to a canonical problem, so a
 * doubt can be tied to it. Only matches what's already in `problems` (the
 * shared catalogue every target/solve joins against) — doesn't create a new
 * row, since a doubt isn't a source of truth for a problem existing. */
export async function findProblemBySlug(input: string): Promise<Problem | undefined> {
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  const slug = slugFromLeetCodeUrl(trimmed) ?? trimmed.toLowerCase().replace(/\s+/g, "-");

  const { data, error } = await requireClient().from("problems").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return { id: data.id, slug: data.slug, title: data.title, url: data.url, difficulty: data.difficulty, tags: data.tags ?? [] };
}

export async function getProblemById(id: string): Promise<Problem | undefined> {
  const { data, error } = await requireClient().from("problems").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return { id: data.id, slug: data.slug, title: data.title, url: data.url, difficulty: data.difficulty, tags: data.tags ?? [] };
}

// --- doubts --------------------------------------------------------------

export async function listDoubts(subjectId: string): Promise<Doubt[]> {
  const { data, error } = await requireClient()
    .from("doubts")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDoubt);
}

/** Doubts tied to one canonical LeetCode problem, across every subject the
 * reader is a member of — RLS does the subject-membership filtering, this
 * just asks for a problem instead of a subject. */
export async function listDoubtsForProblem(problemId: string): Promise<Doubt[]> {
  const { data, error } = await requireClient()
    .from("doubts")
    .select("*")
    .eq("problem_id", problemId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToDoubt);
}

export async function getDoubt(id: string): Promise<Doubt | undefined> {
  const { data, error } = await requireClient().from("doubts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? rowToDoubt(data) : undefined;
}

export interface CreateDoubtInput {
  subjectId: string;
  authorId: string;
  problemId?: string;
  title: string;
  questionText?: string;
  solutionText?: string;
}

export async function createDoubt(input: CreateDoubtInput): Promise<Doubt> {
  const { data, error } = await requireClient()
    .from("doubts")
    .insert({
      subject_id: input.subjectId,
      author_id: input.authorId,
      problem_id: input.problemId ?? null,
      title: input.title,
      question_text: input.questionText || null,
      solution_text: input.solutionText || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToDoubt(data);
}

export async function setDoubtStatus(id: string, status: Doubt["status"]): Promise<void> {
  const { error } = await requireClient()
    .from("doubts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Fills in the answer on a doubt that was originally posted without one —
 * the "ask now, answer once I've learned it" case this is mostly for.
 * Marks the doubt resolved in the same update, since a doubt with a
 * solution attached has by definition stopped being open. */
export async function addDoubtSolution(id: string, solutionText: string): Promise<void> {
  const { error } = await requireClient()
    .from("doubts")
    .update({ solution_text: solutionText || null, status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDoubt(id: string): Promise<void> {
  const { error } = await requireClient().from("doubts").delete().eq("id", id);
  if (error) throw error;
}

// --- doubt images --------------------------------------------------------

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export async function listDoubtImages(doubtId: string): Promise<DoubtImage[]> {
  const { data, error } = await requireClient()
    .from("doubt_images")
    .select("*")
    .eq("doubt_id", doubtId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(rowToImage);
}

export async function uploadDoubtImage(
  subjectId: string,
  doubtId: string,
  userId: string,
  kind: DoubtImageKind,
  file: File
): Promise<DoubtImage> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("That file doesn't look like an image (PNG, JPG, WEBP or GIF only).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images are capped at 5MB — try a smaller screenshot.");
  }

  const client = requireClient();
  const ext = file.name.split(".").pop() || "png";
  // Layout matches what the storage.objects RLS policies expect:
  // {subject_id}/{doubt_id}/{...} — the first folder segment is what those
  // policies check membership against.
  const path = `${subjectId}/${doubtId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await client.storage.from("doubt-images").upload(path, file, { cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("doubt_images")
    .insert({ doubt_id: doubtId, uploaded_by: userId, kind, storage_path: path })
    .select()
    .single();
  if (error) throw error;
  return rowToImage(data);
}

/** Doubt images live in a private bucket (unlike avatars), so every render
 * needs a fresh signed URL rather than a stable public one. */
export async function getDoubtImageUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await requireClient().storage.from("doubt-images").createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDoubtImage(id: string, storagePath: string): Promise<void> {
  const client = requireClient();
  const { error: storageError } = await client.storage.from("doubt-images").remove([storagePath]);
  if (storageError) throw storageError;
  const { error } = await client.from("doubt_images").delete().eq("id", id);
  if (error) throw error;
}
