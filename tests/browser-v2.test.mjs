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

test("v2 worklist and detail are driven by the shared deterministic engine", async () => {
  const port = await freePort();
  const vite = await startVite(port);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);

    // Worklist rows come from narrativeCustomers, not prototype data.
    await page.waitForSelector("#list .row");
    await page.click('[data-tab="all"]');
    const listText = await page.textContent("#list");
    for (const name of ["Northwind Components", "Cascade Freight", "Meridian Industrial", "Ironclad Manufacturing"]) {
      assert.ok(listText.includes(name), `worklist should include ${name}`);
    }
    assert.ok(!listText.includes("Vantage"), "prototype personas must be gone");

    // Tab counts from engine outcomes: 3 pending decisions, 1 auto-cleared, 0 completed.
    assert.equal(await page.textContent('[data-tab="mine"] .n'), "3");
    assert.equal(await page.textContent('[data-tab="auto"] .n'), "1");
    assert.equal(await page.textContent('[data-tab="done"] .n'), "0");

    // Ironclad detail: calculator recommendation and exact rule evaluation references.
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    const banner = await page.textContent("#detailBody .dbanner");
    assert.ok(banner.includes("$75,000"), "banner should show the deterministic recommended limit");
    assert.ok(banner.includes("Restrict customer"), "banner should show the proposed action");
    const rules = await page.textContent("#sec-rules");
    assert.ok(rules.includes("credit-1.4.0/CRITICAL_RESTRICTION@1"), "rules table should cite the evaluator's evaluationRef");
    assert.ok(rules.includes("CRITICAL_RESTRICTION_TRIGGER"), "rules table should cite the reason code");
    assert.ok((await page.textContent("#sec-ai")).includes("no model call"), "proposal must be labeled as scripted");
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
    await page.goto(`http://127.0.0.1:${port}/v2/index.html`);
    await page.waitForSelector("#list .row");

    // Auto-cleared record has no decision controls.
    await page.click('[data-tab="auto"]');
    await page.click('#list .row:has-text("Northwind") .open-btn');
    await page.waitForSelector(".actzone");
    assert.ok(await page.isVisible('button:has-text("View only (auto-cleared)")'));
    assert.equal(await page.locator('[data-act="confirm"]').count(), 0);
    await page.click("#crumb a");

    // Confirm the AI proposal on Ironclad.
    await page.click('[data-tab="mine"]');
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    await page.click('[data-act="confirm"]');
    await page.waitForSelector('[data-act="reopen"]');
    assert.ok((await page.textContent(".actzone")).includes("AI proposal confirmed"));

    // Storage is prefixed for v2 and untouched for v1.
    const keys = await page.evaluate(() => ({
      v2: sessionStorage.getItem("v2:customer-review:dispositions:v1"),
      v1: sessionStorage.getItem("customer-review:dispositions:v1")
    }));
    assert.ok(keys.v2.includes('"deterministicAction":"NEED_TO_RESTRICT"'));
    assert.equal(keys.v1, null);

    // Decision survives reload and moves the record to Completed.
    await page.reload();
    await page.waitForSelector("#list .row");
    assert.equal(await page.textContent('[data-tab="done"] .n'), "1");
    assert.equal(await page.textContent('[data-tab="mine"] .n'), "2");
    await page.click('[data-tab="done"]');
    await page.click('#list .row:has-text("Ironclad") .open-btn');
    await page.waitForSelector('[data-act="reopen"]');

    // Reopen restores the pending decision.
    await page.click('[data-act="reopen"]');
    await page.waitForSelector('[data-act="confirm"]');

    // Adjust & confirm records an override with a validated reason.
    await page.click('[data-act="adjust-open"]');
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
  } finally {
    await browser.close();
    try { process.kill(-vite.pid, "SIGTERM"); } catch {}
  }
});
