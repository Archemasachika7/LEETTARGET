import type { Problem } from "./types.js";

/** LeetCode's public (unofficial) GraphQL endpoint. Free, no auth required
 * for public profile data, but undocumented and can change — callers
 * should fail soft. Browsers can't hit this directly (CORS), so the web
 * app goes through `supabase/functions/leetcode-proxy` instead of this
 * URL directly; the proxy re-exports the same shape this module returns. */
export const LEETCODE_GRAPHQL_ENDPOINT = "https://leetcode.com/graphql";

export interface LeetCodeSolvedSummary {
  username: string;
  totalSolved: number;
  totalQuestions: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
}

export interface LeetCodeRecentSubmission {
  title: string;
  slug: string;
  timestamp: number;
  statusDisplay: string;
  lang: string;
}

const PROFILE_QUERY = `
query userProblemsSolved($username: String!) {
  matchedUser(username: $username) {
    username
    submitStats {
      acSubmissionNum {
        difficulty
        count
      }
    }
  }
  allQuestionsCount {
    difficulty
    count
  }
}`;

const QUESTION_DIFFICULTY_QUERY = `
query questionDifficulty($titleSlug: String!) {
  question(titleSlug: $titleSlug) {
    difficulty
  }
}`;

const RECENT_SUBMISSIONS_QUERY = `
query recentAcSubmissions($username: String!, $limit: Int!) {
  recentAcSubmissionList(username: $username, limit: $limit) {
    title
    titleSlug
    timestamp
    statusDisplay
    lang
  }
}`;

export interface LeetCodeClientOptions {
  /** Defaults to the real LeetCode endpoint. Pass your proxy's URL when
   * calling from a browser. */
  endpoint?: string;
  fetchImpl?: typeof fetch;
}

async function graphql<T>(
  query: string,
  variables: Record<string, unknown>,
  options: LeetCodeClientOptions = {}
): Promise<T> {
  const { endpoint = LEETCODE_GRAPHQL_ENDPOINT, fetchImpl = fetch } = options;

  const res = await fetchImpl(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`LeetCode API request failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) {
    throw new Error(`LeetCode API error: ${json.errors[0].message}`);
  }
  if (!json.data) {
    throw new Error("LeetCode API returned no data.");
  }
  return json.data;
}

function countByDifficulty(
  list: { difficulty: string; count: number }[],
  difficulty: string
): number {
  return list.find((entry) => entry.difficulty === difficulty)?.count ?? 0;
}

/** Fetches solved-problem counts for a public LeetCode username. */
export async function fetchSolvedSummary(
  username: string,
  options?: LeetCodeClientOptions
): Promise<LeetCodeSolvedSummary> {
  const data = await graphql<{
    matchedUser: {
      username: string;
      submitStats: { acSubmissionNum: { difficulty: string; count: number }[] };
    } | null;
    allQuestionsCount: { difficulty: string; count: number }[];
  }>(PROFILE_QUERY, { username }, options);

  if (!data.matchedUser) {
    throw new Error(`No public LeetCode profile found for "${username}".`);
  }

  const ac = data.matchedUser.submitStats.acSubmissionNum;
  return {
    username: data.matchedUser.username,
    totalSolved: countByDifficulty(ac, "All"),
    totalQuestions: countByDifficulty(data.allQuestionsCount, "All"),
    easySolved: countByDifficulty(ac, "Easy"),
    mediumSolved: countByDifficulty(ac, "Medium"),
    hardSolved: countByDifficulty(ac, "Hard"),
  };
}

/** Looks up a single problem's difficulty by slug — used by the extension
 * to fill in the `{difficulty}` path segment when committing a solution,
 * since the submission event itself doesn't carry it. Falls back to
 * "Unknown" rather than throwing, since this is a nice-to-have for the
 * commit path, not a blocker. */
export async function fetchQuestionDifficulty(
  slug: string,
  options?: LeetCodeClientOptions
): Promise<Problem["difficulty"]> {
  try {
    const data = await graphql<{ question: { difficulty: string } | null }>(
      QUESTION_DIFFICULTY_QUERY,
      { titleSlug: slug },
      options
    );
    const difficulty = data.question?.difficulty;
    if (difficulty === "Easy" || difficulty === "Medium" || difficulty === "Hard") {
      return difficulty;
    }
    return "Unknown";
  } catch {
    return "Unknown";
  }
}

/** Fetches the most recent accepted submissions for a public username —
 * used to backfill `solved_problems` for solves that predate installing
 * the extension. */
export async function fetchRecentAcSubmissions(
  username: string,
  limit = 20,
  options?: LeetCodeClientOptions
): Promise<LeetCodeRecentSubmission[]> {
  const data = await graphql<{
    recentAcSubmissionList: {
      title: string;
      titleSlug: string;
      timestamp: string;
      statusDisplay: string;
      lang: string;
    }[];
  }>(RECENT_SUBMISSIONS_QUERY, { username, limit }, options);

  return data.recentAcSubmissionList.map((entry) => ({
    title: entry.title,
    slug: entry.titleSlug,
    timestamp: Number(entry.timestamp),
    statusDisplay: entry.statusDisplay,
    lang: entry.lang,
  }));
}
