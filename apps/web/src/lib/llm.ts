import { groqChat, groqEnabled, type GroqMessage } from "./groq.js";
import { geminiChat, geminiEnabled } from "./gemini.js";

export type LlmMessage = GroqMessage;

/**
 * Both providers move model IDs around without much notice — Groq shifted
 * several models to Enterprise-only in Aug 2026, and Google retired
 * gemini-2.0-flash for new keys in Jun 2026, both breaking this app in
 * production. qwen/qwen3.8-27b was confirmed live against a real
 * account's GET /openai/v1/models response — not documentation, not a
 * blog post, an actual API key's actual model list — after two earlier
 * guesses (moonshotai/kimi-k2-instruct, then its -0905 variant) both
 * 404'd despite being repeated across several sources as "currently
 * free". Defined once here rather than per call site, since the fix for
 * the next rename is the same one-line edit wherever it's used. If this
 * breaks again, don't guess — hit GET /openai/v1/models with a real key
 * and read the actual list back.
 */
export const DEFAULT_GROQ_MODEL = "qwen/qwen3.8-27b";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function llmEnabled(): boolean {
  return groqEnabled() || geminiEnabled();
}

export interface LlmModelChoice {
  /** Groq model ID — tried first. Groq is faster and is the key most people
   * set up initially. Defaults to DEFAULT_GROQ_MODEL; override only if a
   * particular call site genuinely needs a different model. */
  groqModel?: string;
  /** Gemini model ID — used only if the Groq call comes back empty (no key,
   * rate-limited, or a model Groq no longer allows on a free key). Defaults
   * to DEFAULT_GEMINI_MODEL. */
  geminiModel?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

/**
 * Tries Groq, then falls back to Gemini if that returns nothing. Returns
 * null only when neither provider has a key configured, or both fail —
 * callers treat that as the normal "no answer available" case, not an
 * error to surface.
 */
export async function askLlm(messages: LlmMessage[], choice: LlmModelChoice = {}): Promise<string | null> {
  const groqResult = await groqChat(messages, {
    model: choice.groqModel ?? DEFAULT_GROQ_MODEL,
    temperature: choice.temperature,
    maxTokens: choice.maxTokens,
    timeoutMs: choice.timeoutMs,
  });
  if (groqResult) return groqResult;

  return geminiChat(messages, {
    model: choice.geminiModel ?? DEFAULT_GEMINI_MODEL,
    temperature: choice.temperature,
    maxOutputTokens: choice.maxTokens,
    timeoutMs: choice.timeoutMs,
  });
}
