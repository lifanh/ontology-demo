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
    let draftRequests = 0;
    await page.route("**/api/session", route => route.fulfill({ json: { mode: "ai", aiEnabled: true, authenticated, modelDisplayName: "GitHub Copilot (test)" } }));
    await page.route("**/api/login", async route => {
      assert.deepEqual(route.request().postDataJSON(), { password: "approved-demo-password" });
      authenticated = true;
      return route.fulfill({ json: { authenticated: true, expiresInSeconds: 28800 } });
    });
    await page.route("**/api/ai/draft_rule", async route => {
      assert.deepEqual(route.request().postDataJSON(), {
        schemaVersion: "1",
        policyText: "Customers with NET 30 payment terms cannot have more than 5% of their AR balance past due.",
        activeReleaseId: "credit-1.4.0"
      });
      draftRequests += 1;
      if (draftRequests === 3) {
        return route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED", message: "Authentication required", retryable: false, correlationId: "browser-test" } } });
      }
      return route.fulfill({ json: {
        schemaVersion: "1",
        operation: "draft_rule",
        result: {
          outcome: "CANDIDATE",
          family: "NET30_PAST_DUE_MAX",
          summary: "Bounded NET 30 candidate drafted.",
          dsl: "RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == \"NET_30\"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.05\nEND"
        }
      } });
    });

    await page.goto(`http://127.0.0.1:${port}/v2/`);
    await page.waitForSelector("#accessGate:not(.hidden)");
    assert.equal(await page.locator("#list .row").count(), 0, "the app module must not load before authentication");
    await page.fill("#loginPassword", "approved-demo-password");
    await page.click('#loginForm button[type="submit"]');
    await page.waitForSelector("#list .row");
    assert.equal(await page.locator("#accessGate").getAttribute("class"), "access-gate hidden");

    // AI-enabled mode exposes drafting, but the result remains an unvalidated candidate.
    await page.getByRole("button", { name: "Configure rules" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyWorkbenchTitle");
    assert.equal(await page.getByRole("button", { name: "Draft with AI" }).isDisabled(), false);
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await page.getByText("AI-drafted candidate", { exact: true }).waitFor();
    assert.match(await page.locator(".policy-banner").textContent(), /candidate revision 6 · AI-drafted candidate/);
    assert.match(await page.locator(".policy-draft-feedback").textContent(), /Deterministic validation has not run/);
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyDraftStatus");

    // Replacing source allocates a new monotonic revision for the same stable rule family.
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await page.getByText(/candidate revision 7 · AI-drafted candidate/).waitFor();

    // An expired AI session moves focus to the login gate; the settling draft
    // promise must not steal it back for a now-hidden workbench status.
    await page.getByRole("button", { name: "Draft with AI" }).click();
    await page.waitForSelector("body.auth-locked");
    await page.waitForFunction(() => document.querySelector("#policyDraftStatus")?.textContent.includes("Authentication required"));
    assert.equal(await page.evaluate(() => document.activeElement?.id), "loginPassword");
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
    assert.equal(await page.getByRole("button", { name: "Configure rules" }).isDisabled(), false);
    assert.equal(await page.locator("#activePolicyVersion").textContent(), "credit-1.4.0");

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

test("v2 policy change validates, compares, assesses impact, and badges only changed worklist accounts", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);
    await page.waitForSelector("#list .row");

    await page.getByRole("button", { name: "Configure rules" }).click();
    await page.waitForSelector("#policyWorkbench.show");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyWorkbenchTitle");
    assert.equal(await page.getByRole("button", { name: "Draft with AI" }).isDisabled(), true);
    assert.match(await page.locator("#policyStructuredDiff").textContent(), /Active revision 4 → candidate revision 5.*8% of accounts receivable.*5% of accounts receivable.*Lower threshold · tightening/s);
    assert.match(await page.locator(".policy-baseline-grid").textContent(), /Active policy version.*credit-1\.4\.0.*Preview only · never activated here.*AI drafts; controls assess/s);

    // The shared authoring/governance sequence gates each deterministic step.
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    assert.match(await page.locator(".policy-evidence-card").nth(0).textContent(), /ValidationPassed.*Bounded DSL/s);
    assert.equal(await page.locator('[data-policy-action="impact"]:enabled').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyAction), "analyze");
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    assert.match(await page.locator(".policy-evidence-card").nth(1).textContent(), /CompatibilityPassed.*COMPATIBLE REFINEMENT.*Active 8% → candidate 5%/s);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyAction), "impact");
    await page.locator('[data-policy-action="impact"]:enabled').click();
    await page.waitForSelector("#policyImpactResults");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyImpactResults");

    const impact = await page.locator("#policyImpactResults").textContent();
    assert.match(impact, /3 additional records require review/);
    assert.match(impact, /Cohort records12.*Newly required reviews3.*Changed primary actions3/s);
    assert.match(impact, /preview release credit-1\.4\.0-candidate-NET30_PAST_DUE_MAX-r5/);
    assert.match(impact, /No findings or review paths change for accounts 2001–2004/);
    assert.match(impact, /Governed review, approval, publication, and activation happen outside this POC/);
    assert.equal(await page.getByRole("button", { name: /approve|publish|activate/i }).count(), 0);

    // A tighter, human-edited bounded candidate changes Meridian's finding without
    // projecting the fixed 3001–3012 impact cohort onto the 2001–2004 worklist.
    const dsl = await page.locator("#policyDsl").inputValue();
    await page.locator("#policyDsl").fill(dsl.replace("0.05", "0.01"));
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    assert.match(await page.locator(".policy-banner").textContent(), /candidate revision 6 · Human-edited candidate/);
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    await page.locator('[data-policy-action="impact"]:enabled').click();
    await page.waitForSelector("#policyImpactResults");
    assert.match(await page.locator(".policy-worklist-result").textContent(), /1 of 4 accounts have changed findings or review paths/);
    assert.match(await page.locator("#policyImpactResults").textContent(), /preview release credit-1\.4\.0-candidate-NET30_PAST_DUE_MAX-r6/);

    await page.getByRole("button", { name: "Back to worklist" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "configureRulesButton");
    await page.click('[data-tab="all"]');
    assert.match(await page.locator("#candidateImpactNotice").textContent(), /Candidate preview only:.*1 narrative worklist account has.*Active policy remains credit-1\.4\.0/s);
    assert.equal(await page.locator('#list .row:has-text("Meridian") .candidate-impact-badge').textContent(), "Candidate Finding Added");
    assert.equal(await page.locator("#list .candidate-impact-badge").count(), 1);

    // Candidate evidence and badges are reconstructed deterministically from v2-only tab state.
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:policy-workbench:v1")), null);
    assert.ok(await page.evaluate(() => sessionStorage.getItem("v2:customer-review:policy-workbench:v1")));
    await page.reload();
    await page.waitForSelector("#list .row");
    await page.click('[data-tab="all"]');
    assert.equal(await page.locator('#list .row:has-text("Meridian") .candidate-impact-badge').textContent(), "Candidate Finding Added");
    assert.equal(await page.locator("#activePolicyVersion").textContent(), "credit-1.4.0");

    // Replacing the candidate never reuses an identity. Revisions are monotonic per
    // stable rule family, and preview release IDs include that family.
    await page.getByRole("button", { name: "Configure rules" }).click();
    await page.getByRole("button", { name: "Use example candidate" }).click();
    assert.match(await page.locator(".policy-banner").textContent(), /NET30_PAST_DUE_MAX.*candidate revision 7/s);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyAction), "validate");
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    await page.locator('[data-policy-action="impact"]:enabled').click();
    assert.match(await page.locator("#policyImpactResults").textContent(), /preview release credit-1\.4\.0-candidate-NET30_PAST_DUE_MAX-r7/);

    await page.getByRole("button", { name: /Tighten high-balance ADP/ }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyScenario), "adp20");
    await page.getByRole("button", { name: "Use example candidate" }).click();
    assert.match(await page.locator(".policy-banner").textContent(), /HIGH_BALANCE_ADP_MAX.*candidate revision 3/s);
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    await page.locator('[data-policy-action="impact"]:enabled').click();
    assert.match(await page.locator("#policyImpactResults").textContent(), /preview release credit-1\.4\.0-candidate-HIGH_BALANCE_ADP_MAX-r3/);
    const savedPolicy = await page.evaluate(() => JSON.parse(sessionStorage.getItem("v2:customer-review:policy-workbench:v1")));
    assert.equal(savedPolicy.activeReleaseId, "credit-1.4.0");
    assert.equal(savedPolicy.nextRevisions.NET30_PAST_DUE_MAX, 8);
    assert.equal(savedPolicy.nextRevisions.HIGH_BALANCE_ADP_MAX, 4);

    // Release-bound state is discarded rather than reinterpreted against a new baseline.
    await page.evaluate(() => {
      const key = "v2:customer-review:policy-workbench:v1";
      const saved = JSON.parse(sessionStorage.getItem(key));
      saved.activeReleaseId = "credit-older-baseline";
      sessionStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload();
    await page.waitForSelector("#list .row");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("v2:customer-review:policy-workbench:v1")), null);
    assert.equal(await page.locator("#list .candidate-impact-badge").count(), 0);
    await page.getByRole("button", { name: "Configure rules" }).click();
    assert.match(await page.locator(".policy-banner").textContent(), /NET30_PAST_DUE_MAX.*candidate revision 5 · Example candidate/s);
    assert.match(await page.locator(".policy-evidence").textContent(), /ValidationNot run.*CompatibilityNot run.*Review impactNot run/s);
    assert.deepEqual(pageErrors, []);
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
