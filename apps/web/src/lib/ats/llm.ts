import type { AtsReport } from "./scorer";
import { groqChat, groqEnabled } from "../groq.js";

/** Kimi K2 on Groq's free tier. gemma2-9b-it, used here previously, was
 * pulled off the free tier — check console.groq.com/docs/models before
 * assuming this one is still current, Groq moves these around. */
const MODEL = "moonshotai/kimi-k2-instruct";

export const secondOpinionEnabled = groqEnabled;

/**
 * Optional second opinion from an LLM on Groq's free tier, on top of the
 * rule-based score. Returns null when no key is configured or anything
 * fails — the rule-based report is always the source of truth.
 */
export async function getSecondOpinion(report: AtsReport, resumeText: string): Promise<string[] | null> {
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

  const content = await groqChat(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { model: MODEL, temperature: 0.4, maxTokens: 450 }
  );
  if (!content) return null;

  const tips = content
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
    .filter((l) => l.length > 12)
    .slice(0, 5);
  return tips.length > 0 ? tips : null;
}
