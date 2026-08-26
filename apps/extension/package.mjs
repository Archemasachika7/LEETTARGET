import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";

if (!existsSync("dist/manifest.json")) {
  console.error("dist/manifest.json not found — run `npm run build` first.");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync("dist/manifest.json", "utf-8"));
const version = manifest.version;

const outDir = "release";
mkdirSync(outDir, { recursive: true });

const zipPath = `${outDir}/leettarget-extension-v${version}.zip`;
rmSync(zipPath, { force: true });

// Zip dist/'s *contents* at the archive root (Chrome Web Store expects
// manifest.json at the top level, not nested inside a "dist/" folder).
execFileSync("zip", ["-r", `../${zipPath}`, "."], { cwd: "dist", stdio: "inherit" });

console.log(`Packaged ${zipPath} — upload this to the Chrome Web Store developer dashboard.`);
