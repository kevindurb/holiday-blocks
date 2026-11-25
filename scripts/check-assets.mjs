// Build-time sanity checks for the static site. There is no compile step;
// this verifies the assets and entry points the site needs exist and the
// word list is well-formed.
import { readFileSync, existsSync } from "node:fs";

const required = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/worker.js",
  "assets/words.txt",
  "assets/SCOWL-COPYRIGHT.txt",
  "NOTICE.md",
];

let failed = false;
for (const path of required) {
  if (!existsSync(path)) {
    console.error(`missing required file: ${path}`);
    failed = true;
  }
}

const words = readFileSync("assets/words.txt", "utf8").split("\n").filter(Boolean);
if (words.length < 50000) {
  console.error(`word list suspiciously small: ${words.length} entries`);
  failed = true;
}
const bad = words.find((line) => !/^[a-z]{2,} [0-9]+$/.test(line));
if (bad) {
  console.error(`malformed word list line: ${JSON.stringify(bad)}`);
  failed = true;
}

if (failed) process.exit(1);
console.log(`assets OK (${words.length} words)`);
