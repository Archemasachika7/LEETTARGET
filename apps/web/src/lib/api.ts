import type {
  GithubLink,
  LeaderboardEntry,
  LeetCodeSolvedSummary,
  Problem,
  Profile,
  SolvedProblem,
  Target,
  TargetSource,
  TopicProblem,
  UserGoals,
} from "@leettarget/shared";
import {
  fetchQuestionDifficulty,
  fetchQuestionMeta,
  fetchRecentAcSubmissions,
  fetchRepoSolvedSlugs,
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

export interface GithubSyncResult {
  /** Repo folder/file names that matched a known slug (already-known
   * problem, or one of this user's own targets) — the total the repo scan
   * recognized, whether or not it was already recorded. */
  matched: number;
  /** Of those, how many were new `solved_problems` rows this run actually
   * inserted. */
  newlySynced: number;
  /** How many already-recorded solves had their `github_path` filled in
   * from this scan — e.g. one imported earlier via a LeetCode username
   * import, which doesn't know a file path. Never overwrites a path that
   * was already set (a prior sync's match, or a manual correction). */
  pathsFilled: number;
}

/** Backfills solved status from a repo that already has solutions
 * committed to it (e.g. a LeetHub repo predating LeetTarget) — the
 * extension and "Import from LeetCode" only ever see solves going
 * forward/recently, so without this, an existing repo's history never
 * shows up in solved status or the difficulty chart. Matches folder/file
 * names in the repo's tree against slugs we already know about (the
 * `problems` catalog, or this user's own targets) rather than trusting an
 * arbitrary folder name outright. */
export async function syncFromGithubRepo(
  userId: string,
  link: GithubLink,
  proxyUrl?: string,
  /** Only needed for a private repo — a public one works without it. Used
   * solely for the one GitHub API request this makes; never sent to
   * Supabase or persisted anywhere. */
  githubToken?: string
): Promise<GithubSyncResult> {
  const candidates = await fetchRepoSolvedSlugs(
    { owner: link.owner, repo: link.repo, branch: link.branch },
    { token: githubToken }
  );
  if (candidates.size === 0) return { matched: 0, newlySynced: 0, pathsFilled: 0 };

  const slugs = [...candidates.keys()];
  const client = requireClient();

  const { data: existingProblems, error: problemsError } = await client
    .from("problems")
    .select("id, slug, difficulty")
    .in("slug", slugs);
  if (problemsError) throw problemsError;

  const { data: myTargets, error: targetsError } = await client
    .from("targets")
    .select("slug, custom_title, custom_url")
    .eq("user_id", userId)
    .in("slug", slugs);
  if (targetsError) throw targetsError;

  const problemBySlug = new Map(
    (existingProblems ?? []).map((p) => [p.slug as string, { id: p.id as string, difficulty: p.difficulty as string }])
  );
  const targetBySlug = new Map(
    (myTargets ?? []).filter((t) => Boolean(t.slug)).map((t) => [t.slug as string, t])
  );

  // A bare folder/file name is too uncertain to trust on its own — only
  // create a new `problems` row for it when it also matches one of this
  // user's own targets (so we have a real title/url to attach), never for
  // an arbitrary slug-shaped name that happens to appear in the tree.
  const newProblemRows = slugs
    .filter((slug) => !problemBySlug.has(slug) && targetBySlug.has(slug))
    .map((slug) => {
      const target = targetBySlug.get(slug)!;
      return {
        slug,
        title: target.custom_title ?? slug,
        url: target.custom_url ?? `https://leetcode.com/problems/${slug}/`,
      };
    });

  if (newProblemRows.length > 0) {
    const { data: inserted, error: insertError } = await client
      .from("problems")
      .upsert(newProblemRows, { onConflict: "slug", ignoreDuplicates: false })
      .select("id, slug, difficulty");
    if (insertError) throw insertError;
    for (const p of inserted ?? []) {
      problemBySlug.set(p.slug as string, { id: p.id as string, difficulty: p.difficulty as string });
    }
  }

  const matchedSlugs = slugs.filter((slug) => problemBySlug.has(slug));
  if (matchedSlugs.length === 0) return { matched: 0, newlySynced: 0, pathsFilled: 0 };

  // Same enrichment as a LeetCode import — otherwise every repo-matched
  // solve whose problem row was just created above would sit at "Unknown"
  // forever, and the difficulty chart's gray bucket would only grow.
  const proxyApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (proxyUrl) {
    const unresolvedSlugs = matchedSlugs.filter((slug) => problemBySlug.get(slug)?.difficulty === "Unknown");
    if (unresolvedSlugs.length > 0) {
      const difficultyBySlug = await fetchDifficultiesBatched(unresolvedSlugs, proxyUrl, proxyApiKey);
      for (const slug of unresolvedSlugs) {
        const difficulty = difficultyBySlug.get(slug);
        if (!difficulty || difficulty === "Unknown") continue;
        const { error: updateError } = await client.from("problems").update({ difficulty }).eq("slug", slug);
        if (updateError) throw updateError;
      }
    }
  }

  const problemIds = matchedSlugs.map((slug) => problemBySlug.get(slug)!.id);
  const { data: existingSolved, error: existingSolvedError } = await client
    .from("solved_problems")
    .select("id, problem_id, github_path")
    .eq("user_id", userId)
    .in("problem_id", problemIds);
  if (existingSolvedError) throw existingSolvedError;
  const existingByProblemId = new Map(
    (existingSolved ?? []).map((s) => [
      s.problem_id as string,
      { id: s.id as string, githubPath: s.github_path as string | null },
    ])
  );

  const newSolvedRows = matchedSlugs
    .filter((slug) => !existingByProblemId.has(problemBySlug.get(slug)!.id))
    .map((slug) => ({
      user_id: userId,
      problem_id: problemBySlug.get(slug)!.id,
      github_path: candidates.get(slug),
    }));

  if (newSolvedRows.length > 0) {
    const { error: solvedError } = await client.from("solved_problems").insert(newSolvedRows);
    if (solvedError) throw solvedError;
  }

  // A solve recorded before this repo was ever scanned (e.g. via a
  // LeetCode username import, which has no way to know a file path) sits
  // with `github_path` empty forever unless something fills it in later.
  // Now that the scan found the real file, attach it — but only where
  // nothing is set yet, so a prior sync's match or a manual correction in
  // the solution mapping table is never overwritten.
  let pathsFilled = 0;
  for (const slug of matchedSlugs) {
    const existing = existingByProblemId.get(problemBySlug.get(slug)!.id);
    if (!existing || existing.githubPath) continue;
    const { error: pathUpdateError } = await client
      .from("solved_problems")
      .update({ github_path: candidates.get(slug) })
      .eq("id", existing.id);
    if (pathUpdateError) throw pathUpdateError;
    pathsFilled++;
  }

  await markAlreadySolvedTargetsDone(client, userId, matchedSlugs);

  return { matched: matchedSlugs.length, newlySynced: newSolvedRows.length, pathsFilled };
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

export async function upsertProfileDetails(
  userId: string,
  details: { bio: string; displayName: string }
): Promise<void> {
  const { error } = await requireClient().from("profiles").upsert({
    user_id: userId,
    bio: details.bio,
    display_name: details.displayName,
    updated_at: new Date().toISOString(),
  });
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

/** Every signed-in user with at least one target or solve, ranked by solved
 * count — backed by the `leaderboard` view (migration
 * 0004_leaderboard.sql), which only ever exposes what each underlying
 * table's own RLS policies already allow. */
export async function listLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await requireClient()
    .from("leaderboard")
    .select("*")
    .order("solved_count", { ascending: false });
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    bio: row.bio ?? undefined,
    leetcodeUsername: row.leetcode_username ?? undefined,
    solvedCount: row.solved_count,
    targetCount: row.target_count,
    doneCount: row.done_count,
  }));
}

