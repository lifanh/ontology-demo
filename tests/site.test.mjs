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

test("Customer Review is the default semantic sequence and Policy Studio remains separate", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const app = await readFile(path.join(root, "src", "ui", "app.js"), "utf8");
  const productSource = `${html}\n${app}`;
  const stages = ["selector-stage", "action-stage", "traces-stage", "ai-stage", "disposition-stage", "calculator-stage"];
  assert.ok(stages.every((stage, index) => html.indexOf(stage) > (index ? html.indexOf(stages[index - 1]) : -1)));
  assert.ok(html.indexOf('id="reviewView"') < html.indexOf('id="studioView"'));
  assert.match(html, /data-view="review"[^>]*>Customer Review/);
  assert.match(html, /data-view="studio"[^>]*>Policy Studio/);
  assert.match(html, /Reviewed 1,247 accounts · 38 flagged · showing 4/);
  assert.match(html, /id="customerSwitcher"/);
  assert.match(html, /05 · Human choice · Session only/);
  assert.match(html, /not an audit trail, identity, role, approval, or production workflow/);
  assert.match(html, /Facts and Findings never change/);
  assert.match(html, /id="resetButton"/);
  assert.match(productSource, /Approve &amp; activate demo release/);
  assert.match(productSource, /Active in this browser tab only/);
  assert.match(html, /Illustrative history/);
  assert.match(html, /This session/);
  assert.match(app, /escapeHtml\(result\.rationale\.summary\)/);
  assert.match(app, /AI rationale unavailable/);
  assert.match(app, /reviewExplanations/);
  assert.match(app, /policyExplanations/);
  assert.match(app, /customer-review:product:v1/);
  assert.match(app, /demo-auth-required/);
  assert.match(html, /Illustrative POC · Fictional customer data · AI features disabled/);
  assert.doesNotMatch(productSource, /get_parent_exposure|production-path|artifact-showcase|Approve &amp; publish|APPROVED_AND_PUBLISHED/);
});
