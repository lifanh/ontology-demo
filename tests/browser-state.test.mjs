import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { test } from "node:test";
import { chromium } from "playwright-chromium";
import { parseRule, formatRule } from "../src/core/authoring.js";
import { Governance } from "../src/core/governance.js";
import { assessReviewImpact, createEvaluator } from "../src/core/runtime.js";
import { activeRules, analyzeCandidate, compileCandidate, creditPack, nextReleaseId, policyImpactCohort, registry, release, scenarios } from "../src/domains/credit/pack.js";

const freePort = () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close(error => error ? reject(error) : resolve(port));
  });
});

async function startVite(port) {
  const child = spawn("node_modules/.bin/vp", ["dev", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: process.cwd(), detached: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const ready = new Promise((resolve, reject) => {
    const read = chunk => {
      output += chunk;
      if (output.includes(`127.0.0.1:${port}`)) resolve();
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.once("exit", code => reject(new Error(`Vite exited before ready (${code}): ${output}`)));
  });
  await ready;
  return child;
}

const rationale = {
  schemaVersion: "1",
  operation: "explain_review",
  result: {
    rationale: { status: "EXPLAINED", summary: "Persisted grounded rationale", points: [{ text: "The deterministic finding remains authoritative.", references: ["fact:2002/past_due_amount"] }] },
    evidenceResults: [],
    toolTrace: { eligible: ["get_payment_history", "get_open_disputes"], called: [] }
  }
};

function legacyActivatedStudioState() {
  const scenario = scenarios.adp20;
  const sourceDsl = formatRule(scenario.ast, { root: "customer" });
  const governance = new Governance({ activeRelease: release, candidate: { logicalId: scenario.logicalId, revision: scenario.revision, sourcePolicy: scenario.policy, sourceDsl, ast: null } });
  const ast = parseRule(sourceDsl, registry, { root: "customer" });
  governance.updateDraft({ ast });
  governance.record("validation", { valid: true, ast });
  governance.record("analysis", analyzeCandidate(ast, activeRules));
  const candidateRule = compileCandidate(ast, scenario.revision);
  const candidateRules = activeRules.map(rule => rule.id === candidateRule.id ? candidateRule : rule);
  const candidateRelease = { id: `${release.id}-candidate-r${scenario.revision}`, ontologyVersion: release.ontologyVersion, actionPolicyVersion: release.actionPolicyVersion, calculatorVersion: release.calculatorVersion, status: "CANDIDATE_PREVIEW", rules: candidateRules.map(({ id, revision }) => ({ id, revision })) };
  const evaluate = createEvaluator(creditPack);
  const batch = assessReviewImpact(policyImpactCohort, customer => evaluate(customer, activeRules, release), customer => evaluate(customer, candidateRules, candidateRelease));
  governance.record("batch", batch);
  const activatedRelease = { id: nextReleaseId(release.id), predecessorReleaseId: release.id, ontologyVersion: release.ontologyVersion, actionPolicyVersion: release.actionPolicyVersion, calculatorVersion: release.calculatorVersion, rules: candidateRules.map(({ id, revision }) => ({ id, revision })), compiledRules: candidateRules, candidate: { logicalId: scenario.logicalId, revision: scenario.revision, sourceDsl } };
  const legacy = governance.snapshot();
  legacy.activeReleaseId = activatedRelease.id;
  legacy.revisions[legacy.revisions.length - 1].state = "APPROVED_AND_ACTIVATED";
  legacy.releaseHistory = [release, activatedRelease];
  return { selected: "adp20", governance: legacy, releaseRuleSets: { [release.id]: activeRules, [activatedRelease.id]: candidateRules }, batch, policyExplanations: {}, policyInput: scenario.policy, dslInput: sourceDsl };
}

test("tab product state is keyed, reloadable, isolated, resettable, and preserved through re-authentication", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let authenticated = true, expireNext = false;
  const configure = async page => {
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated, modelDisplayName: "GitHub Copilot (gpt-5.4)" } }));
    await page.route("**/api/ai/explain_review", route => {
      if (expireNext) {
        expireNext = false;
        authenticated = false;
        return route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED", message: "Authentication required", retryable: false, correlationId: "browser-test" } } });
      }
      return route.fulfill({ json: rationale });
    });
    await page.route("**/api/ai/draft_rule", route => {
      const policyText = route.request().postDataJSON().policyText;
      const adp = policyText.includes("Average Days to Pay");
      const ratio = policyText.includes("6%") ? "0.06" : "0.05";
      return route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: adp
        ? { outcome: "CANDIDATE", family: "HIGH_BALANCE_ADP_MAX", summary: "Lower the ADP threshold.", dsl: "RULE HIGH_BALANCE_ADP_MAX\nSCOPE customer.restricted_status == \"N\"\n      AND customer.ar_balance > 100000 USD\nSET_MAX customer.adp_days = 20 DAYS\nEND" }
        : { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Lower the threshold.", dsl: `RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == "NET_30"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = ${ratio}\nEND` } } });
    });
    await page.route("**/api/login", route => { authenticated = true; return route.fulfill({ json: { authenticated: true, expiresInSeconds: 28800 } }); });
    await page.route("**/api/logout", route => { authenticated = false; return route.fulfill({ json: { authenticated: false } }); });
  };
  try {
    const page = await context.newPage();
    await configure(page);
    await page.goto(`http://127.0.0.1:${port}/`);
    assert.equal(await page.locator('[data-customer="2002"]').getAttribute("aria-pressed"), "true");
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "In review");
    await page.locator("#reviewQueueView").selectOption("MINE");
    assert.equal(await page.locator("[data-customer]").count(), 1);
    await page.locator("#reviewSearch").fill("Cascade");
    await page.reload();
    await page.locator(".product-shell").waitFor({ state: "visible" });
    assert.equal(await page.locator("#reviewQueueView").inputValue(), "MINE");
    assert.equal(await page.locator("#reviewSearch").inputValue(), "Cascade");
    assert.equal(await page.locator("[data-customer]").count(), 1);
    await page.locator("#reviewSearch").fill("");
    await page.locator("#reviewQueueView").selectOption("ALL");
    await page.locator('[data-customer="2002"]').click();
    await page.locator("#requestReviewInformation").click();
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "Waiting for information");
    await page.locator("#escalateReview").click();
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "Escalated");
    await page.locator('[data-case-tab="evidence"]').click();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("Persisted grounded rationale").waitFor();
    await page.locator('[data-case-tab="findings"]').click();
    await page.locator('[data-case-panel="findings"]:not(.hidden)').waitFor();
    await page.reload();
    await page.locator('[data-case-panel="findings"]:not(.hidden)').waitFor();
    assert.equal(await page.locator('[data-case-tab="findings"]').getAttribute("aria-selected"), "true");
    assert.equal(await page.locator('[data-customer="2002"]').getAttribute("aria-pressed"), "true");
    await page.locator('[data-case-tab="evidence"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();

    await page.locator('[data-customer="2001"]').click();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    await page.locator('[data-customer="2002"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();
    await page.locator('input[name="reviewDisposition"][value="ACCEPTED"]').check();
    await page.locator("#saveReviewDraft").click();
    await page.getByText("Draft saved", { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:dispositions:v1")), null);
    await page.locator("#completeReview").click();
    await page.getByText("Recommendation accepted", { exact: true }).waitFor();
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "Completed");

    await page.locator('[data-customer="2001"]').click();
    await page.locator("#assignReviewToMe").click();
    await page.locator('input[name="reviewDisposition"][value="OVERRIDDEN"]').check();
    await page.locator("#reviewOverrideReason").fill("A documented exception for this test.");
    await page.locator("#completeReview").click();
    await page.getByText("Recommendation replaced", { exact: true }).waitFor();
    assert.equal((await page.locator("#reviewOpenCount").textContent()).trim(), "2");
    await page.locator("#reviewQueueView").selectOption("COMPLETED");
    assert.equal(await page.locator("[data-customer]").count(), 2);
    await page.locator('[data-customer="2002"]').click();
    await page.locator("#reviewQueueView").selectOption("ALL");

    await page.locator('[data-view="studio"]').click();
    const spacedPolicyIntent = "  For unrestricted customers with balances above $100,000, Average Days to Pay must not exceed 20 days.\n";
    await page.locator("#policyInput").fill(spacedPolicyIntent);
    await page.locator("#generatePrompt").click();
    await page.getByText(/AI-drafted candidate/).waitFor();
    assert.equal(await page.locator("#policyInput").inputValue(), spacedPolicyIntent);
    assert.equal((await page.locator("#policyWorkbenchTitle").textContent()).trim(), "High-balance payment limit");
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), "Stable ID HIGH_BALANCE_ADP_MAX · candidate revision 3");
    assert.match(await page.locator("#policyDiff").textContent(), /Unchanged scope.*25 DAYS.*20 DAYS/s);
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    await page.locator("#runBatch").click();
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    assert.equal(await page.locator('[data-view="review"], [data-view="studio"]').count(), 2);
    assert.equal(await page.locator('[data-view="releases"], #releasesView, #activateRelease, #releaseSelector').count(), 0);
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    assert.equal((await page.locator("#policyWorkbenchTitle").textContent()).trim(), "High-balance payment limit");
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), "Stable ID HIGH_BALANCE_ADP_MAX · candidate revision 3");
    await page.locator("#policyInput").fill("Unapplied business intent preserved across reload");
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.equal(await page.locator("#policyInput").inputValue(), "Unapplied business intent preserved across reload");
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), "Stable ID HIGH_BALANCE_ADP_MAX · candidate revision 3");
    await page.locator("#policyInput").fill("");
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.equal(await page.locator("#policyInput").inputValue(), "");
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), "Stable ID HIGH_BALANCE_ADP_MAX · candidate revision 3");
    await page.locator("#editorSection summary").click();
    await page.locator("#validateButton").click();
    await page.getByText("Apply source and intent edits before running validation.").waitFor();
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Evidence complete");
    assert.equal(await page.locator(".evidence-history").count(), 0);
    await page.locator('[data-view="review"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();
    assert.match(await page.locator("#dispositionOutput").textContent(), /Recommendation accepted/);
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "Completed");

    await page.evaluate(() => {
      const key = "customer-review:policy-studio:v1";
      const stored = JSON.parse(sessionStorage.getItem(key));
      stored.governance.evidence.batch.headline = "Forged restored impact";
      sessionStorage.setItem(key, JSON.stringify(stored));
    });
    await page.reload();
    await page.locator(".product-shell").waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:policy-studio:v1")), null);

    const isolated = await context.newPage();
    await configure(isolated);
    await isolated.goto(`http://127.0.0.1:${port}/`);
    assert.equal(await isolated.locator('[data-customer="2002"]').getAttribute("aria-pressed"), "true");
    assert.doesNotMatch(await isolated.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    await isolated.close();

    expireNext = true;
    await page.locator('[data-case-tab="evidence"]').click();
    await page.locator("#generateReviewRationale").click();
    await page.getByText(/session expired/i).waitFor();
    assert.match(await page.evaluate(() => sessionStorage.getItem("customer-review:product:v1")), /Persisted grounded rationale/);
    await page.locator("#loginPassword").fill("approved-demo-password");
    await page.locator("#loginForm button[type=submit]").click();
    await page.getByText("Persisted grounded rationale").waitFor();
    await page.evaluate(() => {
      const key = "customer-review:product:v1";
      const product = JSON.parse(sessionStorage.getItem(key));
      product.reviewExplanations[Object.keys(product.reviewExplanations)[0]] = { rationale: { summary: "<img src=x onerror=alert(1)>" } };
      sessionStorage.setItem(key, JSON.stringify(product));
    });
    await page.reload();
    await page.locator('[data-case-panel="evidence"]:not(.hidden)').waitFor();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /onerror|Persisted grounded rationale/);

    await page.evaluate(state => {
      sessionStorage.setItem("customer-review:policy-studio:v1", JSON.stringify(state));
      const productKey = "customer-review:product:v1";
      const product = JSON.parse(sessionStorage.getItem(productKey));
      product.reviewCases["2002"] = { ...product.reviewCases["2002"], status: "COMPLETED", draft: { status: "OVERRIDDEN", action: "NEED_TO_RESTRICT", reason: "Legacy release decision." } };
      product.reviewExplanations = { legacy: { rationale: { summary: "Legacy release rationale", points: [] }, evidenceResults: [], toolTrace: { eligible: [], called: [] } } };
      sessionStorage.setItem(productKey, JSON.stringify(product));
      sessionStorage.setItem("customer-review:dispositions:v1", JSON.stringify({ "2002::credit-1.5.0": { status: "OVERRIDDEN", customerNumber: 2002, releaseId: "credit-1.5.0", evaluationRefs: ["credit-1.5.0/HIGH_BALANCE_ADP_MAX@3"], deterministicAction: "NEED_CREDIT_MANAGER_REVIEW", action: "NEED_TO_RESTRICT", reason: "Legacy release decision." } }));
    }, legacyActivatedStudioState());
    await page.reload();
    await page.locator(".product-shell").waitFor({ state: "visible" });
    assert.equal((await page.locator("#topbarRelease").textContent()).trim(), "credit-1.4.0");
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "In review");
    assert.doesNotMatch(await page.locator("#dispositionOutput").textContent(), /Recommendation accepted|Recommendation replaced|Legacy release decision/);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:policy-studio:v1")), null);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:dispositions:v1")), null);
    assert.deepEqual(await page.evaluate(() => {
      const product = JSON.parse(sessionStorage.getItem("customer-review:product:v1"));
      return { status: product.reviewCases["2002"].status, explanations: product.reviewExplanations };
    }), { status: "IN_REVIEW", explanations: {} });

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#resetButton").click();
    assert.equal(await page.locator('[data-customer="2002"]').getAttribute("aria-pressed"), "true");
    assert.equal((await page.locator("#caseStatus").textContent()).trim(), "In review");
    assert.doesNotMatch(await page.evaluate(() => sessionStorage.getItem("customer-review:product:v1")), /Persisted grounded rationale/);

    await page.locator('[data-view="studio"]').click();
    await page.reload();
    await page.locator("#studioView").waitFor({ state: "visible" });
    assert.equal(await page.locator("#studioView").isVisible(), true);
    await page.locator("#logoutButton").click();
    await page.locator("#accessGate:not(.hidden)").waitFor();
    assert.deepEqual(await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("customer-review:"))), []);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
    await Promise.race([once(vite, "exit"), new Promise(resolve => setTimeout(resolve, 2_000))]);
    vite.stdout.destroy();
    vite.stderr.destroy();
  }
});

