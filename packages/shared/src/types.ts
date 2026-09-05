/** Canonical LeetCode problem record — the join key for CSV rows, extension
 * events, and manual entries so the same problem is never duplicated. */
export interface Problem {
  id: string;
  slug: string;
  title: string;
  url: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Unknown";
  tags: string[];
}

export type TargetSource = "csv" | "manual" | "leetcode";
export type TargetStatus = "pending" | "done";

/** A problem the user intends to solve. Either resolved to a canonical
 * `problemId`, or a free-standing custom title/url (e.g. a CSV row that
 * didn't match anything in `problems` yet). */
export interface Target {
  id: string;
  userId: string;
  problemId?: string;
  customTitle?: string;
  customUrl?: string;
  /** LeetCode slug, when derivable from customUrl/problemId — the join key
   * used to auto-mark a target "done" when a matching solve comes in. */
  slug?: string;
  source: TargetSource;
  status: TargetStatus;
  createdAt: string;
  /** Severity of "this one gave me trouble" — independent of `status` and
   * deliberately not cleared when the target is later solved, so it stays
   * visible as a "revisit this" marker even after the checkmark. No green
   * level: green already means "done" via `status`, so a flag only ever
   * escalates (yellow → red), it never has an "all good" tier of its own. */
  flagLevel: TargetFlagLevel;
  notes?: string;
}

export type TargetFlagLevel = "none" | "yellow" | "red";

/** A GitHub repo the user commits LeetCode solutions to (LeetHub-style). */
export interface GithubLink {
  userId: string;
  owner: string;
  repo: string;
  branch: string;
  /** e.g. "{difficulty}/{slug}" — used to guess a solution's file path
   * when the extension doesn't report one directly. */
  pathTemplate: string;
}

/** A problem the user has actually solved, as observed by the extension
 * (or imported from LeetCode's public API). */
export interface SolvedProblem {
  id: string;
  userId: string;
  problemId: string;
  language?: string;
  githubPath?: string;
  commitSha?: string;
  solvedAt: string;
}

/** One row parsed out of an uploaded targets CSV. */
export interface CsvTargetRow {
  title: string;
  url: string;
  slug?: string;
}

export interface CsvImportSummary {
  filename: string;
  rowCount: number;
  importedAt: string;
}

/** What the site's "Extension setup" page generates, and what the
 * extension's options page parses — the shape both sides agree on so a
 * one-time copy/paste is enough to wire up sync (repo mapping included, so
 * only the GitHub PAT itself has to be entered separately — it never
 * touches Supabase, by design). */
export interface ExtensionSetupCode {
  supabaseUrl: string;
  supabaseAnonKey: string;
  leetTargetUserId: string;
  supabaseAccessToken: string;
  supabaseRefreshToken: string;
  githubOwner?: string;
  githubRepo?: string;
  githubBranch?: string;
  pathTemplate?: string;
}

/** Display profile shown in the site header/profile tab — separate from
 * Supabase Auth identity (which owns email/GitHub login) and from
 * leetcode_profiles (sync plumbing, not user-facing). Readable by any
 * signed-in user (see migration 0004_leaderboard.sql) — only its owner can
 * write it. */
