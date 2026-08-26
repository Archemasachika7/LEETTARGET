import type { Problem } from "./types.js";

export interface GithubRepoRef {
  owner: string;
  repo: string;
  branch?: string;
}

/** Accepts "owner/repo" or a full github.com URL and splits it into parts. */
export function parseRepoInput(input: string): GithubRepoRef {
  const trimmed = input.trim().replace(/\.git$/, "");
  const urlMatch = trimmed.match(/github\.com[/:]([^/]+)\/([^/]+)/i);
  const [owner, repo] = urlMatch ? [urlMatch[1], urlMatch[2]] : trimmed.split("/");

  if (!owner || !repo) {
    throw new Error(`"${input}" doesn't look like an "owner/repo" or GitHub URL.`);
  }
  return { owner, repo };
}

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: "py",
  python3: "py",
  java: "java",
  "c++": "cpp",
  cpp: "cpp",
  c: "c",
  "c#": "cs",
  csharp: "cs",
  javascript: "js",
  typescript: "ts",
  go: "go",
  golang: "go",
  kotlin: "kt",
  swift: "swift",
  rust: "rs",
  ruby: "rb",
  scala: "scala",
  php: "php",
};

export function extensionForLanguage(language: string): string {
  return LANGUAGE_EXTENSIONS[language.toLowerCase()] ?? "txt";
}

/** Builds the path a solution file should live at, given a repo's
 * `pathTemplate` (e.g. "{difficulty}/{slug}") and the problem/language
 * being committed. Mirrors LeetHub's default layout so an existing LeetHub
 * repo needs no reorganizing. */
export function buildSolutionPath(
  pathTemplate: string,
  problem: Pick<Problem, "slug" | "difficulty">,
  language: string
): string {
  const dir = pathTemplate
    .replace("{difficulty}", problem.difficulty)
    .replace("{slug}", problem.slug);
  return `${dir}/solution.${extensionForLanguage(language)}`;
}

export const DEFAULT_PATH_TEMPLATE = "{difficulty}/{slug}";

interface GithubTreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
}

const SKIP_BASENAMES = new Set(["readme", "notes", "solution", "index", "stats", "license"]);

/** Turns one path segment (a folder or file name) into a candidate LeetCode
 * slug, or undefined if it clearly isn't one — strips the file extension
 * and LeetHub's common leading problem-number prefix ("1750-", "1750.",
 * "1750_"), then normalizes to lowercase-with-dashes. Best-effort: this
 * can't tell a real slug from an unrelated folder name, so callers only
 * trust a candidate that also matches something already known (the
 * `problems` catalog or one of the user's own targets). */
function candidateSlugFromSegment(segment: string): string | undefined {
  const withoutExtension = segment.replace(/\.[a-z0-9]+$/i, "");
  const withoutNumberPrefix = withoutExtension.replace(/^\d+[-._\s]+/, "");
  const normalized = withoutNumberPrefix
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!normalized || normalized.length < 2 || SKIP_BASENAMES.has(normalized)) return undefined;
  return normalized;
}

export interface FetchRepoSolvedSlugsOptions {
  /** A GitHub personal access token, required to read a private repo — a
   * public repo doesn't need one. Callers are responsible for how they
   * source/store it; this function only ever attaches it to the one
   * request it makes here, never persists it. */
  token?: string;
  fetchImpl?: typeof fetch;
}

/** Best-effort match of a mapped GitHub repo's existing folder/file names
 * back to LeetCode slugs, so a repo that already has solutions committed
 * (e.g. from LeetHub, before LeetTarget existed) can be backfilled instead
 * of only tracking solves going forward. Not tied to one exact LeetHub
 * layout: prefers folder names (the more reliable signal when a repo nests
 * each solution in its own directory — "1750-two-sum/solution.py") and
 * falls back to file basenames for flatter repos. Returns a map of
 * slug -> the file path to record as that solve's `github_path`. */
