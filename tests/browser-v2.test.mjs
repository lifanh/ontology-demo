import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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

test("v2 session gate unlocks the shell before loading protected app modules", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    let authenticated = false;
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated, modelDisplayName: "GitHub Copilot (test)" } }));
    await page.route("**/api/login", async route => {
      assert.deepEqual(route.request().postDataJSON(), { password: "approved-demo-password" });
      authenticated = true;
      return route.fulfill({ json: { authenticated: true, expiresInSeconds: 28800 } });
    });

    await page.goto(`http://127.0.0.1:${port}/v2/`);
    await page.waitForSelector("#accessGate:not(.hidden)");
    assert.equal(await page.locator("#list .row").count(), 0, "the app module must not load before authentication");
    await page.fill("#loginPassword", "approved-demo-password");
    await page.click('#loginForm button[type="submit"]');
    await page.waitForSelector("#list .row");
    assert.equal(await page.locator("#accessGate").getAttribute("class"), "access-gate hidden");
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  }
});

test("v2 worklist and detail are driven by the shared deterministic engine", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);

    // Worklist rows come from narrativeCustomers, not prototype data.
    await page.waitForSelector("#list .row");
    await page.click('[data-tab="all"]');
    const listText = await page.textContent("#list");
    for (const name of ["Northwind Components", "Cascade Freight", "Meridian Industrial", "Ironclad Manufacturing"]) {
      assert.ok(listText.includes(name), `worklist should include ${name}`);
    }
    assert.ok(!listText.includes("Vantage"), "prototype personas must be gone");
    assert.equal(await page.getByRole("button", { name: "Configure rules" }).isDisabled(), true);

    // Filters without backing data are visibly unavailable rather than silently ignored.
    assert.equal(await page.locator("#filterbar input:disabled, #filterbar select:disabled").count(), 7);
    assert.equal(await page.locator("#fCust").isDisabled(), false);
    assert.equal(await page.locator("#fStatus").isDisabled(), false);

    // Global reference controls cannot imply unsupported filtering or currency conversion.
    await page.click("#vw-global");
    assert.equal(await page.locator("#globalWrap .gv-reference input").count(), 0);
    assert.match(await page.locator("#globalWrap .gv-reference").textContent(), /Narrative accounts · 2001–2004/);
    assert.equal(await page.locator("#globalWrap .ccy button").count(), 0);
    assert.equal(await page.locator("#globalWrap .ccy-value").textContent(), "USD only");
    await page.click("#vw-region");

    // Tab counts from engine outcomes: 3 pending decisions, 1 auto-cleared, 0 completed.
    assert.equal(await page.textContent('[data-tab="mine"] .n'), "3");
    assert.equal(await page.textContent('[data-tab="auto"] .n'), "1");
    assert.equal(await page.textContent('[data-tab="done"] .n'), "0");

    // Ironclad detail: calculator recommendation and exact rule evaluation references.
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    const banner = await page.textContent("#detailBody .dbanner");
    assert.ok(banner.includes("$75,000"), "banner should show the deterministic recommended limit");
    assert.ok(banner.includes("Restrict customer"), "banner should show the proposed action");
    assert.equal(await page.getByRole("button", { name: "Export unavailable" }).isDisabled(), true);
    const rules = await page.textContent("#sec-rules");
    assert.ok(rules.includes("credit-1.4.0/CRITICAL_RESTRICTION@1"), "rules table should cite the evaluator's evaluationRef");
    assert.ok(rules.includes("CRITICAL_RESTRICTION_TRIGGER"), "rules table should cite the reason code");
    assert.ok((await page.textContent("#sec-ai")).includes("no model call"), "proposal must be labeled as scripted");
    assert.match(await page.textContent(".implied"), /\$90,000\/mo × 45d \/ 30 = \$135,000 term exposure; × 1\.10 buffer = \$148,500 demand basis/);

    // Snapshot ontology facts expose their definition, provenance, and exact trace destinations.
    await page.click('[data-fact="past_due_ratio"]');
    await page.waitForSelector("#factDialog[open]");
    const factReference = await page.textContent("#factDialog");
    assert.match(factReference, /fact:2004\/past_due_ratio/);
    assert.match(factReference, /Type\s*decimal/);
    assert.match(factReference, /Unit\s*unitless/);
    assert.match(factReference, /Deterministically derived in this browser/);
    assert.match(factReference, /credit-1\.4\.0\/CRITICAL_RESTRICTION@1/);
    await page.click("#factDialog .dialog-close");

    // Financial-summary period follows the fictional statement attachment for each account.
    await page.click("#crumb a");
    await page.click('#list .row:has-text("Meridian") .open-btn');
    const financialSummary = await page.textContent("#sec-fs");
    assert.match(financialSummary, /Fiscal year\s*FY 2024 \(fictional\)/);
    assert.doesNotMatch(financialSummary, /Fiscal year\s*FY 2025/);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  }
});

