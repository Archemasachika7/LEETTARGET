// Deno edge function behind the Leaderboard's public "Sync everyone"
// button — the same per-profile import as daily-import, but callable
// on-demand by any signed-in user rather than only by the scheduled
// pg_cron job.
//
// Deliberately NOT behind CRON_SECRET the way daily-import is: this one is
// meant to be reachable from the browser with just the public anon key.
// The thing standing in for "don't let this get hammered" instead is a
// cooldown against the `sync_state` singleton row (see
// supabase/migrations/0011_sync_state.sql) — a burst of clicks from many
// users within the cooldown window all get back the same cached result
// instead of each kicking off a fresh full import.
//
// Self-contained rather than importing packages/shared/src/leetcode.ts or
// sharing code with daily-import — same reason as both of those: this
// file's imports use the bundler-resolution ".js" suffix convention, which
// Deno resolves literally and would 404 at deploy time.
//
// Runs with the service role key (auto-injected by Supabase into every
// edge function's env — never configured or stored by this repo), which
// legitimately bypasses each user's RLS here: this is a trusted server
// context iterating known user_ids from `leetcode_profiles` and writing
// the shared `sync_state` row, not a user-facing query path.

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";
const COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

// Called straight from the browser (that's the whole point of this
// function, unlike daily-import), so it needs the same CORS handling as
// leetcode-proxy: without it the browser's preflight OPTIONS request gets
// no Access-Control-Allow-* headers back, and the real POST never even
// reaches this code — it just shows up client-side as "Failed to fetch".
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RECENT_QUERY = `
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title titleSlug timestamp lang
  }
}`;

const DIFFICULTY_QUERY = `
query questionDifficulty($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    difficulty
  }
}`;

const DIFFICULTY_FETCH_CONCURRENCY = 5;

interface RecentSubmission {
  title: string;
  titleSlug: string;
  timestamp: string;
  lang: string;
}

interface LeetCodeProfile {
  user_id: string;
  username: string;
}

interface ImportOutcome {
  username: string;
  imported?: number;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  const stateRes = await fetch(`${supabaseUrl}/rest/v1/sync_state?select=last_synced_at,last_summary&id=eq.true`, {
    headers,
  });
  if (!stateRes.ok) {
    return json({ error: `Failed to read sync_state: ${stateRes.status}` }, 502);
  }
  const [state] = (await stateRes.json()) as { last_synced_at: string | null; last_summary: string | null }[];
  const lastSyncedAt = state?.last_synced_at ?? null;

  if (lastSyncedAt && Date.now() - new Date(lastSyncedAt).getTime() < COOLDOWN_MS) {
    return json(
      {
        skipped: true,
        reason: "cooldown",
        lastSyncedAt,
        nextAvailableAt: new Date(new Date(lastSyncedAt).getTime() + COOLDOWN_MS).toISOString(),
        lastSummary: state?.last_summary ?? undefined,
      },
      200
    );
  }

  const profilesRes = await fetch(`${supabaseUrl}/rest/v1/leetcode_profiles?select=user_id,username`, { headers });
  if (!profilesRes.ok) {
    return json({ error: `Failed to list leetcode_profiles: ${profilesRes.status}` }, 502);
  }
  const profiles = (await profilesRes.json()) as LeetCodeProfile[];

  const outcomes: ImportOutcome[] = [];
  for (const profile of profiles) {
    try {
      const imported = await importOne(supabaseUrl, headers, profile);
      outcomes.push({ username: profile.username, imported });
    } catch (err) {
      // One broken/renamed username shouldn't block everyone else's import.
      outcomes.push({ username: profile.username, error: String(err) });
    }
  }

  const totalImported = outcomes.reduce((sum, o) => sum + (o.imported ?? 0), 0);
  const now = new Date().toISOString();
  const summary = `${profiles.length} profile${profiles.length === 1 ? "" : "s"} checked, ${totalImported} solve${totalImported === 1 ? "" : "s"} synced`;

  const writeRes = await fetch(`${supabaseUrl}/rest/v1/sync_state?id=eq.true`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ last_synced_at: now, last_summary: summary }),
  });
  if (!writeRes.ok) {
    // The import itself already succeeded — don't fail the whole response
    // over the cooldown bookkeeping, just surface it so it's not silent.
    outcomes.push({ username: "(sync_state)", error: `Failed to record sync_state: ${writeRes.status}` });
  }

  return json({ skipped: false, processed: outcomes.length, outcomes, lastSyncedAt: now, lastSummary: summary }, 200);
});

