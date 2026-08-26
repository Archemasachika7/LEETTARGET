import type {
  GithubLink,
  LeetCodeSolvedSummary,
  Problem,
  Profile,
  SolvedProblem,
  Target,
  TargetSource,
} from "@leettarget/shared";
import {
  fetchQuestionDifficulty,
  fetchRecentAcSubmissions,
  fetchSolvedSummary,
  slugFromLeetCodeUrl,
} from "@leettarget/shared";
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
  const slug = slugFromLeetCodeUrl(url);
  const client = requireClient();
  const { error } = await client.from("targets").insert({
    user_id: userId,
    custom_title: title,
    custom_url: url,
    slug,
    source: "manual" satisfies TargetSource,
    status: "pending",
  });
  if (error) throw error;

  if (slug) await markAlreadySolvedTargetsDone(client, userId, [slug]);
}

/** Marks any of the given slugs "done" if the user already has a matching
 * `solved_problems` row — closes the gap where a target created *after*
 * a solve (a CSV upload, a manual add) would otherwise sit "pending"
 * forever, since the "mark done" step normally only runs at solve time
 * (an extension sync or a LeetCode import), against whatever targets
 * existed at that moment. */
async function markAlreadySolvedTargetsDone(
  client: ReturnType<typeof requireClient>,
  userId: string,
  slugs: string[]
): Promise<void> {
  const uniqueSlugs = [...new Set(slugs)];
  if (uniqueSlugs.length === 0) return;

  const { data: problems, error: problemsError } = await client
    .from("problems")
    .select("id, slug")
    .in("slug", uniqueSlugs);
  if (problemsError) throw problemsError;
  if (!problems || problems.length === 0) return;

  const { data: solved, error: solvedError } = await client
    .from("solved_problems")
    .select("problem_id")
    .eq("user_id", userId)
    .in(
      "problem_id",
      problems.map((p) => p.id)
    );
  if (solvedError) throw solvedError;
  if (!solved || solved.length === 0) return;

  const solvedProblemIds = new Set(solved.map((s) => s.problem_id));
  const solvedSlugs = problems.filter((p) => solvedProblemIds.has(p.id)).map((p) => p.slug);
  if (solvedSlugs.length === 0) return;

  const { error: targetError } = await client
    .from("targets")
    .update({ status: "done" })
    .eq("user_id", userId)
    .in("slug", solvedSlugs);
  if (targetError) throw targetError;
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

  const slugs = rows.map((r) => r.slug).filter((s): s is string => Boolean(s));
  await markAlreadySolvedTargetsDone(client, userId, slugs);
}

