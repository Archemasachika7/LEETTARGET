import { groqChat, groqEnabled, type GroqMessage } from "./groq.js";
import { geminiChat, geminiEnabled } from "./gemini.js";

export type LlmMessage = GroqMessage;

export function llmEnabled(): boolean {
  return groqEnabled() || geminiEnabled();
}

export interface LlmModelChoice {
  /** Groq model ID — tried first. Groq is faster and is the key most people
   * set up initially, but it periodically moves models off its free tier
   * without much notice (see the Aug 2026 Llama/Gemma move). */
  groqModel: string;
  /** Gemini model ID — used only if the Groq call comes back empty (no key,
   * rate-limited, or a model Groq no longer allows on a free key). */
  geminiModel: string;
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
export async function askLlm(messages: LlmMessage[], choice: LlmModelChoice): Promise<string | null> {
  const groqResult = await groqChat(messages, {
    model: choice.groqModel,
    temperature: choice.temperature,
    maxTokens: choice.maxTokens,
    timeoutMs: choice.timeoutMs,
  });
  if (groqResult) return groqResult;

  return geminiChat(messages, {
    model: choice.geminiModel,
    temperature: choice.temperature,
    maxOutputTokens: choice.maxTokens,
    timeoutMs: choice.timeoutMs,
  });
}