test("a static asset host with no session API unlocks deterministic-only mode", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator("#actionTitle").waitFor();
    assert.equal(await page.locator("#accessGate").getAttribute("class"), "access-gate hidden");
    assert.match(await page.locator("#aiStatus").textContent(), /AI features disabled/);
    assert.equal(await page.locator("#generateReviewRationale").isDisabled(), true);
    await page.locator('[data-view="studio"]').click();
    assert.equal(await page.locator("#generatePrompt").isHidden(), true);
    assert.equal(await page.locator("#simulateResponse").isVisible(), true);
    assert.match(await page.locator("#policyAiMode").textContent(), /no model response is simulated/i);
    assert.match(await page.locator("#policyDiff").textContent(), /Unchanged scope.*8%.*5%/s);
    assert.match(await page.locator("#evidenceSpine").textContent(), /1\. Validation.*2\. Compatibility.*3\. Review impact/s);
    const initialRevision = (await page.locator("#policyWorkbenchMeta").textContent()).trim();
    await page.locator("#simulateResponse").click();
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), initialRevision);
    assert.equal(await page.locator(".evidence-history").count(), 0);
    const originalSource = await page.locator("#dslInput").inputValue();
    await page.locator("#dslInput").fill(`${originalSource}\n# unapplied source edit`);
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.match(await page.locator("#dslInput").inputValue(), /unapplied source edit/);
    assert.equal((await page.locator("#policyWorkbenchMeta").textContent()).trim(), initialRevision);
    assert.equal(await page.locator(".evidence-history").count(), 0);
    await page.locator('[data-scenario="ratio5"]').click();
    assert.match(await page.locator("#dslInput").inputValue(), /unapplied source edit/);
    await page.locator('[data-scenario="adp20"]').click();
    assert.equal(await page.locator('[data-scenario="ratio5"]').getAttribute("aria-pressed"), "true");
    assert.match(await page.locator("#dslInput").inputValue(), /unapplied source edit/);
    await page.locator("#editorSection summary").click();
    await page.locator("#dslInput").fill(originalSource);
    await page.locator("#policyInput").fill("Unapplied intent that must not be lost");
    await page.locator('[data-scenario="adp20"]').click();
    assert.equal(await page.locator('[data-scenario="ratio5"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#policyInput").inputValue(), "Unapplied intent that must not be lost");
    page.once("dialog", dialog => dialog.accept());
    await page.locator('[data-scenario="adp20"]').click();
    assert.equal(await page.locator('[data-scenario="adp20"]').getAttribute("aria-pressed"), "true");
    assert.match(await page.locator("#policyDiff").textContent(), /Unchanged scope.*25 DAYS.*20 DAYS/s);
    await page.locator("#editorSection summary").click();
    await page.locator("#dslInput").fill("RULE HIGH_BALANCE_ADP_MAX\nSCOPE customer.ar_balance > 100000 USD\n      AND customer.restricted_status == \"N\"\nSET_MAX customer.adp_days = 20 DAYS\nEND");
    await page.locator("#applySourceEdit").click();
    assert.match(await page.locator("#policyDiff").textContent(), /Unchanged scope.*25 DAYS.*20 DAYS/s);
    assert.equal(await page.locator('.scenario[aria-pressed="true"]').count(), 0);
    assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem("customer-review:policy-studio:v1")).selected), null);
    for (const width of [1280, 900, 390]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true, `no page overflow at ${width}px`);
    }
    await page.locator("#dslInput").fill(formatRule(scenarios.ratio5.ast, { root: "customer" }));
    await page.locator("#applySourceEdit").click();
    assert.match(await page.locator("#policyDiff").textContent(), /Candidate diff unavailable.*RULE_ID_MISMATCH.*Expected stable ID HIGH_BALANCE_ADP_MAX; received NET30_PAST_DUE_MAX/s);
    assert.equal(await page.locator("#policyDiff .structured-diff").count(), 0);
    await page.locator("#validateButton").click();
    assert.match(await page.locator("#resultSection").textContent(), /Deterministic validation blocked.*RULE_ID_MISMATCH.*Expected stable ID HIGH_BALANCE_ADP_MAX; received NET30_PAST_DUE_MAX/s);
    await page.locator("#browseActivePolicy").click();
    assert.equal(await page.getByRole("dialog").getByText(/Active Policy Version credit-1\.4\.0/).count(), 1);
    assert.match(await page.getByRole("dialog").textContent(), /High-balance payment limit.*Scope.*Restricted status is No and AR balance is greater than \$100,000.*Finding when.*Average days to pay is greater than 25 days.*Constraint.*Maximum 25 days.*Supporting facts/s);
    await page.locator(".dialog-close").click();
    await page.locator("#browseFactCatalog").click();
    await page.getByRole("dialog").getByRole("button", { name: /Payment terms/ }).click();
    assert.match(await page.getByRole("dialog").textContent(), /Payment terms.*customer\.payment_terms/s);
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
    await Promise.race([once(vite, "exit"), new Promise(resolve => setTimeout(resolve, 2_000))]);
    vite.stdout.destroy();
    vite.stderr.destroy();
  }
});

