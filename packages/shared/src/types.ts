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
}

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
 * leetcode_profiles (sync plumbing, not user-facing). */
export interface Profile {
  userId: string;
  bio?: string;
  avatarUrl?: string;
}
