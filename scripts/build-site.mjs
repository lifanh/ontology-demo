import { cp, mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const demoFiles = ["index.html", "styles.css"];
const demoDirectories = ["src", "artifacts", "v2"];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of demoFiles) {
  await cp(path.join(root, file), path.join(output, file));
}
for (const directory of demoDirectories) {
  await cp(path.join(root, directory), path.join(output, directory), { recursive: true });
}

const slidev = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "slidev.cmd" : "slidev");
const result = spawnSync(slidev, [
  "build",
  path.join(root, "slides", "slides.md"),
  "--base",
  "/slides/",
  "--out",
  path.join(output, "slides"),
], { cwd: root, stdio: "inherit" });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

for (const file of demoFiles) {
  const [source, deployed] = await Promise.all([
    readFile(path.join(root, file)),
    readFile(path.join(output, file)),
  ]);
  if (!source.equals(deployed)) throw new Error(`Build changed demo source while copying ${file}`);
}

console.log("Built the unchanged demo at / and the Slidev deck at /slides/.");
