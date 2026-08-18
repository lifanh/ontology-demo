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
    ...await filesUnder(path.join(root, "v2")),
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

test("the product has customer-review and review-policy workbenches without release management", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  const app = await readFile(path.join(root, "src", "ui", "app.js"), "utf8");
  const productSource = `${html}\n${app}`;
  assert.ok(html.indexOf('id="reviewView"') < html.indexOf('id="studioView"'));
  assert.equal(html.match(/data-view=/g)?.length, 2);
  assert.match(html, /data-view="review"[^>]*>.*?<strong>Customer Reviews<\/strong>/);
  assert.match(html, /data-view="studio"[^>]*>.*?<strong>Review Policy<\/strong>/);
  assert.ok(html.indexOf('class="review-stage selector-stage queue-panel"') < html.indexOf('id="caseWorkspace"'));
  assert.match(html, /class="case-tabs"[^>]*role="tablist"/);
  assert.match(html, /data-case-tab="overview"/);
  assert.match(html, /data-case-tab="findings"/);
  assert.match(html, /data-case-tab="evidence"/);
  assert.match(html, /data-case-tab="activity"/);
  assert.ok(html.indexOf('class="policy-registry"') < html.indexOf('class="policy-workbench"'));
  assert.match(html, /class="evidence-rail"/);
  assert.match(html, /fact catalog/i);
  assert.match(productSource, /id: "runBatch"/);
  const studioSource = html.slice(html.indexOf('id="studioView"'), html.indexOf("</main>"));
  assert.match(studioSource, /id="resultSection"/);
  assert.match(studioSource, /Compatibility/);
  assert.match(studioSource, /Review impact/);
  assert.doesNotMatch(productSource, /id="activateRelease"|data-view="releases"|id="releasesView"|id="releaseSelector"|id="releaseRegistryList"|data-open-view|Release Management/);
  assert.match(html, /id="customerSwitcher"/);
  assert.match(html, /id="reviewSearch"/);
  assert.match(html, /id="reviewQueueView"/);
  assert.match(html, /id="reviewSort"/);
  assert.match(html, /class="data-table queue-table"/);
  assert.match(html, /Example intents/);
  assert.match(html, /Structured policy diff/);
  assert.match(productSource, /class="data-table ontology-table"/);
  assert.match(productSource, /id="saveReviewDraft"/);
  assert.match(productSource, /id="completeReview"/);
  assert.match(productSource, /id="reopenReview"/);
  assert.match(html, /Browser-tab state only/);
  assert.match(html, /controls update this browser tab only—not a production workflow, CIS customer-state change, or audit record/);
  assert.match(html, /id="resetButton"/);
  assert.match(app, /escapeHtml\(result\.rationale\.summary\)/);
  assert.match(app, /AI rationale unavailable/);
  assert.match(app, /reviewExplanations/);
  assert.match(app, /policyExplanations/);
  assert.match(app, /customer-review:product:v1/);
  assert.match(app, /demo-auth-required/);
  assert.match(html, /Illustrative POC/);
  assert.match(html, /fictional customer data/i);
  assert.doesNotMatch(productSource, /get_parent_exposure|production-path|artifact-showcase|Approve &amp; publish|APPROVED_AND_PUBLISHED|Mocked output|MOCKED TRANSLATION/);
  assert.doesNotMatch(productSource, /Policy change queue|STATIC DRAFTING PROMPT|step-track/);
  assert.match(productSource, /Fixed fictional boundary cohort—not a production portfolio, forecast, or workload estimate/);
  assert.match(productSource, /Governed review, approval, publication, and activation happen outside this POC/);
});

test("maintainer guidance documents both portable modes and exact approved claims", async () => {
  const [readme, html, accessSource, slides, context] = await Promise.all([
    readFile(path.join(root, "README.md"), "utf8"),
    readFile(path.join(root, "index.html"), "utf8"),
    readFile(path.join(root, "src", "ui", "access.js"), "utf8"),
    readFile(path.join(root, "slides", "slides.md"), "utf8"),
    readFile(path.join(root, "CONTEXT.md"), "utf8")
  ]);
  const staticClaim = "Illustrative POC · Fictional data · Deterministic mode";
  const aiClaim = "Illustrative POC · Fictional data · AI enabled";
  assert.match(readme, new RegExp(staticClaim));
  assert.match(readme, new RegExp(aiClaim));
  assert.match(html, /Illustrative POC · Fictional data/);
  assert.match(accessSource, new RegExp(aiClaim));
  assert.match(accessSource, new RegExp(staticClaim));
  assert.match(html, /Do not enter production customer data or confidential policy/);
  assert.match(readme, /canonical full-mode gateway is the Hono application served by Node/);
  assert.match(readme, /Cloudflare is optional/);
  assert.match(readme, /deterministic-only static assets/);
  assert.doesNotMatch(slides, /Demo Release|Policy Studio/);
  assert.match(context, /\*\*Active Policy Version\*\*/);
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
