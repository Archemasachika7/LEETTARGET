// Deno edge function, invoked on a schedule by pg_cron (see
// supabase/README.md for the `cron.schedule` SQL — 9pm IST daily). Imports
// every enrolled user's recent LeetCode solves server-side, the same way
// the site's manual "Import from LeetCode" button does (see
// apps/web/src/lib/api.ts's importFromLeetCode), so users who set that up
// once don't have to keep clicking it.
//
// Self-contained rather than importing packages/shared/src/leetcode.ts —
// same reason as leetcode-proxy: that file's imports use the bundler-
// resolution ".js" suffix convention, which Deno resolves literally and
// would 404 at deploy time.
//
// Runs with the service role key (auto-injected by Supabase into every
// edge function's env — never configured or stored by this repo), which
// legitimately bypasses each user's RLS here: this is a trusted server
// context iterating known user_ids from `leetcode_profiles`, not a
// user-facing query path.

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

const RECENT_QUERY = `
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title titleSlug timestamp lang
  }
}`;

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

Deno.serve(async (req) => {
  // Supabase's function gateway only requires a valid anon-key-signed JWT
  // by default — and the anon key is public by design. Without this extra
  // check, anyone holding it could trigger a batch import (privileged
  // writes fanned out across every enrolled user, plus repeated hammering
  // of LeetCode's API) on demand, not just the scheduled job. Set via
  // `supabase secrets set CRON_SECRET=<random>` and pass the same value as
  // an `x-cron-secret` header in the pg_cron net.http_post call — see
  // supabase/README.md.
  const expectedSecret = Deno.env.get("CRON_SECRET");
  if (expectedSecret && req.headers.get("x-cron-secret") !== expectedSecret) {
    return json({ error: "Unauthorized." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };

  const profilesRes = await fetch(`${supabaseUrl}/rest/v1/leetcode_profiles?select=user_id,username`, {
    headers,
  });
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

  return json({ processed: outcomes.length, outcomes }, 200);
});

async function importOne(
  supabaseUrl: string,
  headers: Record<string, string>,
  profile: LeetCodeProfile
): Promise<number> {
  const recent = await fetchRecentSubmissions(profile.username);
  if (recent.length === 0) return 0;

  const problemRes = await fetch(`${supabaseUrl}/rest/v1/problems?on_conflict=slug`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(
      recent.map((r) => ({
        slug: r.titleSlug,
        title: r.title,
        url: `https://leetcode.com/problems/${r.titleSlug}/`,
        difficulty: "Unknown",
      }))
    ),
  });
  if (!problemRes.ok) throw new Error(`problems upsert failed: ${problemRes.status}`);
  const problems = (await problemRes.json()) as { id: string; slug: string }[];
  const problemIdBySlug = new Map(problems.map((p) => [p.slug, p.id]));

  const solvedRows = recent
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

  const slugList = recent.map((r) => r.titleSlug).join(",");
  const targetRes = await fetch(
    `${supabaseUrl}/rest/v1/targets?user_id=eq.${profile.user_id}&slug=in.(${slugList})`,
    { method: "PATCH", headers, body: JSON.stringify({ status: "done" }) }
  );
  if (!targetRes.ok) throw new Error(`targets update failed: ${targetRes.status}`);

  return recent.length;
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
    headers: { "Content-Type": "application/json" },
  });
}
