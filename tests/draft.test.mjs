import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { createApp } from "../server/app.js";
import { loadConfig } from "../server/config.js";
import { draftRuleExecutor, validateDraftResult } from "../server/draft-rule.js";
import { createCopilotProvider } from "../server/copilot-provider.js";

const origin = "https://demo.example";
const environment = {
  AI_ENABLED: "true",
  DEMO_PASSWORD: "approved-demo-password",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  COPILOT_GITHUB_TOKEN: "test-token",
  COPILOT_MODEL: "gpt-5.4",
  COPILOT_HOME: ".copilot-test"
};
const dsl = {
  NET30_PAST_DUE_MAX: "RULE NET30_PAST_DUE_MAX\nSCOPE customer.payment_terms == \"NET_30\"\nSET_MAX_RATIO customer.past_due_amount\n    TO customer.ar_balance = 0.05\nEND",
  HIGH_BALANCE_ADP_MAX: "RULE HIGH_BALANCE_ADP_MAX\nSCOPE customer.restricted_status == \"N\"\n      AND customer.ar_balance > 100000 USD\nSET_MAX customer.adp_days = 20 DAYS\nEND"
};

async function contextFor(output) {
  const app = createApp({ config: loadConfig(environment), correlationId: () => "draft-correlation", provider: { async complete() { return output; } }, aiExecutors: { draft_rule: draftRuleExecutor } });
  const login = await app.request(`${origin}/api/login`, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ password: environment.DEMO_PASSWORD }) });
  return { app, cookie: login.headers.get("set-cookie").split(";")[0] };
}
const call = (context, policyText = "Set NET 30 past due to 5 percent.") => context.app.request(`${origin}/api/ai/draft_rule`, { method: "POST", headers: { origin, cookie: context.cookie, "content-type": "application/json" }, body: JSON.stringify({ schemaVersion: "1", policyText, activeReleaseId: "credit-1.4.0" }) });

test("both supported candidate families pass parser, ontology, unit, stable-ID, and shape validation", async () => {
  for (const family of Object.keys(dsl)) {
    const output = { outcome: "CANDIDATE", family, summary: "Supported illustrative candidate.", dsl: dsl[family] };
    const response = await call(await contextFor(output), family === "NET30_PAST_DUE_MAX" ? "Set NET 30 past due to 5 percent." : "Set high-balance ADP to 20 days.");
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).result, output);
  }
});

test("clarification and unsupported intent terminate without DSL", async () => {
  const clarification = { outcome: "NEEDS_CLARIFICATION", question: "What maximum past-due percentage should apply?", missingFields: ["threshold"] };
  assert.deepEqual((await (await call(await contextFor(clarification), "Tighten the NET 30 past-due rule.")).json()).result, clarification);
  const unsupported = { outcome: "UNSUPPORTED_INTENT", summary: "This request is outside the two supported policy families." };
  assert.deepEqual((await (await call(await contextFor(unsupported), "Require a fraud score.")).json()).result, unsupported);
});

test("malformed, mismatched, and unsupported candidate DSL is rejected without repair", async () => {
  const invalid = [
    { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Malformed.", dsl: "not a rule" },
    { outcome: "CANDIDATE", family: "HIGH_BALANCE_ADP_MAX", summary: "Mismatched.", dsl: dsl.NET30_PAST_DUE_MAX },
    { outcome: "CANDIDATE", family: "NET30_PAST_DUE_MAX", summary: "Wrong scope.", dsl: dsl.NET30_PAST_DUE_MAX.replace("NET_30", "NET_45") }
  ];
  for (const output of invalid) {
    const response = await call(await contextFor(output));
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: { code: "INVALID_MODEL_RESPONSE", message: "Request could not be completed", retryable: false, correlationId: "draft-correlation" } });
  }
  assert.throws(() => validateDraftResult(invalid[0]), /INVALID_MODEL_RESPONSE/);
});

test("Copilot provider creates an isolated session with a server-owned model, schema, and tool allowlist", async () => {
  let captured;
  const session = {
    sessionId: "test-session",
    async sendAndWait(message) { captured.message = message; return { data: { content: "```json\n{\"outcome\":\"UNSUPPORTED_INTENT\",\"summary\":\"Outside supported policy families.\"}\n```" } }; },
    async disconnect() {},
    async abort() {}
  };
  const client = { async createSession(options) { captured = { options }; return session; }, async deleteSession(id) { captured.deletedSession = id; } };
  const provider = createCopilotProvider(loadConfig(environment), client);
  const result = await provider.complete({ input: { schemaName: "draft_rule_v1", responseSchema: { type: "object" }, messages: [{ role: "system", content: "server prompt" }] }, signal: new AbortController().signal });
  assert.equal(result.outcome, "UNSUPPORTED_INTENT");
  assert.equal(captured.options.model, "gpt-5.4");
  assert.deepEqual(captured.options.availableTools, []);
  assert.deepEqual(captured.options.tools, []);
  assert.match(captured.options.systemMessage.content, /server prompt/);
  assert.match(captured.options.systemMessage.content, /"type":"object"/);
  assert.equal(captured.options.memory.enabled, false);
  assert.equal(captured.message.prompt, "");
  assert.equal(captured.deletedSession, "test-session");
});