export interface Profile {
  userId: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export type PracticeFocus = "interview" | "competitive" | "fundamentals" | "general";

/** A user's practice goals — the numbers the dashboard measures a day and a
 * week against. Private to their owner (unlike profiles/targets/solves, which
 * the leaderboard opens up). Absence of a row means onboarding hasn't run. */
export interface UserGoals {
  userId: string;
  dailyTarget: number;
  weeklyTarget: number;
  focus?: PracticeFocus;
  goalTotal?: number;
  goalDeadline?: string;
  onboardedAt?: string;
}

/** What a brand-new user gets before they've chosen anything — also the
 * values the onboarding form opens on. */
export const DEFAULT_GOALS: Pick<UserGoals, "dailyTarget" | "weeklyTarget"> = {
  dailyTarget: 3,
  weeklyTarget: 15,
};

/** One row of the public leaderboard — every signed-in user with at least
 * one target or solve, ranked by `solvedCount`. Backed by the `leaderboard`
 * SQL view (migration 0004_leaderboard.sql), which only ever exposes what
 * each underlying table's RLS policies already allow. */
export interface LeaderboardEntry {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  leetcodeUsername?: string;
  solvedCount: number;
  targetCount: number;
  doneCount: number;
}

/** A timed practice session, joinable by a short shareable code. Everyone
 * with the code sees the same countdown (or stopwatch) because it's
 * derived from `startedAt` (+ `durationSeconds`, for a countdown) — no
 * realtime sync needed, every client computes the identical remaining or
 * elapsed time on its own clock. Not tied to a specific target/problem in
 * v1 — `label` is a free-text description the host can optionally set
 * ("Two Sum + Group Anagrams", "Mock interview"). */
export interface PracticeSession {
  id: string;
  code: string;
  hostUserId: string;
  label?: string;
  /** Absent means an open-ended stopwatch (counts up, no end) rather than
   * a countdown to a fixed duration. Any positive value up to 86400 (24h)
   * when present — not capped anywhere below that by the UI. */
  durationSeconds?: number;
  startedAt: string;
  createdAt: string;
}

/** The study tracks the app is organised around. LeetCode is one of four
 * peers here, not the product with add-ons: each track owns its own goals,
 * its own workspace and its own progress reading. */
export type GoalTrack = "leetcode" | "gate" | "cat" | "google-skills";

/** A dated commitment — "GATE on 8 Feb", "500 problems before placements",
 * "CAT mocks done by October".
 *
 * `targetDate` is the whole point: a goal without a deadline is a wish, and
 * the pace maths in `goals.ts` has nothing to measure against. `targetCount`
 * is optional, because some goals are purely a date on the calendar (the exam
 * itself) with no quantity attached — those get a countdown and honestly
 * nothing more. */
export interface Goal {
  id: string;
  userId: string;
  track: GoalTrack;
  title: string;
  /** `YYYY-MM-DD`, read as a local calendar date (see `parseLocalDate`). */
  targetDate: string;
  /** How many units finish this goal. Absent = a date marker only. */
  targetCount?: number;
  /** What a unit is, for display: "problems", "topics", "mocks". */
  unit?: string;
  createdAt: string;
  archivedAt?: string;
}

export type GoalPace = "ahead" | "on-track" | "behind" | "done" | "overdue" | "untracked";

/** The computed state of a goal at a moment in time — see `summariseGoal`.
 * The optional fields are all absent together, for a goal with no
 * `targetCount`: there is no percentage of an unmeasured thing. */
export interface GoalSummary {
  daysLeft: number;
  completed: number;
  remaining?: number;
  percent?: number;
  requiredPerDay?: number;
  requiredPerWeek?: number;
  /** Where an evenly-paced effort would stand today. */
  expectedByNow?: number;
  pace: GoalPace;
}

/** A doubts-forum subject — GATE, CAT, PDSA, or anything else a user names.
 * Creation is open (see migration 0008_doubts.sql), so `slug` is the
 * normalised join key that keeps "PDSA", "pdsa" and "P.D.S.A." from
 * fragmenting into three subjects; `name` keeps whatever casing/spacing the
 * creator typed. */
export interface Subject {
  id: string;
  slug: string;
  name: string;
  createdBy: string;
  createdAt: string;
}

export type DoubtStatus = "open" | "resolved";

/** A question posted to a subject, visible to every member of it. Optional
 * `problemId` ties it to a canonical LeetCode problem so it can also
 * surface from that problem's own context, not only the subject's feed.
 * `solutionText` ships to the browser with the rest of the doubt — the
 * reveal panel in the UI is a "don't spoil it for myself" toggle, not
 * access control. */
export interface Doubt {
  id: string;
  subjectId: string;
  authorId: string;
  problemId?: string;
  title: string;
  questionText?: string;
  solutionText?: string;
  status: DoubtStatus;
  createdAt: string;
  updatedAt: string;
}

/** What a Google Skills item actually is — grouping only, no behaviour
 * difference beyond how it's labelled and filtered. */
export type SkillItemKind = "cloud-skills-boost" | "career-certificate" | "general";

export type SkillItemStatus = "planned" | "in-progress" | "done";

/** One badge, course or self-declared skill on the Google Skills track.
 * Manually logged, not synced — neither Cloud Skills Boost nor Coursera
 * has a free public API, so there is nothing honest to auto-fetch. See
 * migration 0013_google_skills.sql. */
export interface SkillItem {
  id: string;
  userId: string;
  kind: SkillItemKind;
  title: string;
  url?: string;
  status: SkillItemStatus;
  /** `YYYY-MM-DD`, a personal deadline for this one item. */
  targetDate?: string;
  completedAt?: string;
  createdAt: string;
}

export type DoubtImageKind = "question" | "solution";

/** An uploaded screenshot attached to a doubt. `storagePath` is a key into
 * the private `doubt-images` bucket — never a public URL — so the app
 * always fetches it through a signed URL scoped to subject membership. */
export interface DoubtImage {
  id: string;
  doubtId: string;
  uploadedBy: string;
  kind: DoubtImageKind;
  storagePath: string;
  createdAt: string;
}
