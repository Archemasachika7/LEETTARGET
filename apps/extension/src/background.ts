import {
  DEFAULT_PATH_TEMPLATE,
  GithubClient,
  buildSolutionPath,
  fetchQuestionDifficulty,
} from "@leettarget/shared";
import { isSolvedMessage, type SolvedSubmission } from "./lib/messaging.js";
import { getConfig } from "./lib/storage.js";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isSolvedMessage(message)) return;

  handleSolved(message.payload)
    .then(() => sendResponse({ ok: true }))
    .catch((err) => {
      console.error("[LeetTarget] failed to handle solve:", err);
      sendResponse({ ok: false, error: String(err) });
    });

  return true; // keep the message channel open for the async response
});

async function handleSolved(submission: SolvedSubmission): Promise<void> {
  const config = await getConfig();

  const difficulty = await fetchQuestionDifficulty(submission.slug);

  // Commit to GitHub first, independent of whether Supabase sync is
  // configured or succeeds — LeetTarget should never be a worse LeetHub.
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
      `LeetTarget: solve ${submission.title}`
    );
    githubPath = path;
    commitSha = result.commitSha;
  } else {
    console.warn("[LeetTarget] GitHub repo not configured — open the extension options.");
  }

  await syncToSupabase(config, submission, difficulty, githubPath, commitSha).catch((err) => {
    console.warn("[LeetTarget] Supabase sync failed (solution was still committed to GitHub):", err);
  });
}

async function syncToSupabase(
  config: Awaited<ReturnType<typeof getConfig>>,
  submission: SolvedSubmission,
  difficulty: string,
  githubPath: string | undefined,
  commitSha: string | undefined
): Promise<void> {
  const { supabaseUrl, supabaseAnonKey, supabaseAccessToken, leetTargetUserId } = config;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseAccessToken || !leetTargetUserId) {
    return; // Supabase sync is optional — the GitHub commit already happened.
  }

  const headers = {
    apikey: supabaseAnonKey,
    Authorization: `Bearer ${supabaseAccessToken}`,
    "Content-Type": "application/json",
  };

  // 1. Upsert the canonical problem row by slug.
  const problemRes = await fetch(`${supabaseUrl}/rest/v1/problems?on_conflict=slug`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
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
  const solvedRes = await fetch(
    `${supabaseUrl}/rest/v1/solved_problems?on_conflict=user_id,problem_id`,
    {
      method: "POST",
      headers: { ...headers, Prefer: "resolution=merge-duplicates" },
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
    }
  );
  if (!solvedRes.ok) throw new Error(`solved_problems insert failed: ${solvedRes.status}`);

  // 3. Mark any matching target as done.
  const targetRes = await fetch(
    `${supabaseUrl}/rest/v1/targets?user_id=eq.${leetTargetUserId}&slug=eq.${submission.slug}`,
    {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "done" }),
    }
  );
  if (!targetRes.ok) throw new Error(`targets update failed: ${targetRes.status}`);
}
