import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(root, "build");
const output = path.join(outputDirectory, "customer-review-ontology.pdf");
await mkdir(outputDirectory, { recursive: true });

const slidev = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "slidev.cmd" : "slidev");
const result = spawnSync(slidev, [
  "export",
  path.join(root, "slides", "slides.md"),
  "--output",
  output,
  "--with-toc",
  "--wait",
  "500",
], { cwd: root, stdio: "inherit" });

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
console.log(`Exported ${path.relative(root, output)}.`);
