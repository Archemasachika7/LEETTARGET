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
