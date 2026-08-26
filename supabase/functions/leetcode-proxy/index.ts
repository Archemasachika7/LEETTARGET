// Deno edge function. Browsers can't call https://leetcode.com/graphql
// directly (LeetCode doesn't send CORS headers for arbitrary origins), so
// the web app calls this instead. Kept self-contained rather than
// importing packages/shared/src/leetcode.ts: that file's imports use the
// bundler-resolution ".js" suffix convention (for apps/web and
// apps/extension's bundlers), which Deno resolves literally and would 404
// at deploy time — not worth fighting for one small proxy.

const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUMMARY_QUERY = `
query userProblemsSolved($username: String!) {
  matchedUser(username: $username) {
    username
    submitStats {
      acSubmissionNum { difficulty count }
    }
  }
  allQuestionsCount { difficulty count }
}`;

const RECENT_QUERY = `
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title titleSlug timestamp statusDisplay lang
  }
}`;

const DIFFICULTY_QUERY = `
query questionDifficulty($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    difficulty
  }
}`;

interface ProxyRequest {
  op: "summary" | "recent" | "difficulty";
  username?: string;
  limit?: number;
  slug?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }

  let body: ProxyRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  let query: string;
  let variables: Record<string, unknown>;

  if (body.op === "summary" || body.op === "recent") {
    if (!body.username) {
      return json({ error: 'Expected { op: "summary" | "recent", username: string }.' }, 400);
    }
    query = body.op === "summary" ? SUMMARY_QUERY : RECENT_QUERY;
    variables = body.op === "summary" ? { username: body.username } : { username: body.username, limit: body.limit ?? 20 };
  } else if (body.op === "difficulty") {
    if (!body.slug) {
      return json({ error: 'Expected { op: "difficulty", slug: string }.' }, 400);
    }
    query = DIFFICULTY_QUERY;
    variables = { titleSlug: body.slug };
  } else {
    return json({ error: 'Expected op to be "summary", "recent", or "difficulty".' }, 400);
  }

  try {
    const upstream = await fetch(LEETCODE_GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });

    if (!upstream.ok) {
      return json({ error: `LeetCode API responded ${upstream.status}` }, 502);
    }

    const data = await upstream.json();
    return json(data, 200);
  } catch (err) {
    return json({ error: `Proxy request failed: ${err}` }, 502);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
