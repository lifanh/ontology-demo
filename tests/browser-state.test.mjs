import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { test } from "node:test";
import { chromium } from "playwright-chromium";

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

test("tab product state is keyed, reloadable, isolated, resettable, and preserved through re-authentication", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  let authenticated = true, expireNext = false;
  const configure = async page => {
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated, modelDisplayName: "GPT-5.6 Luna" } }));
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
      return route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: adp
        ? { outcome: "CANDIDATE", family: "HIGH_BALANCE_ADP_MAX", summary: "Lower the ADP threshold.", dsl: "RULE HIGH_BALANCE_ADP_MAX\nSCOPE customer.restricted_status == \"N\"\n      AND customer.ar_balance > 100000 USD\nSET_MAX customer.adp_days = 20 DAYS\nEND" }
        : { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Lower the threshold.", dsl: "RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == \"NET_30\"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.05\nEND" } } });
    });
    await page.route("**/api/login", route => { authenticated = true; return route.fulfill({ json: { authenticated: true, expiresInSeconds: 28800 } }); });
    await page.route("**/api/logout", route => { authenticated = false; return route.fulfill({ json: { authenticated: false } }); });
  };
  try {
    const page = await context.newPage();
    await configure(page);
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator('[data-customer="2002"]').click();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("Persisted grounded rationale").waitFor();
    await page.reload();
    await page.getByText("Persisted grounded rationale").waitFor();
    assert.equal(await page.locator('[data-customer="2002"]').getAttribute("aria-pressed"), "true");

    await page.locator('[data-customer="2001"]').click();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    await page.locator('[data-customer="2002"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();
    await page.locator('input[name="reviewDisposition"][value="ACCEPTED"]').check();
    await page.locator("#saveReviewDisposition").click();
    await page.getByText(/^Accepted/).waitFor();

    await page.locator('[data-customer="2001"]').click();
    await page.locator('input[name="reviewDisposition"][value="OVERRIDDEN"]').check();
    await page.locator("#reviewOverrideReason").fill("A documented exception for this test.");
    await page.locator("#saveReviewDisposition").click();
    await page.locator('[data-customer="2002"]').click();

    await page.locator('[data-view="studio"]').click();
    assert.equal((await page.locator("#sessionOverrideCount").textContent()).trim(), "0 associated overrides");
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    await page.locator("#runBatch").click();
    await page.locator("#activateRelease").click();
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.equal(await page.locator("#releaseSelector").inputValue(), "credit-1.5.0");
    await page.locator('[data-view="review"]').click();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    assert.match(await page.locator("#dispositionOutput").textContent(), /No Disposition recorded/);

    await page.locator('[data-view="studio"]').click();
    await page.locator("#releaseSelector").selectOption("credit-1.4.0");
    await page.locator('[data-view="review"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();
    assert.match(await page.locator("#dispositionOutput").textContent(), /Accepted/);
    await page.locator('[data-view="studio"]').click();
    await page.locator("#releaseSelector").selectOption("credit-1.5.0");
    await page.locator('[data-view="review"]').click();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    assert.match(await page.locator("#dispositionOutput").textContent(), /No Disposition recorded/);
    await page.locator('[data-view="studio"]').click();
    await page.locator("#releaseSelector").selectOption("credit-1.4.0");
    await page.locator('[data-view="review"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();

    await page.locator('[data-view="studio"]').click();
    await page.locator('[data-scenario="adp20"]').click();
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    await page.locator("#runBatch").click();
    await page.locator("#activateRelease").click();
    await page.reload();
    await page.locator("#studioView:not(.hidden)").waitFor();
    assert.equal(await page.locator("#releaseSelector").inputValue(), "credit-1.6.0");
    await page.locator("#releaseSelector").selectOption("credit-1.4.0");
    await page.locator('[data-view="review"]').click();
    await page.getByText("Persisted grounded rationale").waitFor();

    const isolated = await context.newPage();
    await configure(isolated);
    await isolated.goto(`http://127.0.0.1:${port}/`);
    assert.equal(await isolated.locator('[data-customer="2001"]').getAttribute("aria-pressed"), "true");
    assert.doesNotMatch(await isolated.locator("#aiPlaceholder").textContent(), /Persisted grounded rationale/);
    await isolated.close();

    expireNext = true;
    await page.locator("#generateReviewRationale").click();
    await page.getByText(/demo session expired/i).waitFor();
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
    await page.locator("#actionTitle").waitFor();
    assert.doesNotMatch(await page.locator("#aiPlaceholder").textContent(), /onerror|Persisted grounded rationale/);

    page.once("dialog", dialog => dialog.accept());
    await page.locator("#resetButton").click();
    assert.equal(await page.locator('[data-customer="2001"]').getAttribute("aria-pressed"), "true");
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
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/`);
    await page.locator("#actionTitle").waitFor();
    assert.equal(await page.locator("#accessGate").getAttribute("class"), "access-gate hidden");
    assert.match(await page.locator("#aiStatus").textContent(), /AI features disabled/);
    assert.equal(await page.locator("#generateReviewRationale").isDisabled(), true);
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
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated: true, modelDisplayName: "GPT-5.6 Luna" } }));
    let explanationCall = 0;
    await page.route("**/api/ai/explain_review", route => {
      explanationCall += 1;
      if (explanationCall === 1) return route.fulfill({ status: 504, json: { error: { code: "PROVIDER_TIMEOUT", message: "Request could not be completed", retryable: true, correlationId: "safe-test-id" } } });
      if (explanationCall === 2) return route.fulfill({ json: { schemaVersion: "1", operation: "explain_review", result: {} } });
      return route.fulfill({ json: { schemaVersion: "1", operation: "explain_review", result: { rationale: { status: "EXPLAINED", summary: "<img src=x onerror=alert(1)>", points: [{ text: "<script>unsafe()</script>", references: ["fact:2002/past_due_amount"] }] }, evidenceResults: [], toolTrace: { eligible: ["get_payment_history", "get_open_disputes"], called: [] } } } });
    });
    await page.route("**/api/ai/draft_rule", async route => {
      const body = route.request().postDataJSON();
      const ratio = body.policyText.includes("15%") ? "0.15" : body.policyText.includes("9%") ? "0.09" : body.policyText.includes("8%") ? "0.08" : "0.05";
      await route.fulfill({ json: { schemaVersion: "1", operation: "draft_rule", result: { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Bounded candidate.", dsl: `RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == "NET_30"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = ${ratio}\nEND` } } });
    });
    await page.goto(`http://127.0.0.1:${port}/`);

    const expected = new Map([[2001, "Auto review pass"], [2002, "Credit manager review"], [2003, "Request updated financial statements"], [2004, "Restrict customer"]]);
    for (const [customer, action] of expected) {
      await page.locator(`[data-customer="${customer}"]`).click();
      assert.equal(await page.locator("#actionTitle").textContent(), action);
    }
    const positions = await page.locator(".selector-stage, .action-stage, .traces-stage, .ai-stage, .disposition-stage, .calculator-stage").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().top));
    assert.equal(positions.every((value, index) => index === 0 || value > positions[index - 1]), true);

    await page.locator('[data-view="studio"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#studioView").isVisible(), true);
    await page.locator('[data-view="review"]').focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#reviewView").isVisible(), true);

    await page.locator('[data-customer="2002"]').click();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("AI rationale unavailable.").waitFor();
    assert.equal(await page.locator("#actionTitle").textContent(), "Credit manager review");
    await page.locator("#generateReviewRationale").click();
    await page.getByText("AI rationale unavailable.").waitFor();
    await page.locator("#generateReviewRationale").click();
    await page.getByText("<img src=x onerror=alert(1)>").waitFor();
    assert.equal(await page.locator("#aiPlaceholder img, #aiPlaceholder script").count(), 0);

    await page.locator('[data-view="studio"]').click();
    await page.locator('[data-scenario="ratio15"]').click();
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /CONFLICT/);
    assert.equal(await page.locator("#runBatch").isDisabled(), true);
    assert.equal(await page.locator("#activateRelease").isDisabled(), true);

    await page.locator('[data-scenario="ratio5"]').click();
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    await page.locator("#runBatch").click();
    assert.match(await page.locator("#resultSection").textContent(), /BATCH PASSED/);
    assert.equal(await page.locator("#activateRelease").isEnabled(), true);

    await page.locator("#policyInput").fill("For NET 30 customers, set maximum past due to 8% of AR balance.");
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /REDUNDANT/);

    await page.locator("#policyInput").fill("For NET 30 customers, set maximum past due to 9% of AR balance.");
    await page.locator("#generatePrompt").click();
    await page.locator("#editorSection:not(.hidden)").waitFor();
    await page.locator("#validateButton").click();
    await page.locator("#analyzeEvidence").click();
    assert.match(await page.locator("#resultSection").textContent(), /COMPATIBLE RELAXATION/);
    assert.equal(await page.locator("#runBatch").isEnabled(), true);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
    await Promise.race([once(vite, "exit"), new Promise(resolve => setTimeout(resolve, 2_000))]);
    vite.stdout.destroy();
    vite.stderr.destroy();
  }
});
