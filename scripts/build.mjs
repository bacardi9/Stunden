// Copy assets to dist
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));

const entries = ["index.html", "impressum.html", "datenschutz.html", "css", "js", "CNAME"];

await rm(DIST, { recursive: true, force: true });
await mkdir(DIST, { recursive: true });

for (const entry of entries) {
  await cp(fileURLToPath(new URL(`../${entry}`, import.meta.url)), fileURLToPath(new URL(`../dist/${entry}`, import.meta.url)), {
    recursive: true,
    force: true
  });
}

console.log("Build complete: static assets copied to dist/");
