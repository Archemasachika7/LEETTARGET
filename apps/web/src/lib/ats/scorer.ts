export type AtsSeverity = "high" | "medium" | "low";

export interface AtsIssue {
  severity: AtsSeverity;
  title: string;
  detail: string;
  fix: string;
}

export interface AtsSubscore {
  id: string;
  label: string;
  score: number;
  max: number;
  notes: string[];
}

export interface AtsReport {
  overall: number;
  grade: string;
  summary: string;
  wordCount: number;
  subscores: AtsSubscore[];
  issues: AtsIssue[];
  matchedKeywords: string[];
  missingKeywords: string[];
  usedJobDescription: boolean;
  builderLink: { label: string; url: string; reason: string } | null;
}

const ATS_BUILDER_LINK = {
  label: "ResumeGyani — free ATS resume builder",
  url: "https://resumegyani.in/",
  reason:
    "Rebuild on an ATS-safe single-column template, then re-check. The goal is 90+ before you hit apply.",
};

const STOPWORDS = new Set([
  "the", "and", "for", "with", "you", "your", "are", "was", "were", "will",
  "would", "can", "could", "should", "have", "has", "had", "this", "that",
  "these", "those", "from", "into", "over", "under", "about", "our", "we",
  "they", "their", "them", "his", "her", "she", "him", "not", "but", "all",
  "any", "each", "other", "such", "than", "then", "when", "where", "which",
  "who", "whom", "what", "how", "why", "also", "more", "most", "some",
  "own", "same", "only", "very", "just", "out", "off", "per", "via",
  "etc", "including", "include", "includes", "work", "working", "worked",
  "team", "teams", "ability", "strong", "good", "well", "new", "use",
  "used", "using", "within", "across", "etc.",
]);

const ACTION_VERBS = new Set([
  "built", "led", "designed", "developed", "launched", "improved", "created",
  "managed", "reduced", "increased", "automated", "shipped", "optimized",
  "optimised", "implemented", "migrated", "mentored", "owned", "delivered",
  "architected", "wrote", "fixed", "scaled", "drove", "cut", "grew",
  "won", "ran", "tested", "deployed", "analyzed", "analysed", "streamlined",
  "spearheaded", "coordinated", "founded", "engineered", "resolved",
  "refactored", "taught", "organized", "organised", "published", "presented",
  "built", "trained", "debugged", "integrated", "prototyped", "researched",
]);

const SECTION_PATTERNS = [
  { id: "summary", label: "Summary / Objective", regex: /\b(summary|objective|profile)\b/i, core: true },
  { id: "experience", label: "Experience", regex: /\b(experience|employment|work history|internships?)\b/i, core: true },
  { id: "education", label: "Education", regex: /\b(education|academics?|qualifications?)\b/i, core: true },
  { id: "skills", label: "Skills", regex: /\b(skills|technologies|tech stack)\b/i, core: true },
  { id: "projects", label: "Projects", regex: /\b(projects?|portfolio)\b/i, core: false },
  { id: "certs", label: "Certifications / Achievements", regex: /\b(certifications?|certificates?|achievements?|awards?|hono[u]?rs?)\b/i, core: false },
];

const WEIGHTS = { contact: 15, sections: 20, keywords: 25, impact: 15, readability: 15, formatting: 10 };

function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9][a-z0-9+#.\-]*/g) ?? [];
}

