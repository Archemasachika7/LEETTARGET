import { build } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const outdir = "dist";
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    inject: "src/inject.ts",
    "options/options": "src/options/options.ts",
    "popup/popup": "src/popup/popup.ts",
  },
  bundle: true,
  outdir,
  format: "esm",
  target: "chrome111",
  sourcemap: true,
});

cpSync("manifest.json", `${outdir}/manifest.json`);
mkdirSync(`${outdir}/options`, { recursive: true });
mkdirSync(`${outdir}/popup`, { recursive: true });
cpSync("src/options/options.html", `${outdir}/options/options.html`);
cpSync("src/popup/popup.html", `${outdir}/popup/popup.html`);

console.log(`Built extension into ${outdir}/ — load it as an unpacked extension.`);
