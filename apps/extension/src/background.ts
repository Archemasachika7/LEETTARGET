import {
  DEFAULT_PATH_TEMPLATE,
  GithubClient,
  buildSolutionPath,
  fetchQuestionDifficulty,
} from "@leettarget/shared";
import { isSolvedMessage, type SolvedSubmission } from "./lib/messaging.js";
import { getConfig, type ExtensionConfig } from "./lib/storage.js";
import { isTokenStale, refreshSupabaseToken } from "./lib/supabaseAuth.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isSolvedMessage(message)) return;

  handleSolved(message.payload)
    .then(() => sendResponse({ ok: true }))
    .catch((err) => {
      console.error("[Waypoint] failed to handle solve:", err);
      sendResponse({ ok: false, error: String(err) });
    });

  return true; // keep the message channel open for the async response
});

async function handleSolved(submission: SolvedSubmission): Promise<void> {
  const config = await getConfig();

  const difficulty = await fetchQuestionDifficulty(submission.slug);

  // Commit to GitHub first, independent of whether Supabase sync is
  // configured or succeeds — Waypoint should never be a worse LeetHub.
  let githubPath: string | undefined;
  let commitSha: string | undefined;

  if (config.githubToken && config.githubOwner && config.githubRepo) {
    const client = new GithubClient(config.githubToken);
    const path = buildSolutionPath(
      config.pathTemplate || DEFAULT_PATH_TEMPLATE,
      { slug: submission.slug, difficulty },
      submission.language
    );

    const result = await client.upsertFile(
      { owner: config.githubOwner, repo: config.githubRepo, branch: config.githubBranch },
      path,
      submission.code,
      `Waypoint: solve ${submission.title}`
    );
    githubPath = path;
    commitSha = result.commitSha;
  } else {
    console.warn("[Waypoint] GitHub repo not configured — open the extension options.");
  }

  await syncToSupabase(config, submission, difficulty, githubPath, commitSha).catch((err) => {
    console.warn("[Waypoint] Supabase sync failed (solution was still committed to GitHub):", err);
  });
}

async function syncToSupabase(
  config: ExtensionConfig,
  submission: SolvedSubmission,
  difficulty: string,
  githubPath: string | undefined,
  commitSha: string | undefined
): Promise<void> {
  const { supabaseUrl, supabaseAnonKey, supabaseAccessToken, leetTargetUserId } = config;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseAccessToken || !leetTargetUserId) {
    return; // Supabase sync is optional — the GitHub commit already happened.
  }

  // Refresh proactively when we know we're close to expiry, so the first
  // real request of this sync doesn't waste a round trip failing first.
  if (isTokenStale(config) && config.supabaseRefreshToken) {
    config = await refreshSupabaseToken(config);
  }

  const client = new SupabaseSyncClient(config);

  // 1. Upsert the canonical problem row by slug.
  const problemRes = await client.fetch("/rest/v1/problems?on_conflict=slug", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify([
      {
        slug: submission.slug,
        title: submission.title,
        url: `https://leetcode.com/problems/${submission.slug}/`,
        difficulty,
      },
    ]),
  });
  if (!problemRes.ok) throw new Error(`problems upsert failed: ${problemRes.status}`);
  const [problem] = (await problemRes.json()) as { id: string }[];

  // 2. Record the solve.
  const solvedRes = await client.fetch("/rest/v1/solved_problems?on_conflict=user_id,problem_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify([
      {
        user_id: leetTargetUserId,
        problem_id: problem.id,
        language: submission.language,
        github_path: githubPath,
        commit_sha: commitSha,
        solved_at: new Date(submission.timestamp).toISOString(),
      },
    ]),
  });
  if (!solvedRes.ok) throw new Error(`solved_problems insert failed: ${solvedRes.status}`);

  // 3. Mark any matching target as done.
  const targetRes = await client.fetch(
    `/rest/v1/targets?user_id=eq.${leetTargetUserId}&slug=eq.${submission.slug}`,
    { method: "PATCH", body: JSON.stringify({ status: "done" }) }
  );
  if (!targetRes.ok) throw new Error(`targets update failed: ${targetRes.status}`);
}

/** Wraps `fetch` against a Supabase project with the current access token,
 * and — the reactive half of token freshness, alongside the proactive
 * check in `syncToSupabase` — refreshes once and retries on a 401 rather
 * than failing the whole sync over an expired token. */
class SupabaseSyncClient {
  constructor(private config: ExtensionConfig) {}

  async fetch(path: string, init: RequestInit = {}, isRetry = false): Promise<Response> {
    const res = await fetch(`${this.config.supabaseUrl}${path}`, {
      ...init,
      headers: {
        apikey: this.config.supabaseAnonKey!,
        Authorization: `Bearer ${this.config.supabaseAccessToken}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    if (res.status === 401 && !isRetry && this.config.supabaseRefreshToken) {
      this.config = await refreshSupabaseToken(this.config);
      return this.fetch(path, init, true);
    }

    return res;
  }
}
