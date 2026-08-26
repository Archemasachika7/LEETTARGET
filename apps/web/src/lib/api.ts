import type { GithubLink, Problem, SolvedProblem, Target, TargetSource } from "@leettarget/shared";
import { slugFromLeetCodeUrl } from "@leettarget/shared";
import { supabase } from "./supabaseClient.js";

function requireClient() {
  if (!supabase) {
    throw new Error("Supabase isn't configured yet — see apps/web/.env.example.");
  }
  return supabase;
}

// --- targets -----------------------------------------------------------

export async function listTargets(userId: string): Promise<Target[]> {
  const { data, error } = await requireClient()
    .from("targets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToTarget);
}

export async function addManualTarget(
  userId: string,
  title: string,
  url: string
): Promise<void> {
  const { error } = await requireClient().from("targets").insert({
    user_id: userId,
    custom_title: title,
    custom_url: url,
    slug: slugFromLeetCodeUrl(url),
    source: "manual" satisfies TargetSource,
    status: "pending",
  });
  if (error) throw error;
}

/** Replaces the user's CSV-sourced pending targets with a freshly parsed
 * set — this is the "update map" flow. Already-solved targets (status
 * "done") are left untouched so re-uploading never loses history. */
export async function replaceCsvTargets(
  userId: string,
  rows: { title: string; url: string; slug?: string }[]
): Promise<void> {
  const client = requireClient();

  const { error: deleteError } = await client
    .from("targets")
    .delete()
    .eq("user_id", userId)
    .eq("source", "csv")
    .eq("status", "pending");
  if (deleteError) throw deleteError;

  if (rows.length === 0) return;

  const { error: insertError } = await client.from("targets").insert(
    rows.map((row) => ({
      user_id: userId,
      custom_title: row.title,
      custom_url: row.url,
      slug: row.slug,
      source: "csv" satisfies TargetSource,
      status: "pending",
    }))
  );
  if (insertError) throw insertError;
}

// --- github repo mapping -------------------------------------------------

export async function getGithubLink(userId: string): Promise<GithubLink | undefined> {
  const { data, error } = await requireClient()
    .from("github_links")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGithubLink(data) : undefined;
}

export async function upsertGithubLink(link: GithubLink): Promise<void> {
  const { error } = await requireClient().from("github_links").upsert({
    user_id: link.userId,
    owner: link.owner,
    repo: link.repo,
    branch: link.branch,
    path_template: link.pathTemplate,
  });
  if (error) throw error;
}

// --- solved problems -----------------------------------------------------

export async function listSolvedProblems(userId: string): Promise<SolvedProblem[]> {
  const { data, error } = await requireClient()
    .from("solved_problems")
    .select("*")
    .eq("user_id", userId)
    .order("solved_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToSolvedProblem);
}

export async function listProblems(): Promise<Problem[]> {
  const { data, error } = await requireClient().from("problems").select("*");
  if (error) throw error;
  return (data ?? []).map(rowToProblem);
}

// --- row <-> type mapping (snake_case DB columns -> camelCase types) -----

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTarget(row: any): Target {
  return {
    id: row.id,
    userId: row.user_id,
    problemId: row.problem_id ?? undefined,
    customTitle: row.custom_title ?? undefined,
    customUrl: row.custom_url ?? undefined,
    slug: row.slug ?? undefined,
    source: row.source,
    status: row.status,
    createdAt: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToGithubLink(row: any): GithubLink {
  return {
    userId: row.user_id,
    owner: row.owner,
    repo: row.repo,
    branch: row.branch,
    pathTemplate: row.path_template,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSolvedProblem(row: any): SolvedProblem {
  return {
    id: row.id,
    userId: row.user_id,
    problemId: row.problem_id,
    language: row.language ?? undefined,
    githubPath: row.github_path ?? undefined,
    commitSha: row.commit_sha ?? undefined,
    solvedAt: row.solved_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProblem(row: any): Problem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    url: row.url,
    difficulty: row.difficulty,
    tags: row.tags ?? [],
  };
}
