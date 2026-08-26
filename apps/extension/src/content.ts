import { SOLVED_EVENT_NAME, type SolvedMessage, type SolvedSubmission } from "./lib/messaging.js";

/**
 * Isolated-world content script — this is the one with access to
 * `chrome.runtime`. It just relays the CustomEvent dispatched by
 * `inject.ts` (which runs in the page's MAIN world and can't call
 * `chrome.runtime` directly) on to the background service worker.
 */
window.addEventListener(SOLVED_EVENT_NAME, (event) => {
  const detail = (event as CustomEvent<SolvedSubmission>).detail;
  const message: SolvedMessage = { type: "leettarget:solved", payload: detail };
  chrome.runtime.sendMessage(message).catch(() => {
    // Background worker may be asleep on the very first event; it wakes on
    // message delivery, so a failed first send is rare and non-fatal.
  });
});