test("unattended browser flows preserve semantics, accessibility, terminal states, and escaped output", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 900 } });
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated: true, modelDisplayName: "GitHub Copilot (gpt-5.4)" } }));
    let explanationCall = 0;
    await page.route("**/api/ai/explain_review", route => {
      explanationCall += 1;
      if (explanationCall === 1) return route.fulfill({ status: 504, json: { error: { code: "PROVIDER_TIMEOUT", message: "Request could not be completed", retryable: true, correlationId: "safe-test-id" } } });
      if (explanationCall === 2) return route.fulfill({ json: { schemaVersion: "1", operation: "explain_review", result: {} } });
      return route.fulfill({ json: { schemaVersion: "1", operation: "explain_review", result: { rationale: { status: "EXPLAINED", summary: "<img src=x onerror=alert(1)>", points: [{ text: "<script>unsafe()</script>", references: ["fact:2002/past_due_amount"] }] }, evidenceResults: [], toolTrace: { eligible: ["get_payment_history", "get_open_disputes"], called: [] } } } });
    });
    await page.route("**/api/ai/draft_rule", async route => {
      const body = route.request().postDataJSON();
      if (body.policyText.includes("timeout")) return route.fulfill({ status: 504, json: { error: { code: "PROVIDER_TIMEOUT", message: "Draft request timed out", retryable: true, correlationId: "policy-draft-timeout" } } });
      if (body.policyText.includes("clarify")) return route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: { outcome: "NEEDS_CLARIFICATION", question: "Which supported threshold should change?", missingFields: ["threshold"] } } });
      if (body.policyText.includes("unsupported")) return route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: { outcome: "UNSUPPORTED", summary: "This intent is outside the two supported policy families." } } });
      if (body.policyText.includes("high-balance switch")) return route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: { outcome: "CANDIDATE", family: "HIGH_BALANCE_ADP_MAX", summary: "Bounded high-balance candidate.", dsl: "RULE HIGH_BALANCE_ADP_MAX\nSCOPE customer.restricted_status == \"N\"\n      AND customer.ar_balance > 100000 USD\nSET_MAX customer.adp_days = 20 DAYS\nEND" } } });
      if (body.policyText.includes("slow draft")) await new Promise(resolve => setTimeout(resolve, 200));
      const ratio = body.policyText.includes("15%") ? "0.15" : body.policyText.includes("9%") ? "0.09" : body.policyText.includes("8%") ? "0.08" : "0.05";
      await route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Bounded candidate.", dsl: `RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == "NET_30"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = ${ratio}\nEND` } } });
    });
    let policyExplanationCall = 0;
    await page.route("**/api/ai/explain_policy_analysis", route => {
      policyExplanationCall += 1;
      const request = route.request().postDataJSON();
      if (policyExplanationCall === 1) return route.fulfill({ json: { schemaVersion: "1", operation: "explain_policy_analysis", result: { summary: "Grounded policy evidence summary", points: [{ text: "Three fictional cohort records newly require review.", references: [request.evidenceRefs[1]] }] } } });
      return route.fulfill({ json: { schemaVersion: "1", operation: "explain_policy_analysis", result: {} } });
    });
    await page.goto(`http://127.0.0.1:${port}/`);

    const expected = new Map([[2001, "Auto review pass"], [2002, "Credit manager review"], [2003, "Request updated financial statements"], [2004, "Restrict customer"]]);
    for (const [customer, action] of expected) {
      await page.locator(`[data-customer="${customer}"]`).click();
      assert.equal(await page.locator("#actionTitle").textContent(), action);
    }
    const reviewLayout = await page.evaluate(() => {
      const queue = document.querySelector(".queue-panel").getBoundingClientRect();
      const caseWorkspace = document.querySelector("#caseWorkspace").getBoundingClientRect();
      return { queueTop: queue.top, queueBottom: queue.bottom, caseTop: caseWorkspace.top };
    });
    assert.equal(reviewLayout.queueTop < reviewLayout.caseTop && reviewLayout.queueBottom <= reviewLayout.caseTop, true);

    await page.locator('[data-view="studio"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#studioView").isVisible(), true);
    await page.locator('[data-view="review"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#reviewView").isVisible(), true);
    await page.locator('[data-case-tab="overview"]').focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.locator('[data-case-tab="findings"]').getAttribute("aria-selected"), "true");
    assert.equal(await page.locator('[data-case-panel="findings"]').isVisible(), true);
    await page.locator('[data-case-tab="overview"]').click();

    await page.locator('[data-customer="2002"]').click();
    await page.locator('[data-case-tab="evidence"]').click();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("AI rationale unavailable.").waitFor();
    assert.equal(await page.locator("#actionTitle").textContent(), "Credit manager review");
    await page.locator("#generateReviewRationale").click();
    await page.getByText("AI rationale unavailable.").waitFor();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("<img src=x onerror=alert(1)>").waitFor();
    assert.equal(await page.locator("#aiPlaceholder img, #aiPlaceholder script").count(), 0);

    await page.locator('[data-view="studio"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
    await page.locator('[data-scenario="ratio15"]').click();
    await page.locator("#generatePrompt").click();
    await page.getByText(/AI-drafted candidate/).waitFor();
    assert.equal(await page.locator('[data-scenario="ratio15"]').getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator('[data-scenario="ratio5"]').getAttribute("aria-pressed"), "false");
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /Conflict/);
    assert.equal(await page.locator("#runBatch").isDisabled(), true);

    page.once("dialog", dialog => dialog.accept());
    await page.locator('[data-scenario="ratio5"]').click();
    await page.locator("#generatePrompt").click();
    await page.getByText(/AI-drafted candidate/).waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    await page.locator("#runBatch").click();
    assert.match(await page.locator("#resultSection").textContent(), /Evidence complete/);
    const unchangedDraftResponse = page.waitForResponse(response => response.url().endsWith("/api/ai/draft_rule"));
    await page.locator("#generatePrompt").click();
    await unchangedDraftResponse;
    await page.waitForFunction(() => !document.querySelector("#generatePrompt").disabled);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Evidence complete");
    assert.match(await page.locator("#policyWorkbenchMeta").textContent(), /candidate revision 5/);
    assert.match(await page.locator("#resultSection").textContent(), /3 additional records require review/);
    const impactRecordIds = await page.locator(".batch-record").evaluateAll(buttons => buttons.map(button => button.dataset.impactRecord));
    assert.deepEqual(impactRecordIds.slice(0, 3), ["3003", "3004", "3005"]);
    assert.equal(impactRecordIds.length, 12);
    assert.equal(new Set(impactRecordIds).size, 12);
    assert.ok(impactRecordIds.includes("3001"));
    await page.locator('[data-impact-record="3001"]').click();
    const dryRunDialog = await page.getByRole("dialog").textContent();
    assert.match(dryRunDialog, /Impact NET30 4%.*Fictional boundary record · Customer 3001.*4\.0% past-due ratio.*Policy-relevant facts.*Payment terms.*NET 30.*AR balance.*\$100,000.*Past due amount.*\$4,000/s);
    assert.match(dryRunDialog, /Dry-run outcome.*Active policy.*Candidate policy/s);
    assert.match(dryRunDialog, /Maximum 8% past due.*Maximum 5% past due.*Within threshold/s);
    assert.match(dryRunDialog, /Auto review pass.*Candidate impact: The candidate produces no change/s);
    assert.match(dryRunDialog, /All input facts.*Technical fixture details/s);
    await page.locator(".dialog-close").click();
    await page.locator("#generatePolicyExplanation").click();
    await page.getByText("Grounded policy evidence summary").waitFor();

    for (const [intent, outcome] of [["timeout while drafting", /Draft unavailable.*Draft request timed out/s], ["clarify this policy intent", /NEEDS CLARIFICATION.*Which supported threshold should change/s], ["unsupported policy intent", /UNSUPPORTED.*outside the two supported policy families/s]]) {
      await page.locator("#policyInput").fill(intent);
      await page.locator("#generatePrompt").click();
      await page.getByText(outcome).waitFor();
      assert.equal((await page.locator("#candidateState").textContent()).trim(), "Evidence complete");
      assert.match(await page.locator("#resultSection").textContent(), /3 additional records require review/);
    }

    await page.locator("#policyInput").fill("slow draft for a 15% maximum");
    await page.locator("#generatePrompt").click();
    assert.equal(await page.locator("#generatePrompt").isDisabled(), true);
    await page.locator("#policyInput").fill("For NET 30 customers, set maximum past due to 8% of AR balance.");
    assert.equal(await page.locator("#generatePrompt").isEnabled(), true);
    assert.match(await page.locator("#promptSection").textContent(), /Draft outdated.*Intent or source changed while drafting/s);
    assert.equal(await page.locator("#promptSection .ai-loading").count(), 0);
    await page.waitForTimeout(250);
    assert.equal(await page.locator("#generatePrompt").isEnabled(), true);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Evidence complete");
    assert.match(await page.locator("#dslInput").inputValue(), /= 0\.05/);
    await page.locator("#generatePrompt").click();
    await page.getByText("Stable ID NET30_PAST_DUE_MAX · candidate revision 6", { exact: true }).waitFor();
    assert.equal(await page.locator('.scenario[aria-pressed="true"]').count(), 0);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Draft");
    assert.match(await page.locator("#evidenceSpine").textContent(), /Stale evidence snapshots.*candidate revision 5.*credit-1\.4\.0/s);
    assert.match(await page.locator("#evidenceSpine").textContent(), /Stale generated summaries.*Grounded policy evidence summary/s);
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.equal(await page.locator('.scenario[aria-pressed="true"]').count(), 0);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Draft");
    assert.match(await page.locator("#evidenceSpine").textContent(), /Stale evidence snapshots.*Stale generated summaries/s);
    await page.locator("#openValidation").click();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /REDUNDANT/);

    await page.locator("#policyInput").fill("For NET 30 customers, set maximum past due to 9% of AR balance.");
    await page.locator("#generatePrompt").click();
    await page.getByText("Stable ID NET30_PAST_DUE_MAX · candidate revision 7", { exact: true }).waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /Compatible relaxation/);
    assert.equal(await page.locator("#runBatch").isEnabled(), true);
    await page.locator("#runBatch").click();
    await page.locator("#generatePolicyExplanation").click();
    await page.getByText("Summary unavailable").waitFor();
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Evidence complete");
    assert.match(await page.locator("#resultSection").textContent(), /1 records no longer require review/);

    await page.locator("#dslInput").fill("RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == \"NET_30\"\nEND");
    await page.locator("#applySourceEdit").click();
    await page.locator("#validateButton").click();
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Validation blocked");
    assert.match(await page.locator("#evidenceSpine").textContent(), /Blocked.*Fix validation issues and validate a new revision first/s);

    await page.locator("#dslInput").fill("RULE NET30_PAST_DUE_MAX\nSCOPE ALL\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.07\nEND");
    await page.locator("#applySourceEdit").click();
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Draft");
    assert.match(await page.locator("#evidenceSpine").textContent(), /Not run.*Not run · prerequisite unmet.*Not run · prerequisite unmet/s);
    await page.locator("#validateButton").click();
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Validation blocked");
    assert.match(await page.locator("#resultSection").textContent(), /does not match its supported policy family/);
    assert.match(await page.locator("#evidenceSpine").textContent(), /Blocked.*does not match its supported policy family.*Not run · prerequisite unmet.*Not run · prerequisite unmet/s);

    await page.locator("#policyInput").fill("slow draft for a 15% maximum");
    await page.locator("#generatePrompt").click();
    await page.locator("#dslInput").fill("RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == \"NET_30\"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.06\nEND");
    await page.locator("#applySourceEdit").click();
    await page.waitForTimeout(250);
    assert.match(await page.locator("#dslInput").inputValue(), /= 0\.06/);
    assert.match(await page.locator("#candidateProvenance").textContent(), /Human-edited candidate/);
    assert.equal((await page.locator("#candidateState").textContent()).trim(), "Draft");

    await page.locator("#policyInput").fill("high-balance switch");
    await page.locator("#generatePrompt").click();
    await page.getByText(/Stable ID HIGH_BALANCE_ADP_MAX/).waitFor();
    assert.equal(await page.locator(".evidence-history").count(), 0);
    assert.match(await page.locator("#evidenceSpine").textContent(), /Not run.*Not run · prerequisite unmet.*Not run · prerequisite unmet/s);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
    await Promise.race([once(vite, "exit"), new Promise(resolve => setTimeout(resolve, 2_000))]);
    vite.stdout.destroy();
    vite.stderr.destroy();
  }
});