export async function fetchRepoSolvedSlugs(
  ref: Required<GithubRepoRef>,
  options?: FetchRepoSolvedSlugsOptions
): Promise<Map<string, string>> {
  const { token, fetchImpl = fetch } = options ?? {};
  const res = await fetchImpl(
    `https://api.github.com/repos/${ref.owner}/${ref.repo}/git/trees/${encodeURIComponent(ref.branch)}?recursive=1`,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
  );
  if (res.status === 401) {
    throw new Error(
      `GitHub rejected that token. Check it's still valid and has read access to "${ref.owner}/${ref.repo}".`
    );
  }
  if (res.status === 404) {
    // The GitHub API returns 404 (not 403) both when a repo genuinely
    // doesn't exist and when the request can't see it (private, and
    // either no token was given or the token lacks access) — it doesn't
    // distinguish, on purpose, so neither can this message. Also the most
    // common cause for anyone pasting a real repo: the saved branch name
    // isn't the repo's actual default branch (e.g. "main" saved for a
    // repo whose default is "master").
    throw new Error(
      token
        ? `Couldn't find "${ref.owner}/${ref.repo}" on branch "${ref.branch}", even with a token. Double-check ` +
            `the owner/repo spelling, that the token has access to this repo, and that "${ref.branch}" matches ` +
            `the repo's actual default branch on GitHub.`
        : `Couldn't find "${ref.owner}/${ref.repo}" on branch "${ref.branch}". Double-check the owner/repo ` +
            `spelling, that the repo is public (paste a token above if it's private), and that "${ref.branch}" ` +
            `matches the repo's actual default branch on GitHub.`
    );
  }
  if (!res.ok) {
    throw new Error(`Failed to read ${ref.owner}/${ref.repo}'s file tree: ${res.status}`);
  }
  const json = (await res.json()) as { tree?: GithubTreeEntry[] };
  const entries = json.tree ?? [];
  const blobs = entries.filter((e) => e.type === "blob");
  const dirs = entries.filter((e) => e.type === "tree");

  const result = new Map<string, string>();

  for (const dir of dirs) {
    const segment = dir.path.split("/").pop()!;
    const slug = candidateSlugFromSegment(segment);
    if (!slug || result.has(slug)) continue;
    const child = blobs.find((b) => b.path.startsWith(`${dir.path}/`));
    if (child) result.set(slug, child.path);
  }

  for (const blob of blobs) {
    const segment = blob.path.split("/").pop()!;
    const slug = candidateSlugFromSegment(segment);
    if (!slug || result.has(slug)) continue;
    result.set(slug, blob.path);
  }

  return result;
}

interface GithubFile {
  sha: string;
  content: string;
}

/** Minimal GitHub REST client for reading/writing a single file's
 * contents — just enough to commit a LeetCode solution (create it if it
 * doesn't exist, update it in place if it does). Uses a personal access
 * token; see `apps/extension` options page for how it's supplied. */
export class GithubClient {
  constructor(
    private token: string,
    private fetchImpl: typeof fetch = fetch
  ) {}

  private async request(path: string, init?: RequestInit): Promise<Response> {
    return this.fetchImpl(`https://api.github.com${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  }

  private async getFile(ref: GithubRepoRef, path: string): Promise<GithubFile | undefined> {
    const branchQuery = ref.branch ? `?ref=${encodeURIComponent(ref.branch)}` : "";
    const res = await this.request(
      `/repos/${ref.owner}/${ref.repo}/contents/${path}${branchQuery}`
    );
    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status}`);
    const json = (await res.json()) as GithubFile;
    return json;
  }

  /** Creates or updates a file's contents, returning the new commit SHA. */
  async upsertFile(
    ref: GithubRepoRef,
    path: string,
    content: string,
    message: string
  ): Promise<{ commitSha: string }> {
    const existing = await this.getFile(ref, path);

    const res = await this.request(`/repos/${ref.owner}/${ref.repo}/contents/${path}`, {
      method: "PUT",
      body: JSON.stringify({
        message,
        content: base64Encode(content),
        branch: ref.branch,
        sha: existing?.sha,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to write ${path}: ${res.status} ${body}`);
    }

    const json = (await res.json()) as { commit: { sha: string } };
    return { commitSha: json.commit.sha };
  }
}

/** UTF-8 safe base64 encode. `btoa` alone chokes on non-Latin1 characters;
 * available as a global in both the extension's service worker and the
 * Deno-based edge function, so no Node `Buffer` dependency needed. */
function base64Encode(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}
