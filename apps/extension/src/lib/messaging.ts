/** Message shapes passed between the MAIN-world injected script, the
 * isolated-world content script, and the background service worker. */

export interface SolvedSubmission {
  slug: string;
  title: string;
  language: string;
  code: string;
  timestamp: number;
}

export const SOLVED_EVENT_NAME = "leettarget:solved";

export interface SolvedMessage {
  type: "leettarget:solved";
  payload: SolvedSubmission;
}

export function isSolvedMessage(msg: unknown): msg is SolvedMessage {
  return (
    typeof msg === "object" &&
    msg !== null &&
    (msg as { type?: unknown }).type === "leettarget:solved"
  );
}
