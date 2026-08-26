import { DEFAULT_PATH_TEMPLATE, type ExtensionSetupCode } from "@leettarget/shared";
import { getConfig, setConfig, type ExtensionConfig } from "../lib/storage.js";

const fieldIds = [
  "githubOwner",
  "githubRepo",
  "githubBranch",
  "pathTemplate",
  "githubToken",
  "supabaseUrl",
  "supabaseAnonKey",
  "leetTargetUserId",
  "supabaseAccessToken",
  "supabaseRefreshToken",
] as const;

function field(id: (typeof fieldIds)[number]): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

async function load() {
  const config = await getConfig();
  for (const id of fieldIds) {
    field(id).value = (config[id] ?? "") as string;
  }
  if (!config.pathTemplate) field("pathTemplate").value = DEFAULT_PATH_TEMPLATE;
  if (!config.githubBranch) field("githubBranch").value = "main";
}

async function save() {
  const existing = await getConfig();
  const config: ExtensionConfig = { supabaseExpiresAt: existing.supabaseExpiresAt };
  for (const id of fieldIds) {
    const value = field(id).value.trim();
    if (value) config[id] = value;
  }
  await setConfig(config);

  const status = document.getElementById("status")!;
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 2000);
}

function isSetupCode(value: unknown): value is ExtensionSetupCode {
  const v = value as Partial<ExtensionSetupCode> | null;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.supabaseUrl === "string" &&
    typeof v.supabaseAnonKey === "string" &&
    typeof v.leetTargetUserId === "string" &&
    typeof v.supabaseAccessToken === "string" &&
    typeof v.supabaseRefreshToken === "string"
  );
}

async function applySetupCode() {
  const setupStatus = document.getElementById("setupStatus")!;
  const raw = (document.getElementById("setupCode") as HTMLTextAreaElement).value.trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    setupStatus.textContent = "That doesn't look like valid JSON — copy the whole box from the site.";
    return;
  }

  if (!isSetupCode(parsed)) {
    setupStatus.textContent = "Missing expected fields — copy the whole box from the site.";
    return;
  }

  // Merge onto the existing config rather than replacing it outright — the
  // GitHub PAT (never part of the setup code) and any manually-set repo
  // fields the site didn't know about should survive an apply.
  const existing = await getConfig();
  const merged: ExtensionConfig = {
    ...existing,
    supabaseUrl: parsed.supabaseUrl,
    supabaseAnonKey: parsed.supabaseAnonKey,
    leetTargetUserId: parsed.leetTargetUserId,
    supabaseAccessToken: parsed.supabaseAccessToken,
    supabaseRefreshToken: parsed.supabaseRefreshToken,
    supabaseExpiresAt: undefined, // unknown until the next refresh; treated as "not stale" until then
    githubOwner: parsed.githubOwner ?? existing.githubOwner,
    githubRepo: parsed.githubRepo ?? existing.githubRepo,
    githubBranch: parsed.githubBranch ?? existing.githubBranch,
    pathTemplate: parsed.pathTemplate ?? existing.pathTemplate,
  };
  await setConfig(merged);
  await load();

  setupStatus.textContent = "Applied — synced fields updated below.";
  setTimeout(() => (setupStatus.textContent = ""), 3000);
}

document.getElementById("save")!.addEventListener("click", () => void save());
document.getElementById("applySetup")!.addEventListener("click", () => void applySetupCode());
void load();
