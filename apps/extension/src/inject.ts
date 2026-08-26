import { SOLVED_EVENT_NAME, type SolvedSubmission } from "./lib/messaging.js";

/**
 * Runs in the page's MAIN world (not the isolated content-script world) so
 * it can see the page's own `fetch` calls. LeetCode's submit flow is two
 * requests: POST /problems/{slug}/submit/ (body has the code + language),
 * then the page polls GET /submissions/detail/{id}/check/ until the result
 * comes back. Neither request alone has everything we need, so this stores
 * the submit payload keyed by submission id and joins it with the later
 * "Accepted" check response. This mirrors how LeetHub detects solves, since
 * LeetCode has no public "you just solved this" event to subscribe to.
 */

interface PendingSubmission {
  code: string;
  language: string;
}

const pending = new Map<number, PendingSubmission>();

const SUBMIT_URL = /\/problems\/([a-z0-9-]+)\/submit\/?$/;
const CHECK_URL = /\/submissions\/detail\/(\d+)\/check\/?$/;

const originalFetch = window.fetch;

window.fetch = async function patchedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const response = await originalFetch(input, init);
  const url = typeof input === "string" ? input : input.toString();

  try {
    if (init?.method === "POST" && SUBMIT_URL.test(url) && init.body) {
      const body = JSON.parse(init.body.toString());
      response
        .clone()
        .json()
        .then((json: { submission_id?: number }) => {
          if (typeof json.submission_id === "number") {
            pending.set(json.submission_id, {
              code: body.typed_code ?? "",
              language: body.lang ?? "unknown",
            });
          }
        })
        .catch(() => {});
    }

    const checkMatch = url.match(CHECK_URL);
    if (checkMatch) {
      const submissionId = Number(checkMatch[1]);
      response
        .clone()
        .json()
        .then((json: { state?: string; status_msg?: string }) => {
          if (json.state === "SUCCESS" && json.status_msg === "Accepted") {
            const submission = pending.get(submissionId);
            if (submission) {
              pending.delete(submissionId);
              emitSolved(submission);
            }
          }
        })
        .catch(() => {});
    }
  } catch {
    // Best-effort instrumentation — never let a parsing failure break the
    // user's actual submission flow.
  }

  return response;
};

function emitSolved(submission: PendingSubmission) {
  const slugMatch = location.pathname.match(/\/problems\/([a-z0-9-]+)/);
  const slug = slugMatch?.[1] ?? "";
  const title = document.title.replace(/\s*-\s*LeetCode\s*$/i, "").trim();

  const detail: SolvedSubmission = {
    slug,
    title: title || slug,
    language: submission.language,
    code: submission.code,
    timestamp: Date.now(),
  };

  window.dispatchEvent(new CustomEvent(SOLVED_EVENT_NAME, { detail }));
}
