import { groqChat, groqEnabled } from "../groq.js";

/** Kimi K2 on Groq's free tier. Groq periodically moves models between its
 * free and enterprise-only tiers without much notice (Llama 3.1/3.3 both
 * moved to Contact-Sales-only in Aug 2026) — check console.groq.com/docs/models
 * before assuming this is still current. */
const MODEL = "moonshotai/kimi-k2-instruct";

export const assistantEnabled = groqEnabled;

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PREAMBLE = [
  "You are the LeetTarget assistant, embedded in a practice tracker for LeetCode, GATE and CAT prep.",
  "Answer only from the DATA block below — never invent a solve, a streak, a score, or a topic that isn't in it.",
  "If something isn't in the data (accuracy, solve time, attempt counts — LeetTarget doesn't track those), say so plainly instead of guessing.",
  "Write like a person: short sentences, direct, no corporate positivity, no emoji, no 'unlock your potential' filler.",
].join(" ");

/** One-shot Q&A over the reader's own progress data. Returns null on a
 * missing key or any failure — the widget falls back to a plain notice
 * rather than surfacing an error for what is an optional feature. */
export async function askAssistant(history: ChatTurn[], dataSummary: string): Promise<string | null> {
  const messages = [
    { role: "system" as const, content: `${SYSTEM_PREAMBLE}\n\nDATA:\n${dataSummary}` },
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
  ];
  return groqChat(messages, { model: MODEL, temperature: 0.3, maxTokens: 500 });
}
