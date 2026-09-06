// Post-build step: minify the hand-written page scripts copied into dist/ by Astro.
// Vendor files under <app>/vendor/ are already shipped minified (or loaded lazily);
// this only touches the app's own JS, which lives unminified in public/.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, "..", "dist");

const targets = [
  "_ui/ui.js",
  "image/image.js",
  "pdf/pdf.js",
  "convert/convert.js",
];

let failed = false;
for (const rel of targets) {
  const file = path.join(dist, rel);
  if (!fs.existsSync(file)) {
    console.warn("postbuild: missing " + rel + " — skipping");
    continue;
  }
  try {
    await build({
      entryPoints: [file],
      outfile: file,
      allowOverwrite: true,
      minify: true,
      logLevel: "silent",
    });
    console.log("postbuild: minified dist/" + rel);
  } catch (err) {
    console.error("postbuild: minify failed for " + rel + " — " + (err.message || err));
    failed = true;
  }
}
if (failed) process.exit(1);
console.log("postbuild: done");