export async function deleteTarget(id: string): Promise<void> {
  const { error } = await requireClient().from("targets").delete().eq("id", id);
  if (error) throw error;
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

// --- profile ---------------------------------------------------------------

export async function getProfile(userId: string): Promise<Profile | undefined> {
  const { data, error } = await requireClient()
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProfile(data) : undefined;
}

export async function upsertProfileBio(userId: string, bio: string): Promise<void> {
  const { error } = await requireClient()
    .from("profiles")
    .upsert({ user_id: userId, bio, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Uploads an avatar to the "avatars" storage bucket under the user's own
 * folder (required by the bucket's RLS policies — see
 * supabase/migrations/0003_profiles.sql) and saves the resulting public URL
 * onto the profile row. */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const client = requireClient();
  const ext = file.name.split(".").pop() || "png";
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = client.storage.from("avatars").getPublicUrl(path);
  // Storage URLs are stable per path, so the browser can cache a stale
  // image after a re-upload unless the URL itself changes.
  const avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await client
    .from("profiles")
    .upsert({ user_id: userId, avatar_url: avatarUrl, updated_at: new Date().toISOString() });
  if (profileError) throw profileError;

  return avatarUrl;
}

// --- LeetCode import -------------------------------------------------------

export interface LeetCodeImportResult {
  summary: LeetCodeSolvedSummary;
  /** How many of the fetched recent solves were written/updated. Capped by
   * `fetchRecentAcSubmissions`'s limit — this is a recent-activity backfill,
   * not a full history import (LeetCode's public API doesn't expose one). */
  imported: number;
}

const DIFFICULTY_FETCH_CONCURRENCY = 5;

/** Fetches difficulty for each slug through the proxy, a few at a time —
 * `Promise.all` over the whole list would fire e.g. 100 requests at once,
 * which is more load than a "nice to have" chart deserves to put on
 * LeetCode's API. Failures already resolve to "Unknown" inside
 * `fetchQuestionDifficulty` itself, so this never throws. */
async function fetchDifficultiesBatched(
  slugs: string[],
  proxyUrl: string,
  proxyApiKey: string
): Promise<Map<string, Problem["difficulty"]>> {
  const result = new Map<string, Problem["difficulty"]>();
  for (let i = 0; i < slugs.length; i += DIFFICULTY_FETCH_CONCURRENCY) {
    const batch = slugs.slice(i, i + DIFFICULTY_FETCH_CONCURRENCY);
    const difficulties = await Promise.all(
      batch.map((slug) => fetchQuestionDifficulty(slug, { proxyUrl, proxyApiKey }))
    );
    batch.forEach((slug, idx) => result.set(slug, difficulties[idx]));
  }
  return result;
}

/** Pulls a public LeetCode profile's solved counts + recent accepted
 * submissions through the edge-function proxy, upserts them into
 * `problems`/`solved_problems`, and marks any matching target "done". */
export async function importFromLeetCode(
  userId: string,
  username: string,
  proxyUrl: string
): Promise<LeetCodeImportResult> {
  const proxyApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const [summary, recent] = await Promise.all([
    fetchSolvedSummary(username, { proxyUrl, proxyApiKey }),
    fetchRecentAcSubmissions(username, 100, { proxyUrl, proxyApiKey }),
  ]);

  // A successful manual import enrolls the user in the daily auto-import —
  // one less thing to set up separately. Best-effort: a failure here
  // shouldn't undo the import that already succeeded above.
  setLeetCodeUsername(userId, username).catch((err) =>
    console.warn("Failed to remember LeetCode username for auto-import:", err)
  );

  if (recent.length === 0) {
    return { summary, imported: 0 };
  }

  // LeetCode's recent-submissions list can name the same problem twice —
  // resubmitted, or solved in more than one language — and a single
  // upsert batch can't target the same on_conflict row twice (Postgres
  // rejects the whole statement: "ON CONFLICT DO UPDATE command cannot
  // affect row a second time"). Keep the first (most recent, since the
  // API returns newest-first) occurrence per slug.
  const uniqueBySlug = new Map<string, (typeof recent)[number]>();
  for (const r of recent) {
    if (!uniqueBySlug.has(r.slug)) uniqueBySlug.set(r.slug, r);
  }
  const uniqueRecent = [...uniqueBySlug.values()];

  // LeetCode's recent-submissions query doesn't include difficulty, so it
  // has to be fetched per problem — otherwise every imported problem would
  // sit at "Unknown" forever, and the dashboard's difficulty chart would
  // never show anything but the gray "unresolved" bucket for anyone who
  // only ever imports (rather than solving through the extension, which
  // resolves it per-solve). Batched at a modest concurrency rather than
  // fired all at once, out of courtesy to LeetCode's API.
  const difficultyBySlug = await fetchDifficultiesBatched(
    uniqueRecent.map((r) => r.slug),
    proxyUrl,
    proxyApiKey
  );

  const client = requireClient();

  const { data: problemRows, error: problemError } = await client
    .from("problems")
    .upsert(
      uniqueRecent.map((r) => ({
        slug: r.slug,
        title: r.title,
        url: `https://leetcode.com/problems/${r.slug}/`,
        difficulty: difficultyBySlug.get(r.slug) ?? "Unknown",
      })),
      { onConflict: "slug", ignoreDuplicates: false }
    )
    .select("id, slug");
  if (problemError) throw problemError;

  const problemIdBySlug = new Map((problemRows ?? []).map((p) => [p.slug as string, p.id as string]));

  const { error: solvedError } = await client.from("solved_problems").upsert(
    uniqueRecent
      .filter((r) => problemIdBySlug.has(r.slug))
      .map((r) => ({
        user_id: userId,
        problem_id: problemIdBySlug.get(r.slug),
        language: r.lang,
        // LeetCode reports this in unix seconds; our column is a timestamptz.
        solved_at: new Date(r.timestamp * 1000).toISOString(),
      })),
    { onConflict: "user_id,problem_id" }
  );
  if (solvedError) throw solvedError;

  const { error: targetError } = await client
    .from("targets")
    .update({ status: "done" })
    .eq("user_id", userId)
    .in(
      "slug",
      uniqueRecent.map((r) => r.slug)
    );
  if (targetError) throw targetError;

  return { summary, imported: uniqueRecent.length };
}

/** The username the daily-import edge function auto-imports for this user
 * at 9pm IST (see `supabase/functions/daily-import` and the pg_cron
 * schedule documented in `supabase/README.md`). Set automatically by a
 * successful manual import; also settable directly. */
export async function getLeetCodeUsername(userId: string): Promise<string | undefined> {
  const { data, error } = await requireClient()
    .from("leetcode_profiles")
    .select("username")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.username ?? undefined;
}

export async function setLeetCodeUsername(userId: string, username: string): Promise<void> {
  const { error } = await requireClient()
    .from("leetcode_profiles")
    .upsert({ user_id: userId, username, updated_at: new Date().toISOString() });
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

export interface DifficultyCounts {
  easy: number;
  medium: number;
  hard: number;
  /** Solves whose problem row hasn't had a difficulty resolved yet — e.g.
   * imported via "Import from LeetCode", which doesn't fetch per-problem
   * difficulty (see `importFromLeetCode`). */
  unknown: number;
}

/** Solved counts by difficulty, via a join against `problems` so we don't
 * have to fetch the whole catalog client-side just to bucket a handful of
 * solves. */
export async function getSolvedByDifficulty(userId: string): Promise<DifficultyCounts> {
  // `.returns<T>()` overrides supabase-js's generic-less inference, which
  // (with no generated Database types available) can't tell this is a
  // to-one embed (via solved_problems.problem_id) and otherwise guesses an
  // array shape — PostgREST actually returns a single object here.
  const { data, error } = await requireClient()
    .from("solved_problems")
    .select("problem:problems(difficulty)")
    .eq("user_id", userId)
    .returns<{ problem: { difficulty: string } | null }[]>();
  if (error) throw error;

  const counts: DifficultyCounts = { easy: 0, medium: 0, hard: 0, unknown: 0 };
  for (const row of data ?? []) {
    const difficulty = row.problem?.difficulty;
    if (difficulty === "Easy") counts.easy++;
    else if (difficulty === "Medium") counts.medium++;
    else if (difficulty === "Hard") counts.hard++;
    else counts.unknown++;
  }
  return counts;
}

/** A solved problem with enough of its canonical `problems` row joined in
 * to render + link it — used by the solution-mapping override UI, which
 * needs the title/slug/url that plain `SolvedProblem` doesn't carry. */
export interface SolvedWithProblem {
  id: string;
  problemTitle: string;
  problemSlug: string;
  problemUrl: string;
  difficulty: Problem["difficulty"];
  language?: string;
  githubPath?: string;
  solvedAt: string;
}

export async function listSolvedWithProblems(userId: string): Promise<SolvedWithProblem[]> {
  // See getSolvedByDifficulty for why `.returns<T>()` is needed here.
  const { data, error } = await requireClient()
    .from("solved_problems")
    .select("id, language, github_path, solved_at, problem:problems(title, slug, url, difficulty)")
    .eq("user_id", userId)
    .order("solved_at", { ascending: false })
    .returns<
      {
        id: string;
        language: string | null;
        github_path: string | null;
        solved_at: string;
        problem: { title: string; slug: string; url: string; difficulty: string } | null;
      }[]
    >();
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.problem !== null)
    .map((row) => ({
      id: row.id,
      problemTitle: row.problem!.title,
      problemSlug: row.problem!.slug,
      problemUrl: row.problem!.url,
      difficulty: row.problem!.difficulty as Problem["difficulty"],
      language: row.language ?? undefined,
      githubPath: row.github_path ?? undefined,
      solvedAt: row.solved_at,
    }));
}

/** Overrides the GitHub path LeetTarget associates with a solve — for when
 * the auto-detected `{difficulty}/{slug}` guess (see `buildSolutionPath`)
 * doesn't match how the repo is actually laid out. */
export async function updateSolvedGithubPath(id: string, githubPath: string): Promise<void> {
  const { error } = await requireClient()
    .from("solved_problems")
    .update({ github_path: githubPath })
    .eq("id", id);
  if (error) throw error;
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(row: any): Profile {
  return {
    userId: row.user_id,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}