// --- topics ----------------------------------------------------------------

/** Every problem in this user's world — the ones they've solved, plus the
 * ones their targets point at — with whatever topic tags are on record.
 *
 * Targets can name a problem that has no `problems` row yet (a CSV upload
 * creates targets by slug without touching the catalogue), so those simply
 * contribute nothing to topic mastery until something enriches them. */
export async function listTopicProblems(userId: string): Promise<TopicProblem[]> {
  const client = requireClient();

  const { data: solvedRows, error: solvedError } = await client
    .from("solved_problems")
    .select("problem:problems(slug, tags)")
    .eq("user_id", userId)
    .returns<{ problem: { slug: string; tags: string[] | null } | null }[]>();
  if (solvedError) throw solvedError;

  const { data: targetRows, error: targetError } = await client
    .from("targets")
    .select("slug")
    .eq("user_id", userId)
    .not("slug", "is", null);
  if (targetError) throw targetError;

  const bySlug = new Map<string, TopicProblem>();
  for (const row of solvedRows ?? []) {
    if (!row.problem) continue;
    bySlug.set(row.problem.slug, {
      slug: row.problem.slug,
      topics: row.problem.tags ?? [],
      solved: true,
    });
  }

  const targetSlugs = [...new Set((targetRows ?? []).map((t) => t.slug as string))].filter(
    (slug) => !bySlug.has(slug)
  );
  if (targetSlugs.length > 0) {
    const { data: problemRows, error: problemError } = await client
      .from("problems")
      .select("slug, tags")
      .in("slug", targetSlugs);
    if (problemError) throw problemError;
    for (const row of problemRows ?? []) {
      bySlug.set(row.slug as string, {
        slug: row.slug as string,
        topics: (row.tags as string[] | null) ?? [],
        solved: false,
      });
    }
  }

  return [...bySlug.values()];
}

