import { DEFAULT_PATH_TEMPLATE } from "@leettarget/shared";
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
  const config: ExtensionConfig = {};
  for (const id of fieldIds) {
    const value = field(id).value.trim();
    if (value) config[id] = value;
  }
  await setConfig(config);

  const status = document.getElementById("status")!;
  status.textContent = "Saved.";
  setTimeout(() => (status.textContent = ""), 2000);
}

document.getElementById("save")!.addEventListener("click", () => void save());
void load();