function contentWords(text: string): string[] {
  return words(text).filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function scoreContact(resume: string, issues: AtsIssue[]): AtsSubscore {
  const max = WEIGHTS.contact;
  let score = 0;
  const notes: string[] = [];
  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(resume);
  const hasPhone = /(\+?\d[\d\s().-]{8,}\d)/.test(resume);
  const hasLinkedin = /linkedin\.com/i.test(resume);
  const hasGithub = /github\.com/i.test(resume);

  if (hasEmail) { score += 6; notes.push("Email found."); }
  if (hasPhone) { score += 5; notes.push("Phone number found."); }
  if (hasLinkedin || hasGithub) { score += 4; notes.push("Profile link found."); }

  if (!hasEmail) issues.push({ severity: "high", title: "No email address detected", detail: "Parsers index the email first. If it is missing or buried in a header graphic, the application goes nowhere.", fix: "Put a plain-text email on the first line of the resume." });
  if (!hasPhone) issues.push({ severity: "high", title: "No phone number detected", detail: "Most ATS forms require a phone number and recruiters use it for quick screening calls.", fix: "Add your mobile number next to the email, with country code." });
  if (!hasLinkedin && !hasGithub) issues.push({ severity: "low", title: "No LinkedIn or GitHub link", detail: "Not a parser problem, but technical recruiters look for both.", fix: "Add full URLs (https://...) so the parser keeps them." });

  return { id: "contact", label: "Contact & basics", score, max, notes };
}

function scoreSections(resume: string, issues: AtsIssue[]): AtsSubscore {
  const max = WEIGHTS.sections;
  const found = SECTION_PATTERNS.filter((s) => s.regex.test(resume));
  const missing = SECTION_PATTERNS.filter((s) => !s.regex.test(resume));
  const coreFound = found.filter((s) => s.core).length;
  const extraFound = found.filter((s) => !s.core).length;
  const score = clamp(coreFound * 4 + extraFound * 2, 0, max);
  const notes = found.map((s) => `Detected: ${s.label}.`);

  for (const s of missing) {
    if (s.core) issues.push({ severity: "high", title: `Missing section: ${s.label}`, detail: "ATS parsers file your content under standard headings. A missing core section means that data lands in the void.", fix: `Add a clear "${s.label}" heading on its own line.` });
    else issues.push({ severity: "low", title: `No ${s.label} section`, detail: "Optional, but it is free real estate for keywords.", fix: `Add a short "${s.label}" section if you have material for it.` });
  }
  return { id: "sections", label: "Section structure", score, max, notes };
}

function scoreKeywords(resume: string, jd: string, issues: AtsIssue[]): { sub: AtsSubscore; matched: string[]; missing: string[] } {
  const max = WEIGHTS.keywords;
  const freq = new Map<string, number>();
  for (const w of contentWords(jd)) freq.set(w, (freq.get(w) ?? 0) + 1);
  const terms = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([w]) => w);
  const resumeSet = new Set(contentWords(resume));
  const matched = terms.filter((t) => resumeSet.has(t));
  const missing = terms.filter((t) => !resumeSet.has(t));
  const rate = terms.length > 0 ? matched.length / terms.length : 0;
  const score = Math.round(max * clamp(rate / 0.75, 0, 1));
  const notes = [`${matched.length} of ${terms.length} high-signal JD terms appear in the resume.`];

  if (rate < 0.35) issues.push({ severity: "high", title: "Weak keyword match against the job description", detail: "Under ~35% overlap, most ATS filters rank this resume near the bottom of the pile.", fix: "Mirror the JD's exact terms where they are honestly true — especially tools, languages, and domain words." });
  else if (rate < 0.6) issues.push({ severity: "medium", title: "Keyword match could be stronger", detail: "You are in the grey zone where a recruiter search may or may not surface this resume.", fix: "Work the missing terms below into your skills and experience lines where accurate." });

  return {
    sub: { id: "keywords", label: "Keyword match vs job description", score, max, notes },
    matched: matched.slice(0, 15),
    missing: missing.slice(0, 15),
  };
}

function scoreImpact(resume: string, issues: AtsIssue[]): AtsSubscore {
  const max = WEIGHTS.impact;
  const lines = resume.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 30);
  const quantified = lines.filter((l) => /\d/.test(l));
  const verbLed = lines.filter((l) => {
    const first = l.replace(/^[-*•▪◦·\d.)\s]+/, "").split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "");
    return first ? ACTION_VERBS.has(first) : false;
  });
  const base = Math.max(1, lines.length);
  const quantScore = Math.round(9 * clamp(quantified.length / base / 0.35, 0, 1));
  const verbScore = Math.round(6 * clamp(verbLed.length / base / 0.5, 0, 1));
  const notes = [
    `${quantified.length}/${lines.length} substantial lines contain a number.`,
    `${verbLed.length}/${lines.length} lines open with an action verb.`,
  ];

  if (quantified.length / base < 0.2) issues.push({ severity: "medium", title: "Very few quantified results", detail: "Lines like \"worked on backend\" say nothing. Lines like \"cut API latency 40%\" survive both the parser and the recruiter skim.", fix: "Add a number to at least every third bullet — %, count, time, money, anything real." });
  if (verbLed.length / base < 0.3) issues.push({ severity: "low", title: "Bullets rarely open with action verbs", detail: "Passive openers (\"responsible for\", \"helped with\") dilute impact and read the same as everyone else.", fix: "Start bullets with verbs like built, led, shipped, automated, reduced." });

  return { id: "impact", label: "Impact & action language", score: quantScore + verbScore, max, notes };
}

function scoreReadability(resume: string, issues: AtsIssue[]): AtsSubscore {
  const max = WEIGHTS.readability;
  const wc = words(resume).length;
  let wcScore = 1;
  if (wc >= 350 && wc <= 850) wcScore = 9;
  else if ((wc >= 250 && wc < 350) || (wc > 850 && wc <= 1000)) wcScore = 6;
  else if ((wc >= 150 && wc < 250) || (wc > 1000 && wc <= 1200)) wcScore = 3;

  const sentences = resume.split(/[.!?\n]+/).map((s) => s.trim()).filter(Boolean);
  const avg = wc / Math.max(1, sentences.length);
  const sentScore = avg >= 8 && avg <= 26 ? 6 : avg >= 5 && avg <= 34 ? 3 : 1;
  const notes = [`${wc} words total.`, `Average ${avg.toFixed(1)} words per line/sentence.`];

  if (wc < 300) issues.push({ severity: "medium", title: "Resume looks too thin", detail: "Under ~300 words usually means missing detail an ATS can index.", fix: "Expand experience and projects with concrete, honest specifics." });
  if (wc > 900) issues.push({ severity: "medium", title: "Resume looks bloated", detail: "Over ~900 words and parsers plus humans both start skipping.", fix: "Cut anything that does not sell this specific application." });
  if (sentScore < 6) issues.push({ severity: "low", title: "Line lengths are off", detail: "Very long or very choppy lines hurt both parsing and human scanning.", fix: "Keep bullets to one or two lines each." });

  return { id: "readability", label: "Length & readability", score: wcScore + sentScore, max, notes };
}