/** Populates `problems.tags` from LeetCode for problems in this user's set
 * that have none yet. `tags` ships empty for every row, so without this
 * topic mastery, focus areas and the roadmap have nothing to stand on.
 *
 * Bounded per call: enrichment is a nice-to-have that runs in the background,
 * and a 275-problem list shouldn't fire hundreds of requests on one page
 * load. Repeat visits pick up where the last one stopped. */
export async function enrichMissingTopics(
  userId: string,
  proxyUrl: string,
  maxPerRun = 25
): Promise<number> {
  const client = requireClient();
  const problems = await listTopicProblems(userId);
  const untagged = problems.filter((p) => p.topics.length === 0).slice(0, maxPerRun);
  if (untagged.length === 0) return 0;

  const proxyApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  let updated = 0;

  for (let i = 0; i < untagged.length; i += DIFFICULTY_FETCH_CONCURRENCY) {
    const batch = untagged.slice(i, i + DIFFICULTY_FETCH_CONCURRENCY);
    const metas = await Promise.all(
      batch.map((p) => fetchQuestionMeta(p.slug, { proxyUrl, proxyApiKey }))
    );

    for (let j = 0; j < batch.length; j++) {
      const meta = metas[j];
      if (meta.topics.length === 0) continue;
      // Difficulty rides along free, since the same request returned it.
      const { error } = await client
        .from("problems")
        .update({ tags: meta.topics, ...(meta.difficulty !== "Unknown" ? { difficulty: meta.difficulty } : {}) })
        .eq("slug", batch[j].slug);
      if (error) throw error;
      updated++;
    }
  }

  return updated;
}

// --- goals -----------------------------------------------------------------

/** Returns undefined when the user has never set goals — the dashboard reads
 * that absence as "onboarding hasn't happened", so it must not be papered
 * over with defaults here. */
export async function getUserGoals(userId: string): Promise<UserGoals | undefined> {
  const { data, error } = await requireClient()
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToGoals(data) : undefined;
}

