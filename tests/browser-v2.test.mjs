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
    await page.route("**/api/ai/draft_rule", route => {
      draftRequests += 1;
      return route.fulfill({ status: 500, body: "v2 drafting must remain unavailable" });
    });

    await page.goto(`http://127.0.0.1:${port}/v2/`);
    await page.waitForSelector("#accessGate:not(.hidden)");
    assert.equal(await page.locator("#list .row").count(), 0, "the app module must not load before authentication");
    assert.doesNotMatch(await page.locator("#accessGate").textContent(), /illustrative|fictional|\bPOC\b|demo/i);
    await page.fill("#loginPassword", "approved-demo-password");
    await page.click('#loginForm button[type="submit"]');
    await page.waitForSelector("#list .row");
    assert.equal(await page.locator("#accessGate").getAttribute("class"), "access-gate hidden");

    // Authentication can enable model-backed explanations without implying that the
    // old server rule families support the v2 R1/R2 policy workbench.
    await page.getByRole("button", { name: "Configure rules" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyWorkbenchTitle");
    assert.equal(await page.locator("#policyDraftButton").count(), 0);
    assert.equal(await page.getByRole("button", { name: "Load candidate" }).count(), 1);
    assert.equal(draftRequests, 0);
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  }
});

test("v2 worklist and detail present the SE-aligned deterministic business scenarios", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.route("**/api/session", route => route.fulfill({ status: 404, body: "Not found" }));
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);

    // The landing view includes all four scenarios, including the auto-review pass.
    await page.waitForSelector("#list .row");
    assert.equal(await page.locator('[data-tab="all"]').getAttribute("aria-selected"), "true");
    const listText = await page.textContent("#list");
    for (const name of ["Northwind Components", "Cascade Freight", "Meridian Industrial", "Ironclad Manufacturing"]) {
      assert.ok(listText.includes(name), `worklist should include ${name}`);
    }
    const landingRows = await page.locator("#list .row").allTextContents();
    assert.match(landingRows.at(-1), /Northwind Components/, "the auto-cleared account should appear last");
    assert.match(await page.locator('#list .row:has-text("Cascade")').textContent(), /< 10% of AR/);
    assert.match(await page.locator('#list .row:has-text("Meridian")').textContent(), /≥ 10% of AR/);
    assert.match(await page.locator('#list .row:has-text("Northwind")').textContent(), /no actioning finding · view only/);
    assert.ok(!listText.includes("Vantage"), "prototype personas must be gone");
    assert.equal(await page.getByRole("button", { name: "Configure rules" }).isDisabled(), false);
    assert.equal(await page.locator("#activePolicyVersion").textContent(), "customer-review-2.0.0");

    // Filters without backing data are visibly unavailable rather than silently ignored.
    assert.equal(await page.locator("#filterbar input:disabled, #filterbar select:disabled").count(), 7);
    assert.equal(await page.locator("#fCust").isDisabled(), false);
    assert.equal(await page.locator("#fStatus").isDisabled(), false);

    // Global reference controls cannot imply unsupported filtering or currency conversion.
    await page.click("#vw-global");
    assert.equal(await page.locator("#globalWrap .gv-reference input").count(), 0);
    assert.match(await page.locator("#globalWrap .gv-reference").textContent(), /Accounts · 2001–2004/);
    assert.equal(await page.locator("#globalWrap .ccy button").count(), 0);
    assert.equal(await page.locator("#globalWrap .ccy-value").textContent(), "USD only");
    await page.click("#vw-region");

    // Tab counts from engine outcomes: 3 pending decisions, 1 auto-cleared, 0 completed.
    assert.equal(await page.textContent('[data-tab="mine"] .n'), "3");
    assert.equal(await page.textContent('[data-tab="auto"] .n'), "1");
    assert.equal(await page.textContent('[data-tab="done"] .n'), "0");

    // Deteriorating payer: R1 and R5 require manual review while R3 remains visible and non-actioning.
    await page.click('#list .row:has-text("Cascade") .open-btn');
    const banner = await page.textContent("#detailBody .dbanner");
    assert.ok(banner.includes("$8,500,000"), "banner should show the deterministic hold recommendation");
    assert.ok(banner.includes("Manual review"), "banner should show the deterministic manual-review action");
    assert.equal(await page.getByRole("button", { name: /export/i }).count(), 0);
    const rules = await page.textContent("#sec-rules");
    assert.match(rules, /R1 · ADP-W threshold.*FINDING.*ADP_W_THRESHOLD_EXCEEDED/s);
    assert.match(rules, /R3 · Maximum balance versus limit.*visibility signal, not a hard stop.*FINDING.*MAX_BALANCE_VISIBILITY/s);
    assert.match(rules, /R5 · NSF or chargeback events.*FINDING.*RECENT_PAYMENT_EXCEPTION/s);
    const proposal = await page.textContent("#sec-ai");
    for (const section of ["Payment behavior", "Financials", "External signals", "Relationship and exposure"]) assert.ok(proposal.includes(section));
    assert.match(proposal, /Deterministic finding.*ADP-W 73\.9d.*3 recent NSF\/chargeback events|Deterministic finding.*ADP-W 73\.9d/s);
    assert.match(proposal, /Corroborating context:.*do not add a finding or change the deterministic action/s);
    assert.match(proposal, /R3 is a visibility signal only and does not determine the action/);
    assert.doesNotMatch(await page.locator("body").textContent(), /illustrative|fictional|\bPOC\b|no model call/i);

    // Snapshot ontology facts expose their definition, provenance, and exact trace destinations.
    assert.equal(await page.getByText("ontology fact", { exact: true }).count(), 0);
    await page.click('[data-fact="max_balance_90d"]');
    await page.waitForSelector("#factDialog[open]");
    const factReference = await page.textContent("#factDialog");
    assert.match(factReference, /fact:2002\/max_balance_90d/);
    assert.match(factReference, /Type\s*decimal/);
    assert.match(factReference, /Unit\s*USD/);
    assert.match(factReference, /Customer review record/);
    assert.match(factReference, /customer-review-2\.0\.0\/R3_MAX_BALANCE_VS_LIMIT@1/);
    await page.click("#factDialog .dialog-close");

    // Supported increase remains advisory and analyst-decided.
    await page.click("#crumb a");
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    assert.match(await page.textContent("#detailBody .dbanner"), /Recommended limit\s*\$2,000,000.*AI proposal\s*Reassess credit limit/s);
    assert.match(await page.textContent("#sec-ai"), /supports an increase from \$1,750,000 to \$2,000,000.*Analyst decision required/s);

    // Mandatory gate also keeps the correct statement period.
    await page.click("#crumb a");
    await page.click('#list .row:has-text("Meridian") .open-btn');
    const financialSummary = await page.textContent("#sec-fs");
    assert.match(financialSummary, /Fiscal year\s*FY 2024/);
    assert.doesNotMatch(financialSummary, /Fiscal year\s*FY 2025/);
    assert.match(await page.textContent("#sec-ai"), /R2 · Low ADP with delinquent invoices.*R6 · Automatic review count.*Updated financial statements are also required/s);
    assert.deepEqual(pageErrors, []);
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
    assert.equal(await page.locator("#policyDraftButton").count(), 0);
    assert.match(await page.locator("#policyStructuredDiff").textContent(), /R2_LOW_ADP_PLUS_PD.*Active revision 1 → candidate revision 2.*10% of accounts receivable.*8% of accounts receivable.*Lower threshold · tightening/s);
    assert.match(await page.locator("#policyStructuredDiff").textContent(), /Unchanged scope/);
    assert.match(await page.locator(".policy-baseline-grid").textContent(), /Active policy version.*customer-review-2\.0\.0.*Authoritative active baseline.*Preview · pending approval.*AI drafts; controls assess/s);

    // The shared authoring/governance sequence gates each deterministic step.
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    assert.match(await page.locator(".policy-evidence-card").nth(0).textContent(), /ValidationPassed.*Bounded DSL/s);
    assert.equal(await page.locator('[data-policy-action="impact"]:enabled').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyAction), "analyze");
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    assert.match(await page.locator(".policy-evidence-card").nth(1).textContent(), /CompatibilityPassed.*COMPATIBLE REFINEMENT.*Active 10% → candidate 8%/s);
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyAction), "impact");
    await page.locator('[data-policy-action="impact"]:enabled').click();
    await page.waitForSelector("#policyImpactResults");
    assert.equal(await page.evaluate(() => document.activeElement?.id), "policyImpactResults");

    const impact = await page.locator("#policyImpactResults").textContent();
    assert.match(impact, /2 additional records require review/);
    assert.match(impact, /Cohort records12.*Newly required reviews2.*Changed primary actions2/s);
    assert.match(impact, /preview release customer-review-2\.0\.0-candidate-R2_LOW_ADP_PLUS_PD-r2/);
    assert.doesNotMatch(impact, /Worklist preview|Evidence complete for this candidate revision/);
    await page.locator('[data-policy-impact-record="3002"]').click();
    const boundaryDialog = await page.getByRole("dialog").textContent();
    assert.match(boundaryDialog, /Impact R2 8%.*Fictional boundary record · Customer 3002.*8% past-due ratio.*Policy-relevant facts.*Payment terms.*NET 30.*AR balance.*\$100,000.*Past due amount.*\$8,000.*Dry-run outcome.*Active policy.*Candidate policy.*Maximum 10% past due.*Maximum 8% past due/s);
    await page.getByRole("dialog").getByText("All input facts").click();
    assert.match(await page.getByRole("dialog").textContent(), /Financial statements.*Annual revenue.*\$12,000,000/s);
    await page.locator("#policyImpactDialog .dialog-close").click();
    assert.equal(await page.getByRole("button", { name: /approve|publish|activate/i }).count(), 0);

    // The R1 example is assessed separately and adds an ADP-W finding to Meridian
    // without changing the active baseline.
    await page.getByRole("button", { name: /Tighten R1 ADP-W/ }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.dataset.policyScenario), "adp35");
    await page.getByRole("button", { name: "Load candidate" }).click();
    assert.match(await page.locator(".policy-banner").textContent(), /R1_ADP_W.*candidate revision 2 · Preconfigured candidate/s);
    await page.locator(".policy-candidate [data-policy-action=\"validate\"]").click();
    await page.locator('[data-policy-action="analyze"]:enabled').click();
    await page.locator('[data-policy-action="impact"]:enabled').click();
    await page.waitForSelector("#policyImpactResults");
    assert.equal(await page.locator(".policy-worklist-result").count(), 0);
    assert.match(await page.locator("#policyImpactResults").textContent(), /preview release customer-review-2\.0\.0-candidate-R1_ADP_W-r2/);

    await page.getByRole("button", { name: "Back to worklist" }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), "configureRulesButton");
    await page.click('[data-tab="all"]');
    assert.match(await page.locator("#candidateImpactNotice").textContent(), /Candidate preview:.*1 worklist account has.*Active policy remains customer-review-2\.0\.0/s);
    assert.equal(await page.locator('#list .row:has-text("Meridian") .candidate-impact-badge').textContent(), "Candidate Finding Added");
    assert.equal(await page.locator("#list .candidate-impact-badge").count(), 1);

    // Candidate evidence and badges are reconstructed deterministically from v2-only tab state.
    assert.equal(await page.evaluate(() => sessionStorage.getItem("customer-review:policy-workbench:v1")), null);
    assert.ok(await page.evaluate(() => sessionStorage.getItem("v2:customer-review:policy-workbench:v1")));
    await page.reload();
    await page.waitForSelector("#list .row");
    await page.click('[data-tab="all"]');
    assert.equal(await page.locator('#list .row:has-text("Meridian") .candidate-impact-badge').textContent(), "Candidate Finding Added");
    assert.equal(await page.locator("#activePolicyVersion").textContent(), "customer-review-2.0.0");
    const savedPolicy = await page.evaluate(() => JSON.parse(sessionStorage.getItem("v2:customer-review:policy-workbench:v1")));
    assert.equal(savedPolicy.activeReleaseId, "customer-review-2.0.0");
    assert.equal(savedPolicy.nextRevisions.R2_LOW_ADP_PLUS_PD, 3);
    assert.equal(savedPolicy.nextRevisions.R1_ADP_W, 3);

    // Release-bound state is discarded rather than reinterpreted against a new baseline.
    await page.evaluate(() => {
      const key = "v2:customer-review:policy-workbench:v1";
      const saved = JSON.parse(sessionStorage.getItem(key));
      saved.activeReleaseId = "customer-review-older-baseline";
      sessionStorage.setItem(key, JSON.stringify(saved));
    });
    await page.reload();
    await page.waitForSelector("#list .row");
    assert.equal(await page.evaluate(() => sessionStorage.getItem("v2:customer-review:policy-workbench:v1")), null);
    assert.equal(await page.locator("#list .candidate-impact-badge").count(), 0);
    await page.getByRole("button", { name: "Configure rules" }).click();
    assert.match(await page.locator(".policy-banner").textContent(), /R2_LOW_ADP_PLUS_PD.*candidate revision 2 · Preconfigured candidate/s);
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
    assert.match(autoProposal, /No deterministic control requires intervention/);
    assert.equal(await page.locator(".rerun").count(), 0);
    assert.equal(await page.locator('[data-act="rerun"]').count(), 0);
    const autoHistory = await page.textContent("#sec-hist");
    assert.match(autoHistory, /J\. Kim.*Analyst approved a routine increase after current statements and order demand supported the change/s);
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
    assert.match(await page.textContent("#sec-hist"), /Decision recorded.*confirmed proposed result.*Reassess credit limit/s);

    // Storage is prefixed for v2 and untouched for v1.
    const keys = await page.evaluate(() => ({
      v2: sessionStorage.getItem("v2:customer-review:dispositions:v1"),
      history: sessionStorage.getItem("v2:customer-review:history:v1"),
      v1: sessionStorage.getItem("customer-review:dispositions:v1")
    }));
    assert.ok(keys.v2.includes('"deterministicAction":"RECOMMEND_CREDIT_LIMIT_REASSESSMENT"'));
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
    assert.match(await page.textContent("#sec-hist"), /Customer Review.*Decision recorded.*Policy customer-review-2\.0\.0/s);

    // Reopen restores the pending decision.
    await page.click('[data-act="reopen"]');
    await page.waitForSelector('[data-act="confirm"]');
    assert.match(await page.textContent("#sec-hist"), /Review reopened.*Reassess credit limit/s);

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