test("v2 decisions persist per release, stay isolated from v1, and auto-clear is view only", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);
    await page.waitForSelector("#list .row");

    // Auto-cleared record has no decision controls.
    await page.click('[data-tab="auto"]');
    await page.click('#list .row:has-text("Northwind") .open-btn');
    await page.waitForSelector(".actzone");
    assert.ok(await page.isVisible('button:has-text("View only (auto-cleared)")'));
    assert.equal(await page.locator('[data-act="confirm"]').count(), 0);
    const autoProposal = await page.textContent("#sec-ai");
    assert.match(autoProposal, /All applicable policy rules pass/);
    assert.doesNotMatch(autoProposal, /All 6 active policy rules pass/);
    assert.equal(await page.locator(".rerun").isDisabled(), true);
    assert.equal(await page.locator('[data-act="rerun"]').count(), 0);
    const autoHistory = await page.textContent("#sec-hist");
    assert.match(autoHistory, /J\. Kim.*Analyst approved routine increase after deterministic review pass/s);
    assert.doesNotMatch(autoHistory, /System.*Auto review pass/s);
    await page.click("#crumb a");

    // Confirm the AI proposal on Ironclad.
    await page.click('[data-tab="mine"]');
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    for (const field of ["#proposedCreditLimit", "#proposedTerms", "#proposedNextReview"]) {
      assert.equal(await page.locator(field).isDisabled(), true, `${field} should be view-only until adjusted values can be persisted`);
    }
    await page.click('[data-act="confirm"]');
    await page.waitForSelector('[data-act="reopen"]');
    assert.ok((await page.textContent(".actzone")).includes("AI proposal confirmed"));
    assert.match(await page.textContent("#sec-hist"), /Decision recorded.*confirmed proposed result.*Restrict customer/s);

    // Storage is prefixed for v2 and untouched for v1.
    const keys = await page.evaluate(() => ({
      v2: sessionStorage.getItem("v2:customer-review:dispositions:v1"),
      history: sessionStorage.getItem("v2:customer-review:history:v1"),
      v1: sessionStorage.getItem("customer-review:dispositions:v1")
    }));
    assert.ok(keys.v2.includes('"deterministicAction":"NEED_TO_RESTRICT"'));
    assert.ok(keys.history.includes('"kind":"DECISION_RECORDED"'));
    assert.equal(keys.v1, null);

    // Decision survives reload and moves the record to Completed.
    await page.reload();
    await page.waitForSelector("#list .row");
    assert.equal(await page.textContent('[data-tab="done"] .n'), "1");
    assert.equal(await page.textContent('[data-tab="mine"] .n'), "2");
    await page.click('[data-tab="done"]');
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    await page.waitForSelector('[data-act="reopen"]');
    assert.match(await page.textContent("#sec-hist"), /Decision recorded.*current-tab state only/s);

    // Reopen restores the pending decision.
    await page.click('[data-act="reopen"]');
    await page.waitForSelector('[data-act="confirm"]');
    assert.match(await page.textContent("#sec-hist"), /Review reopened.*Restrict customer/s);

    // Override shortcuts require rationale written for the replacement result.
    assert.equal(await page.inputValue("#commentary"), "");
    await page.click('[data-act="override"][data-action="NEED_CREDIT_MANAGER_REVIEW"]');
    assert.ok((await page.textContent("#decisionMsg")).includes("10–500 characters"));

    // Opening adjustment controls preserves rationale already entered by the analyst.
    const draftReason = "Escalating to the credit manager while the account plan is reviewed.";
    await page.fill("#commentary", draftReason);
    await page.click('[data-act="adjust-open"]');
    assert.equal(await page.inputValue("#commentary"), draftReason);

    // Adjust & confirm records an override with a validated reason.
    await page.selectOption("#adjAction", "NEED_CREDIT_MANAGER_REVIEW");
    await page.fill("#commentary", "short");
    await page.click('[data-act="adjust-confirm"]');
    assert.ok((await page.textContent("#decisionMsg")).includes("10–500 characters"), "short reasons are rejected by the shared store");
    await page.fill("#commentary", "Escalating to the credit manager for a workout plan before restricting.");
    await page.click('[data-act="adjust-confirm"]');
    await page.waitForSelector('[data-act="reopen"]');
    const zone = await page.textContent(".actzone");
    assert.ok(zone.includes("adjusted result recorded"));
    assert.ok(zone.includes("Credit manager review"));
    assert.match(await page.textContent("#sec-hist"), /Decision recorded.*recorded adjusted result.*Credit manager review/s);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  }
});
