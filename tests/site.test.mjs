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
  await assert.rejects(access(path.join(root, "dist", "server")));
  await assert.rejects(access(path.join(root, "dist", "README.md")));
  await assert.rejects(access(path.join(root, "dist", "slides", "slides.md")));
});

test("assembled browser assets contain no server-only configuration or credentials", async () => {
  const contents = (await Promise.all((await filesUnder(path.join(root, "dist"))).map(file => readFile(file)))).map(value => value.toString("utf8")).join("\n");
  for (const forbidden of ["DEMO_PASSWORD", "SESSION_SECRET", "COPILOT_GITHUB_TOKEN"]) assert.doesNotMatch(contents, new RegExp(forbidden));
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
  assert.doesNotMatch(productSource, /get_parent_exposure|production-path|artifact-showcase|Approve &amp; publish|APPROVED_AND_PUBLISHED|Mocked output|MOCKED TRANSLATION/);
});

test("maintainer guidance documents both portable modes and exact approved claims", async () => {
  const [readme, html, accessSource] = await Promise.all([
    readFile(path.join(root, "README.md"), "utf8"),
    readFile(path.join(root, "index.html"), "utf8"),
    readFile(path.join(root, "src", "ui", "access.js"), "utf8")
  ]);
  const staticClaim = "Illustrative POC · Fictional customer data · AI features disabled";
  const aiClaim = "Illustrative POC · Fictional customer data · Real GitHub Copilot calls";
  assert.match(html, new RegExp(staticClaim));
  assert.match(accessSource, new RegExp(aiClaim));
  assert.match(readme, new RegExp(staticClaim));
  assert.match(readme, new RegExp(aiClaim));
  assert.match(html, /Do not enter production customer data or confidential policy/);
  assert.match(readme, /canonical full-mode gateway is the Hono application served by Node/);
  assert.match(readme, /Cloudflare is optional/);
  assert.match(readme, /deterministic-only static assets/);
});

test("live provider smoke is explicit opt-in and excluded from the default suite", async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const script = await readFile(path.join(root, "scripts", "live-ai-smoke.mjs"), "utf8");
  assert.equal(packageJson.scripts["test:live-ai"], "node scripts/live-ai-smoke.mjs");
  assert.doesNotMatch(packageJson.scripts.test, /live-ai/);
  assert.match(script, /LIVE_AI_SMOKE !== "true"/);
  assert.match(script, /content and provider details suppressed/);
  assert.doesNotMatch(script, /console\.log\([^)]*(?:result|request|config|error)/);
});
