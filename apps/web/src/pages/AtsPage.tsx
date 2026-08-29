import { useState } from "react";
import { analyzeResume } from "../lib/ats/scorer";
import type { AtsReport, AtsSeverity } from "../lib/ats/scorer";
import { gemmaEnabled, getGemmaSuggestions } from "../lib/ats/llm";

function scoreColor(n: number): string {
  if (n >= 90) return "text-emerald-600";
  if (n >= 75) return "text-amber-600";
  if (n >= 60) return "text-orange-600";
  return "text-rose-600";
}

function barColor(n: number): string {
  if (n >= 90) return "bg-emerald-500";
  if (n >= 75) return "bg-amber-500";
  if (n >= 60) return "bg-orange-500";
  return "bg-rose-500";
}

const SEVERITY_STYLE: Record<AtsSeverity, string> = {
  high: "bg-rose-100 text-rose-800 border-rose-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-neutral-100 text-neutral-700 border-neutral-200",
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
    <div className="mx-auto max-w-4xl space-y-6 p-4 text-neutral-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">ATS Score Evaluator</h1>
        <p className="text-sm text-neutral-600">
          Paste your resume, get a score out of 100 and the exact reasons behind it. Add the job
          description for a real keyword-match score. Nothing leaves the browser
          {gemmaEnabled() ? " except an anonymized snippet sent to Gemma for suggestions" : ""}.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Resume text</span>
          <textarea
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Open your resume PDF, select all, copy, paste here..."
            className="h-64 rounded-lg border border-neutral-300 bg-white p-3 font-mono text-xs focus:border-neutral-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">
            Job description <span className="font-normal text-neutral-500">(optional, but recommended)</span>
          </span>
          <textarea
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the full job posting to score keyword match..."
            className="h-64 rounded-lg border border-neutral-300 bg-white p-3 font-mono text-xs focus:border-neutral-500 focus:outline-none"
          />
        </label>
      </section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleScore}
          disabled={!canScore}
          className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Scoring..." : "Score my resume"}
        </button>
        {report && (
          <button onClick={handleReset} className="text-sm text-neutral-500 underline underline-offset-2">
            Start over
          </button>
        )}
        {resumeText.trim().length > 0 && resumeText.trim().length < 80 && (
          <span className="text-xs text-rose-600">That does not look like a resume yet — paste the full text.</span>
        )}
      </div>

      {report && (
        <div className="space-y-6">
          <section className="flex flex-col items-start gap-6 rounded-xl border border-neutral-200 bg-white p-6 sm:flex-row sm:items-center">
            <div className="relative h-28 w-28 shrink-0">
              <svg viewBox="0 0 36 36" className="h-28 w-28 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" className="stroke-neutral-200" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" strokeLinecap="round"
                  pathLength={100} strokeDasharray={`${report.overall} 100`}
                  className={report.overall >= 90 ? "stroke-emerald-500" : report.overall >= 75 ? "stroke-amber-500" : report.overall >= 60 ? "stroke-orange-500" : "stroke-rose-500"}
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center text-3xl font-bold ${scoreColor(report.overall)}`}>
                {report.overall}
              </div>
            </div>
            <div className="space-y-1">
              <div className={`text-lg font-semibold ${scoreColor(report.overall)}`}>{report.grade}</div>
              <p className="max-w-xl text-sm text-neutral-600">{report.summary}</p>
              <p className="text-xs text-neutral-500">
                {report.wordCount} words{report.usedJobDescription ? " · scored against your job description" : " · no job description used"}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">Breakdown</h2>
            <div className="space-y-3">
              {report.subscores.map((s) => {
                const pct = s.max > 0 ? Math.round((s.score / s.max) * 100) : 0;
                return (
                  <div key={s.id}>
                    <div className="mb-1 flex items-baseline justify-between text-sm">
                      <span>{s.label}</span>
                      <span className="font-mono text-xs text-neutral-500">{s.score}/{s.max}</span>
                    </div>
                    <div className="h-2 rounded-full bg-neutral-100">
                      <div className={`h-2 rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    {s.notes.length > 0 && <p className="mt-1 text-xs text-neutral-500">{s.notes.join(" ")}</p>}
                  </div>
                );
              })}
            </div>
          </section>

          {report.usedJobDescription && (report.matchedKeywords.length > 0 || report.missingKeywords.length > 0) && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Keywords</h2>
              {report.matchedKeywords.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1 text-xs font-medium text-emerald-700">Found in your resume</div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.matchedKeywords.map((k) => (
                      <span key={k} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {report.missingKeywords.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-medium text-rose-700">Missing — the ATS is looking for these</div>
                  <div className="flex flex-wrap gap-1.5">
                    {report.missingKeywords.map((k) => (
                      <span key={k} className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs text-rose-800">{k}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {report.issues.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Fixes, in order of damage
              </h2>
              <ul className="space-y-3">
                {report.issues.map((issue, i) => (
                  <li key={i} className="rounded-lg border border-neutral-200 p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${SEVERITY_STYLE[issue.severity]}`}>
                        {issue.severity}
                      </span>
                      <span className="text-sm font-medium">{issue.title}</span>
                    </div>
                    <p className="text-xs text-neutral-600">{issue.detail}</p>
                    <p className="mt-1 text-xs font-medium text-neutral-800">Fix: {issue.fix}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tips && tips.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-6">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                Second opinion — Gemma 2 (free tier)
              </h2>
              <ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
          )}

          {report.builderLink && (
            <section className="rounded-xl border border-amber-300 bg-amber-50 p-6">
              <h2 className="text-sm font-semibold text-amber-900">Under 90? Do not apply yet.</h2>
              <p className="mt-1 text-sm text-amber-800">
                {report.builderLink.reason}
              </p>
              <a
                href={report.builderLink.url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                {report.builderLink.label} →
              </a>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