function scoreFormatting(resume: string, issues: AtsIssue[]): AtsSubscore {
  const max = WEIGHTS.formatting;
  let score = max;
  const notes: string[] = [];

  const nonAscii = (resume.match(/[^\x00-\x7F]/g) ?? []).length;
  if (nonAscii / Math.max(1, resume.length) > 0.02) {
    score -= 3;
    notes.push("High non-standard character density.");
    issues.push({ severity: "medium", title: "Unusual symbols or smart quotes", detail: "Decorative bullets, em dashes from fancy templates, and icon fonts often parse as garbage.", fix: "Stick to plain hyphens, standard bullets, and straight quotes." });
  }

  const capsWords = (resume.match(/\b[A-Z]{4,}\b/g) ?? []).length;
  const wc = Math.max(1, words(resume).length);
  if (capsWords / wc > 0.15) {
    score -= 2;
    notes.push("Heavy ALL-CAPS usage.");
    issues.push({ severity: "low", title: "Too much ALL CAPS", detail: "Some parsers normalize case badly and all-caps blocks can merge or drop.", fix: "Use normal title case for headings and company names." });
  }

  if (resume.split(/\r?\n/).some((l) => l.length > 220)) {
    score -= 2;
    notes.push("Extremely long lines detected.");
    issues.push({ severity: "medium", title: "Possible table or multi-column layout", detail: "Very long lines after pasting usually mean the source template uses tables or columns, which many ATS parsers read in the wrong order.", fix: "Rebuild on a single-column layout — no text boxes, no tables." });
  }

  if (/references available on request/i.test(resume)) {
    score -= 1;
    issues.push({ severity: "low", title: "\"References available on request\"", detail: "Wastes a line and dates the resume.", fix: "Delete it." });
  }

  const firstPerson = (resume.match(/\b(I|me|my|mine)\b/g) ?? []).length;
  if (firstPerson / wc > 0.015) {
    score -= 1;
    issues.push({ severity: "low", title: "Heavy first-person voice", detail: "Resume convention is implied first person — \"Built X\", not \"I built X\".", fix: "Drop the pronouns; start with the verb." });
  }

  return { id: "formatting", label: "Formatting & parse health", score: clamp(score, 0, max), max, notes };
}

export function analyzeResume(resumeText: string, jobDescription?: string): AtsReport {
  const issues: AtsIssue[] = [];
  const resume = resumeText ?? "";
  const jd = (jobDescription ?? "").trim();
  const useJd = contentWords(jd).length >= 30;

  const contact = scoreContact(resume, issues);
  const sections = scoreSections(resume, issues);
  const impact = scoreImpact(resume, issues);
  const readability = scoreReadability(resume, issues);
  const formatting = scoreFormatting(resume, issues);

  let matched: string[] = [];
  let missing: string[] = [];
  const subscores: AtsSubscore[] = [contact, sections];

  if (useJd) {
    const kw = scoreKeywords(resume, jd, issues);
    matched = kw.matched;
    missing = kw.missing;
    subscores.push(kw.sub, impact, readability, formatting);
  } else {
    if (jd.length > 0) {
      issues.push({ severity: "low", title: "Job description too short to use", detail: "The pasted JD had under 30 meaningful words, so keyword scoring was skipped and weights were redistributed.", fix: "Paste the full job posting for a real keyword-match score." });
    }
    subscores.push(impact, readability, formatting);
  }

  const earned = subscores.reduce((a, s) => a + s.score, 0);
  const attainable = subscores.reduce((a, s) => a + s.max, 0);
  const overall = clamp(Math.round((earned / Math.max(1, attainable)) * 100), 0, 100);

  let grade: string;
  let summary: string;
  if (overall >= 90) {
    grade = "ATS-ready";
    summary = "This reads like a resume that survives the parser and the six-second human skim. Ship it.";
  } else if (overall >= 75) {
    grade = "Close";
    summary = "A handful of fixes stand between this and a 90. They are listed below — none of them are hard.";
  } else if (overall >= 60) {
    grade = "Needs work";
    summary = "The raw material is fine, but enough of this will get misread or filtered that it will cost interviews.";
  } else {
    grade = "High risk";
    summary = "Right now this resume is likely getting filtered before a human ever sees it. Start with the high-severity fixes.";
  }

  const severityRank: Record<AtsSeverity, number> = { high: 0, medium: 1, low: 2 };
  issues.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    overall,
    grade,
    summary,
    wordCount: words(resume).length,
    subscores,
    issues,
    matchedKeywords: matched,
    missingKeywords: missing,
    usedJobDescription: useJd,
    builderLink: overall < 90 ? { ...ATS_BUILDER_LINK } : null,
  };
}
