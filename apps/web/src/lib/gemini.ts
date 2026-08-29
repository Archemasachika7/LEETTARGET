import type { GroqMessage } from "./groq.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export function geminiApiKey(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const key = env?.VITE_GEMINI_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function geminiEnabled(): boolean {
  return Boolean(geminiApiKey());
}

/**
 * Thin wrapper over Google AI Studio's free-tier Gemini API. Same "return
 * null on anything but a clean answer" contract as lib/groq.ts, so callers
 * (see lib/llm.ts) can treat the two providers interchangeably.
 *
 * NOTE: calling this from the browser exposes the key to anyone who opens
 * devtools — same caveat as the Groq client. Move behind a Supabase edge
 * function before real users touch it.
 */
export async function geminiChat(
  messages: GroqMessage[],
  options: { model: string; temperature?: number; maxOutputTokens?: number; timeoutMs?: number }
): Promise<string | null> {
  const key = geminiApiKey();
  if (!key) return null;

  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 15000);
    const res = await fetch(`${GEMINI_ENDPOINT}/${options.model}:generateContent`, {
      method: "POST",
      // Some Google AI Studio keys (the newer "AQ."-prefixed format) 404
      // against the ?key= query-parameter auth method most examples still
      // use — the x-goog-api-key header is Google's current documented
      // method and works for both key formats.
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          maxOutputTokens: options.maxOutputTokens ?? 450,
        },
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const parts = (data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content
      ?.parts;
    const text = parts?.map((p) => p.text ?? "").join("") ?? "";
    return text.trim().length > 0 ? text : null;
  } catch {
    return null;
  }
}
