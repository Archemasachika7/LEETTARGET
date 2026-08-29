const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function groqApiKey(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const key = env?.VITE_GROQ_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function groqEnabled(): boolean {
  return Boolean(groqApiKey());
}

/**
 * Thin wrapper over Groq's free-tier chat completions endpoint. Returns null
 * on a missing key, a non-2xx response, a timeout, or any network failure —
 * callers treat "no answer" as the normal unconfigured/offline case, not an
 * error to surface.
 *
 * NOTE: calling Groq from the browser exposes the key to anyone who opens
 * devtools. Fine for a personal project; move this behind a Supabase edge
 * function before real users touch it.
 */
export async function groqChat(
  messages: GroqMessage[],
  options: { model: string; temperature?: number; maxTokens?: number; timeoutMs?: number }
): Promise<string | null> {
  const key = groqApiKey();
  if (!key) return null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 450,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const content = (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content;
    return content && content.trim().length > 0 ? content : null;
  } catch {
    return null;
  }
}
