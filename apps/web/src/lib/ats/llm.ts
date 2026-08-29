import type { AtsReport } from "./scorer";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "gemma2-9b-it";

function apiKey(): string | undefined {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const key = env?.VITE_GROQ_API_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function gemmaEnabled(): boolean {
  return Boolean(apiKey());
}

/**
 * Optional second opinion from Gemma 2 9B on Groq's free tier.
 * Returns null when no key is configured or anything fails — the
 * rule-based report is always the source of truth.
 *
 * NOTE: calling Groq from the browser exposes the key to anyone who
 * opens devtools. Fine for a personal project; move this behind a
 * Supabase edge function before real users touch it.
 */
export async function getGemmaSuggestions(report: AtsReport, resumeText: string): Promise<string[] | null> {
  const key = apiKey();
  if (!key) return null;

  const system = [
    "You are a placement-cell senior at an Indian engineering college who has reviewed over 500 resumes.",
    "You write like a person, not an AI: short sentences, specific, a little blunt.",
    "Never use buzzwords like leverage, delve, showcase, passionate, or synergy. No emojis. No motivational fluff.",
  ].join(" ");

  const user = [
    `ATS score: ${report.overall}/100 (${report.grade}).`,
    `Top issues: ${report.issues.slice(0, 4).map((i) => i.title).join("; ") || "none"}.`,
    report.missingKeywords.length > 0 ? `Missing JD keywords: ${report.missingKeywords.slice(0, 8).join(", ")}.` : "",
    "",
    "Resume text (truncated):",
    resumeText.slice(0, 3500),
    "",
    "Give exactly 5 fixes, one per line, each starting with '- '. Each fix must name the exact spot in the resume and what to write instead. No intro, no outro, only the 5 lines.",
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.4,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;

    const data: unknown = await res.json();
    const content =
      (data as { choices?: { message?: { content?: string } }[] })?.choices?.[0]?.message?.content ?? "";
    const tips = content
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter((l) => l.length > 12)
      .slice(0, 5);
    return tips.length > 0 ? tips : null;
  } catch {
    return null;
  }
}
