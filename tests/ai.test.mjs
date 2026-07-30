import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { createApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { DEFAULT_AI_LIMITS, GatewayFailure } from "../server/ai-gateway.js";

const origin = "https://demo.example";
const environment = {
  AI_ENABLED: "true",
  DEMO_PASSWORD: "approved-demo-password",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  LLM_CHAT_COMPLETIONS_URL: "https://gateway.example/chat/completions/gpt-5.6-luna",
  LLM_API_KEY: "test-key",
  LLM_MODEL_DISPLAY_NAME: "GPT-5.6 Luna"
};
const candidate = { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Lower the NET 30 threshold.", dsl: "RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == NET_30\nSET_MAX_RATIO customer.past_due_amount TO customer.ar_balance = 0.05\nEND" };
const requests = {
  draft_rule: { schemaVersion: "1", policyText: "Lower NET 30 past due to five percent.", activeReleaseId: "credit-1.4.0" },
  explain_review: { schemaVersion: "1", customer: { number: 2002, name: "Cascade Freight" }, release: { id: "credit-1.4.0" }, action: "NEED_MANUAL_REVIEW", traces: [{ evaluationRef: "credit-1.4.0/NET30_PAST_DUE_MAX@4", outcome: "FINDING", reasonCode: "NET30_PAST_DUE_LIMIT_EXCEEDED", policyStatement: "NET 30 customers may not exceed 8% past due.", factRefs: ["fact:2002/past_due_amount"] }], facts: [{ ref: "fact:2002/past_due_amount", factId: "past_due_amount", value: "$18,000" }] },
  explain_policy_analysis: { schemaVersion: "1", activeReleaseId: "credit-1.4.0", candidateRevision: 5, analysisStatus: "COMPATIBLE_REFINEMENT", analysisSummary: "The threshold is stricter.", impactHeadline: "3 additional records require review", impactComplete: true, evidenceRefs: ["credit-1.4.0/NET30_PAST_DUE_MAX@4"] }
};
const outputs = {
  draft_rule: candidate,
  explain_review: { rationale: { status: "EXPLAINED", summary: "The account needs review.", points: [{ text: "Past due exceeded the limit.", references: ["credit-1.4.0/NET30_PAST_DUE_MAX@4"] }] }, evidenceResults: [], toolTrace: { eligible: ["get_open_disputes", "get_payment_history"], called: [] } },
  explain_policy_analysis: { summary: "The candidate is a compatible refinement.", points: [{ text: "Three records cross the review boundary.", references: ["credit-1.4.0/NET30_PAST_DUE_MAX@4"] }] }
};

async function authenticatedApp(options = {}) {
  const app = createApp({ config: loadConfig(environment), correlationId: () => "correlation-test", ...options });
  const login = await app.request(`${origin}/api/login`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ password: environment.DEMO_PASSWORD }) });
  return { app, cookie: login.headers.get("set-cookie").split(";")[0] };
}

const call = ({ app, cookie }, operation, body = requests[operation]) => app.request(`${origin}/api/ai/${operation}`, { method: "POST", headers: { origin, cookie, "content-type": "application/json" }, body: JSON.stringify(body) });

test("exactly three named operations return complete schema-versioned fake-provider responses", async () => {
  const seen = [];
  const context = await authenticatedApp({ provider: { async complete(input) { seen.push({ operation: input.operation, aborted: input.signal.aborted }); return outputs[input.operation]; } } });
  for (const operation of Object.keys(requests)) {
    const response = await call(context, operation);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { schemaVersion: "1", operation, result: outputs[operation] });
  }
  assert.deepEqual(seen.map(item => item.operation), ["draft_rule", "explain_review", "explain_policy_analysis"]);
  assert.equal((await call(context, "generic_completion", {})).status, 404);
});

test("closed request and response schemas reject extras, bounds, markup, and partial output", async () => {
  let providerCalls = 0;
  const context = await authenticatedApp({ provider: { async complete() { providerCalls += 1; return { outcome: "CANDIDATE" }; } } });
  for (const invalid of [
    { ...requests.draft_rule, extra: true },
    { ...requests.draft_rule, schemaVersion: "2" },
    { ...requests.draft_rule, policyText: "" },
    { ...requests.draft_rule, policyText: "not plain\u0000text" }
  ]) {
    const response = await call(context, "draft_rule", invalid);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  }
  assert.equal(providerCalls, 0);
  const invalidOutput = await call(context, "draft_rule");
  assert.equal(invalidOutput.status, 502);
  assert.equal((await invalidOutput.json()).error.code, "INVALID_MODEL_RESPONSE");
});

test("policy explanations reject non-terminal compatibility and incomplete impact before provider use", async () => {
  let providerCalls = 0;
  const context = await authenticatedApp({ provider: { async complete() { providerCalls += 1; return outputs.explain_policy_analysis; } } });
  for (const invalid of [
    { ...requests.explain_policy_analysis, analysisStatus: "CONFLICT" },
    { ...requests.explain_policy_analysis, analysisStatus: "INDETERMINATE" },
    { ...requests.explain_policy_analysis, impactComplete: false }
  ]) {
    const response = await call(context, "explain_policy_analysis", invalid);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_REQUEST");
  }
  assert.equal(providerCalls, 0);
});

