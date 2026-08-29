import { useState } from "react";
import { FileText } from "lucide-react";
import { analyzeResume } from "../lib/ats/scorer";
import type { AtsReport, AtsSeverity } from "../lib/ats/scorer";
import { gemmaEnabled, getGemmaSuggestions } from "../lib/ats/llm";
import { Badge, Button, Card, EmptyState, Eyebrow, Field, SectionHeader, Textarea } from "../ui/index.js";
import { cn } from "../lib/cn.js";

type Tier = "success" | "brand" | "warning" | "danger";

function tier(n: number): Tier {
  if (n >= 90) return "success";
  if (n >= 75) return "brand";
  if (n >= 60) return "warning";
  return "danger";
}

const TIER_TEXT: Record<Tier, string> = {
  success: "text-success",
  brand: "text-brand",
  warning: "text-warning",
  danger: "text-danger",
};

const TIER_BAR: Record<Tier, string> = {
  success: "bg-success",
  brand: "bg-brand",
  warning: "bg-warning",
  danger: "bg-danger",
};

const TIER_RING: Record<Tier, string> = {
  success: "stroke-success",
  brand: "stroke-brand",
  warning: "stroke-warning",
  danger: "stroke-danger",
};

const SEVERITY_TONE: Record<AtsSeverity, "danger" | "warning" | "neutral"> = {
  high: "danger",
  medium: "warning",
  low: "neutral",
};

export default function AtsPage() {
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [report, setReport] = useState<AtsReport | null>(null);
  const [tips, setTips] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const canScore = resumeText.trim().length >= 80 && !busy;

  async function handleScore() {
    if (!canScore) return;
    setBusy(true);
    setTips(null);
    const result = analyzeResume(resumeText, jdText.trim().length > 0 ? jdText : undefined);
    setReport(result);
    if (gemmaEnabled()) {
      const gemmaTips = await getGemmaSuggestions(result, resumeText);
      setTips(gemmaTips);
    }
    setBusy(false);
  }

  function handleReset() {
    setResumeText("");
    setJdText("");
    setReport(null);
    setTips(null);
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-text">ATS check</h1>
        <p className="mt-1 text-sm text-text-muted">
          Paste your resume and get a score out of 100, with the exact reasons behind it. Add the job
          description too and the keyword score gets real instead of guessed.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <Field label="Resume text">
          <Textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Open your resume, select all, copy, paste here."
            className="h-64 font-mono text-xs"
          />
        </Field>
        <Field label="Job description" hint="Optional, but the keyword score needs it to mean anything.">
          <Textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job posting to score keyword match."
            className="h-64 font-mono text-xs"
          />
        </Field>
      </section>

      <div className="flex items-center gap-3">
        <Button variant="primary" onClick={handleScore} disabled={!canScore} loading={busy} loadingText="Scoring…">
          Score my resume
        </Button>
        {report && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            Start over
          </Button>
        )}
        {resumeText.trim().length > 0 && resumeText.trim().length < 80 && (
          <span className="text-xs text-danger">That's too short to be a full resume — paste all of it.</span>
        )}
      </div>

      {report && (
        <div className="flex flex-col gap-6">
          <Card className="flex flex-col items-start gap-6 p-6 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-surface" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  pathLength={100}
                  strokeDasharray={`${report.overall} 100`}
                  className={cn("transition-[stroke-dasharray] duration-progress ease-smooth", TIER_RING[tier(report.overall)])}
                />
              </svg>
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center font-mono text-3xl font-bold tabular-nums",
                  TIER_TEXT[tier(report.overall)]
                )}
              >
                {report.overall}
              </div>
            </div>
            <div className="space-y-1">
              <div className={cn("text-lg font-semibold", TIER_TEXT[tier(report.overall)])}>{report.grade}</div>
              <p className="max-w-xl text-sm text-text-secondary">{report.summary}</p>
              <p className="text-xs text-text-muted">
                {report.wordCount} words
                {report.usedJobDescription ? " · scored against your job description" : " · no job description used"}
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <SectionHeader title="Breakdown" />
            <div className="mt-4 space-y-3">
              {report.subscores.map((s) => {
                const pct = s.max > 0 ? Math.round((s.score / s.max) * 100) : 0;
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-baseline justify-between text-sm text-text">
                      <span>{s.label}</span>
                      <span className="font-mono text-xs text-text-muted">
                        {s.score}/{s.max}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden bg-border/60">
                      <div
                        className={cn("h-full transition-[width] duration-progress ease-smooth", TIER_BAR[tier(pct)])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {s.notes.length > 0 && <p className="mt-1 text-xs text-text-muted">{s.notes.join(" ")}</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {report.usedJobDescription && (report.matchedKeywords.length > 0 || report.missingKeywords.length > 0) && (
            <Card className="p-6">
              <SectionHeader title="Keywords" />
              <div className="mt-3 space-y-3">
                {report.matchedKeywords.length > 0 && (
                  <div>
                    <Eyebrow className="text-success">Found in your resume</Eyebrow>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {report.matchedKeywords.map((k) => (
                        <Badge key={k} tone="success">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {report.missingKeywords.length > 0 && (
                  <div>
                    <Eyebrow className="text-danger">Missing — the ATS is looking for these</Eyebrow>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {report.missingKeywords.map((k) => (
                        <Badge key={k} tone="danger">
                          {k}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {report.issues.length > 0 && (
            <section className="flex flex-col gap-3">
              <SectionHeader title="Fixes, in order of damage" />
              <ul className="flex flex-col gap-3">
                {report.issues.map((issue, i) => (
                  <Card as="li" key={i} className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge tone={SEVERITY_TONE[issue.severity]}>{issue.severity}</Badge>
                      <span className="text-sm font-medium text-text">{issue.title}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{issue.detail}</p>
                    <p className="mt-1 text-xs font-medium text-text">Fix: {issue.fix}</p>
                  </Card>
                ))}
              </ul>
            </section>
          )}

          {tips && tips.length > 0 && (
            <Card className="p-6">
              <SectionHeader title="Second opinion — Gemma 2 (free tier)" />
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-text-secondary">
                {tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </Card>
          )}

          {report.builderLink && (
            <Card className="border-warning/30 bg-warning/5 p-6">
              <h2 className="text-sm font-semibold text-warning">Under 90? Don't apply yet.</h2>
              <p className="mt-1 text-sm text-text-secondary">{report.builderLink.reason}</p>
              <a
                href={report.builderLink.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex h-9 items-center rounded-sm bg-warning px-3.5 text-sm font-medium text-brand-contrast transition-colors duration-fast hover:bg-warning/85"
              >
                {report.builderLink.label} →
              </a>
            </Card>
          )}
        </div>
      )}

      {!report && !canScore && resumeText.trim().length === 0 && (
        <EmptyState
          icon={<FileText className="h-6 w-6" aria-hidden />}
          title="Nothing scored yet."
          description="Paste a resume above and score it. Everything runs in your browser — nothing is uploaded unless you've added a Groq key for the optional second opinion."
        />
      )}
    </div>
  );
}