async function importOne(
  supabaseUrl: string,
  headers: Record<string, string>,
  profile: LeetCodeProfile
): Promise<number> {
  const recent = await fetchRecentSubmissions(profile.username);
  if (recent.length === 0) return 0;

  // LeetCode's recent-submissions list can name the same problem twice
  // (resubmitted, or solved in more than one language), and a single
  // upsert batch can't target the same on_conflict row twice — Postgres
  // rejects the whole statement with "ON CONFLICT DO UPDATE command
  // cannot affect row a second time". Keep the first (most recent, since
  // the API returns newest-first) occurrence per slug.
  const uniqueBySlug = new Map<string, RecentSubmission>();
  for (const r of recent) {
    if (!uniqueBySlug.has(r.titleSlug)) uniqueBySlug.set(r.titleSlug, r);
  }
  const uniqueRecent = [...uniqueBySlug.values()];
  const difficultyBySlug = await fetchDifficultiesBatched(uniqueRecent.map((r) => r.titleSlug));

  const problemRes = await fetch(`${supabaseUrl}/rest/v1/problems?on_conflict=slug`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(
      uniqueRecent.map((r) => ({
        slug: r.titleSlug,
        title: r.title,
        url: `https://leetcode.com/problems/${r.titleSlug}/`,
        difficulty: difficultyBySlug.get(r.titleSlug) ?? "Unknown",
      }))
    ),
  });
  if (!problemRes.ok) throw new Error(`problems upsert failed: ${problemRes.status}`);
  const problems = (await problemRes.json()) as { id: string; slug: string }[];
  const problemIdBySlug = new Map(problems.map((p) => [p.slug, p.id]));

  const solvedRows = uniqueRecent
    .filter((r) => problemIdBySlug.has(r.titleSlug))
    .map((r) => ({
      user_id: profile.user_id,
      problem_id: problemIdBySlug.get(r.titleSlug),
      language: r.lang,
      solved_at: new Date(Number(r.timestamp) * 1000).toISOString(),
    }));

  const solvedRes = await fetch(`${supabaseUrl}/rest/v1/solved_problems?on_conflict=user_id,problem_id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(solvedRows),
  });
  if (!solvedRes.ok) throw new Error(`solved_problems upsert failed: ${solvedRes.status}`);

  const slugList = uniqueRecent.map((r) => r.titleSlug).join(",");
  const targetRes = await fetch(
    `${supabaseUrl}/rest/v1/targets?user_id=eq.${profile.user_id}&slug=in.(${slugList})`,
    { method: "PATCH", headers, body: JSON.stringify({ status: "done" }) }
  );
  if (!targetRes.ok) throw new Error(`targets update failed: ${targetRes.status}`);

  return uniqueRecent.length;
}

/** Fetches difficulty for each slug a few at a time — out of courtesy to
 * LeetCode's API, not because this server-side path has a CORS or
 * per-browser rate concern. Never throws; an unresolvable slug just stays
 * "Unknown" (see `fetchQuestionDifficulty`). */
async function fetchDifficultiesBatched(slugs: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  for (let i = 0; i < slugs.length; i += DIFFICULTY_FETCH_CONCURRENCY) {
    const batch = slugs.slice(i, i + DIFFICULTY_FETCH_CONCURRENCY);
    const difficulties = await Promise.all(batch.map(fetchQuestionDifficulty));
    batch.forEach((slug, idx) => result.set(slug, difficulties[idx]));
  }
  return result;
}

async function fetchQuestionDifficulty(slug: string): Promise<string> {
  try {
    const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: DIFFICULTY_QUERY, variables: { titleSlug: slug } }),
    });
    if (!res.ok) return "Unknown";
    const payload = (await res.json()) as { data?: { question: { difficulty: string } | null } };
    const difficulty = payload.data?.question?.difficulty;
    return difficulty === "Easy" || difficulty === "Medium" || difficulty === "Hard" ? difficulty : "Unknown";
  } catch {
    return "Unknown";
  }
}

async function fetchRecentSubmissions(username: string): Promise<RecentSubmission[]> {
  const res = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: RECENT_QUERY, variables: { username, limit: 100 } }),
  });
  if (!res.ok) throw new Error(`LeetCode API request failed: ${res.status}`);

  const payload = (await res.json()) as {
    data?: { recentAcSubmissionList: RecentSubmission[] };
    errors?: { message: string }[];
  };
  if (payload.errors?.length) throw new Error(`LeetCode API error: ${payload.errors[0].message}`);
  return payload.data?.recentAcSubmissionList ?? [];
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
