import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const location = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(location) : [location];
  }));
  return nested.flat();
}

test("assembled site preserves every deployed demo source byte for byte", async () => {
  const sourceFiles = [
    path.join(root, "index.html"),
    path.join(root, "styles.css"),
    ...await filesUnder(path.join(root, "src")),
    ...await filesUnder(path.join(root, "artifacts")),
  ];

  for (const source of sourceFiles) {
    const relative = path.relative(root, source);
    const [expected, actual] = await Promise.all([
      readFile(source),
      readFile(path.join(root, "dist", relative)),
    ]);
    assert.deepEqual(actual, expected, `${relative} changed during site assembly`);
  }
});

test("assembled Slidev deck uses the /slides/ base and local assets", async () => {
  const html = await readFile(path.join(root, "dist", "slides", "index.html"), "utf8");
  assert.match(html, /\/slides\/assets\//);
  assert.doesNotMatch(html, /fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net/);
  assert.match(html, /\/slides\/favicon\.svg/);
  await access(path.join(root, "dist", "slides", "favicon.svg"));
  const source = await readFile(path.join(root, "slides", "slides.md"), "utf8");
  assert.match(source, /^routerMode: hash$/m);
});

test("assembled output excludes package and authoring internals", async () => {
  await assert.rejects(access(path.join(root, "dist", "node_modules")));
  await assert.rejects(access(path.join(root, "dist", "package.json")));
  await assert.rejects(access(path.join(root, "dist", "slides", "slides.md")));
});