test("safe error envelopes hide provider details and log metadata only", async () => {
  const logs = [];
  const context = await authenticatedApp({ logger: { info(entry) { logs.push(entry); } }, provider: { async complete() { throw new Error("raw provider body with secret prompt"); } } });
  const response = await call(context, "draft_rule");
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.deepEqual(body, { error: { code: "PROVIDER_UNAVAILABLE", message: "Request could not be completed", retryable: true, correlationId: "correlation-test" } });
  assert.deepEqual(Object.keys(logs[0]).sort(), ["correlationId", "durationMs", "operation", "providerCalls", "status"]);
  assert.doesNotMatch(JSON.stringify({ body, logs }), /raw provider|secret prompt|gateway\.example|test-key/);
});

test("AI operations require mode, authentication, origin, and a current session", async () => {
  const staticApp = createApp({ config: loadConfig({ AI_ENABLED: "false" }) });
  const disabled = await staticApp.request(`${origin}/api/ai/draft_rule`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(requests.draft_rule) });
  assert.equal(disabled.status, 503);
  assert.equal((await disabled.json()).error.code, "AI_DISABLED");
  const config = loadConfig(environment);
  const app = createApp({ config });
  assert.equal((await app.request(`${origin}/api/ai/draft_rule`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(requests.draft_rule) })).status, 401);
  const context = await authenticatedApp({ provider: { async complete() { return candidate; } } });
  assert.equal((await context.app.request(`${origin}/api/ai/draft_rule`, { method: "POST", headers: { cookie: context.cookie, "content-type": "application/json" }, body: JSON.stringify(requests.draft_rule) })).status, 403);
});

test("per-session and per-minute quotas return gateway-owned retry behavior", async () => {
  let time = 10_000;
  const limits = { ...DEFAULT_AI_LIMITS, session: 3, minute: 2 };
  const context = await authenticatedApp({ now: () => time, aiLimits: limits, provider: { async complete() { return candidate; } } });
  assert.equal((await call(context, "draft_rule")).status, 200);
  assert.equal((await call(context, "draft_rule")).status, 200);
  const limited = await call(context, "draft_rule");
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, "RATE_LIMITED");
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  time += 60_001;
  assert.equal((await call(context, "draft_rule")).status, 200);
  const exhausted = await call(context, "draft_rule");
  assert.equal(exhausted.status, 429);
  assert.equal((await exhausted.json()).error.code, "SESSION_QUOTA_EXCEEDED");
});

test("provider concurrency, call maximum, and both deadlines abort without retry", async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  let started;
  const providerStarted = new Promise(resolve => { started = resolve; });
  let calls = 0;
  const limits = { ...DEFAULT_AI_LIMITS, providerConcurrency: 1, providerTimeoutMs: 1_000, operationTimeoutMs: 2_000 };
  const context = await authenticatedApp({ aiLimits: limits, provider: { async complete() { calls += 1; started(); await blocked; return candidate; } } });
  const first = call(context, "draft_rule");
  await providerStarted;
  const busy = await call(context, "draft_rule");
  assert.equal((await busy.json()).error.code, "PROVIDER_BUSY");
  release();
  assert.equal((await first).status, 200);
  assert.equal(calls, 1);

  let aborted = false;
  const timeoutContext = await authenticatedApp({ aiLimits: { ...DEFAULT_AI_LIMITS, providerConcurrency: 1, providerTimeoutMs: 5, operationTimeoutMs: 100 }, provider: { complete({ signal }) { signal.addEventListener("abort", () => { aborted = true; }); return new Promise(() => {}); } } });
  const timeout = await call(timeoutContext, "draft_rule");
  assert.equal((await timeout.json()).error.code, "PROVIDER_TIMEOUT");
  assert.equal(aborted, true);
  const stillBusy = await call(timeoutContext, "draft_rule");
  assert.equal((await stillBusy.json()).error.code, "PROVIDER_BUSY");

  const operationContext = await authenticatedApp({ aiLimits: { ...DEFAULT_AI_LIMITS, providerTimeoutMs: 100, operationTimeoutMs: 5 }, provider: { complete() { return new Promise(() => {}); } } });
  assert.equal((await (await call(operationContext, "draft_rule")).json()).error.code, "OPERATION_TIMEOUT");
});

test("an operation cannot exceed three provider calls and stale release uses the safe envelope", async () => {
  let providerCalls = 0;
  const context = await authenticatedApp({
    provider: { async complete() { providerCalls += 1; return candidate; } },
    aiExecutors: { draft_rule: async ({ providerCall, request }) => { for (let count = 0; count < 4; count += 1) await providerCall(request); } }
  });
  const response = await call(context, "draft_rule");
  assert.equal((await response.json()).error.code, "PROVIDER_CALL_LIMIT");
  assert.equal(providerCalls, 3);

  const stale = await authenticatedApp({ provider: { async complete() { return candidate; } }, aiExecutors: { draft_rule() { throw new GatewayFailure("STALE_RELEASE", 409, false); } } });
  const staleResponse = await call(stale, "draft_rule");
  assert.deepEqual(await staleResponse.json(), { error: { code: "STALE_RELEASE", message: "Request could not be completed", retryable: false, correlationId: "correlation-test" } });
});