export async function upsertUserGoals(
  userId: string,
  goals: Omit<UserGoals, "userId" | "onboardedAt"> & { markOnboarded?: boolean }
): Promise<void> {
  const { error } = await requireClient()
    .from("user_goals")
    .upsert({
      user_id: userId,
      daily_target: goals.dailyTarget,
      weekly_target: goals.weeklyTarget,
      focus: goals.focus ?? null,
      goal_total: goals.goalTotal ?? null,
      goal_deadline: goals.goalDeadline ?? null,
      ...(goals.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
      updated_at: new Date().toISOString(),
    });
  if (error) throw error;
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

/** Re-resolves difficulty for any of this user's solved problems still
 * stuck at "Unknown" — self-heals rows created before difficulty
 * enrichment existed on this import path (or ones a proxy hiccup left
 * unresolved at the time), instead of leaving the chart's gray bucket
 * permanently inflated for anyone who solved before this fix shipped.
 * Returns how many problem rows it actually resolved. */
export async function backfillUnknownDifficulties(userId: string, proxyUrl: string): Promise<number> {
  const client = requireClient();

  const { data, error } = await client
    .from("solved_problems")
    .select("problem:problems(slug, difficulty)")
    .eq("user_id", userId)
    .returns<{ problem: { slug: string; difficulty: string } | null }[]>();
  if (error) throw error;

  const unknownSlugs = [
    ...new Set(
      (data ?? [])
        .map((row) => row.problem)
        .filter((p): p is { slug: string; difficulty: string } => p?.difficulty === "Unknown")
        .map((p) => p.slug)
    ),
  ];
  if (unknownSlugs.length === 0) return 0;

  const proxyApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const difficultyBySlug = await fetchDifficultiesBatched(unknownSlugs, proxyUrl, proxyApiKey);

  let fixed = 0;
  for (const slug of unknownSlugs) {
    const difficulty = difficultyBySlug.get(slug);
    if (!difficulty || difficulty === "Unknown") continue;
    const { error: updateError } = await client.from("problems").update({ difficulty }).eq("slug", slug);
    if (updateError) throw updateError;
    fixed++;
  }
  return fixed;
}

/** Diagnostic-only. `fetchQuestionDifficulty` (and everything built on it)
 * deliberately fails soft to "Unknown" on any error, so a persistent
 * backfill failure is otherwise invisible — this makes one raw proxy call
 * for a slug ("two-sum") whose real difficulty is a known constant, so a
 * bad response (proxy rejects the "difficulty" op, wrong shape, network
 * error) can be told apart from a proxy that's genuinely working. Called
 * only when a backfill attempt fixed nothing despite unresolved solves. */
export async function checkDifficultyProxyHealth(proxyUrl: string): Promise<string | undefined> {
  const proxyApiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  try {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(proxyApiKey ? { apikey: proxyApiKey, Authorization: `Bearer ${proxyApiKey}` } : {}),
      },
      body: JSON.stringify({ op: "difficulty", slug: "two-sum" }),
    });
    if (!res.ok) {
      return `The leetcode-proxy edge function rejected a difficulty lookup (HTTP ${res.status}). It likely needs redeploying with the latest supabase/functions/leetcode-proxy/index.ts, which added the "difficulty" operation.`;
    }
    const json = (await res.json()) as { data?: { question?: { difficulty?: string } | null } };
    if (json.data?.question?.difficulty !== "Easy") {
      return "The leetcode-proxy edge function responded, but not with Two Sum's known difficulty — it's probably running outdated code. Try redeploying supabase/functions/leetcode-proxy.";
    }
    return undefined;
  } catch {
    return "Couldn't reach the leetcode-proxy edge function to check difficulty lookups.";
  }
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
function rowToGoals(row: any): UserGoals {
  return {
    userId: row.user_id,
    dailyTarget: row.daily_target,
    weeklyTarget: row.weekly_target,
    focus: row.focus ?? undefined,
    goalTotal: row.goal_total ?? undefined,
    goalDeadline: row.goal_deadline ?? undefined,
    onboardedAt: row.onboarded_at ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(row: any): Profile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? undefined,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
  };
}
