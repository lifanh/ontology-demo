import assert from "node:assert/strict";
import { test } from "vite-plus/test";
import { loadConfig } from "../server/config.js";
import { createApp } from "../server/app.js";

const origin = "https://demo.example";
const aiEnvironment = overrides => ({
  AI_ENABLED: "true",
  DEMO_PASSWORD: "approved-demo-password",
  SESSION_SECRET: "0123456789abcdef0123456789abcdef",
  LLM_CHAT_COMPLETIONS_URL: "https://gateway.example/chat/completions/gpt-5.6-luna",
  LLM_API_KEY: "test-key",
  LLM_MODEL_DISPLAY_NAME: "GPT-5.6 Luna",
  ...overrides
});
const request = (app, path, options = {}) => app.request(`${origin}${path}`, options);
const post = (app, path, body, headers = {}) => request(app, path, { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

test("static mode needs no credentials and reports AI disabled", async () => {
  const config = loadConfig({ AI_ENABLED: "false" });
  const response = await request(createApp({ config }), "/api/session");
  assert.deepEqual(await response.json(), { mode: "static", aiEnabled: false, authenticated: true, modelDisplayName: null });
  assert.equal((await post(createApp({ config }), "/api/login", { password: "anything" })).status, 404);
});

test("AI mode fails closed for missing or invalid configuration", () => {
  assert.throws(() => loadConfig({}), /AI_ENABLED must be true or false/);
  for (const key of ["DEMO_PASSWORD", "SESSION_SECRET", "LLM_CHAT_COMPLETIONS_URL", "LLM_API_KEY", "LLM_MODEL_DISPLAY_NAME"]) {
    const environment = aiEnvironment(); delete environment[key];
    assert.throws(() => loadConfig(environment), new RegExp(`${key} is required`));
  }
  assert.throws(() => loadConfig(aiEnvironment({ SESSION_SECRET: "too-short" })), /at least 32 bytes/);
  assert.throws(() => loadConfig(aiEnvironment({ LLM_CHAT_COMPLETIONS_URL: "not a URL" })), /complete URL/);
  assert.throws(() => loadConfig(aiEnvironment({ LLM_MODEL_DISPLAY_NAME: "Another model" })), /unsupported/);
  assert.throws(() => loadConfig(aiEnvironment({ AI_ENABLED: "maybe" })), /must be true or false/);
});

test("login issues an eight-hour secure strict cookie and logout revokes it", async () => {
  const app = createApp({ config: loadConfig(aiEnvironment()) });
  assert.equal((await post(app, "/api/login", { password: "wrong" })).status, 401);
  const login = await post(app, "/api/login", { password: "approved-demo-password" });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /ai_credit_review_session=/);
  assert.match(cookie, /Max-Age=28800/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  const token = cookie.split(";")[0];
  const session = await request(app, "/api/session", { headers: { cookie: token } });
  assert.equal((await session.json()).authenticated, true);
  const logout = await post(app, "/api/logout", {}, { cookie: token });
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
  const after = await request(app, "/api/session", { headers: { cookie: token } });
  assert.equal((await after.json()).authenticated, false);
});

test("mutations require same-origin JSON and cap actual bodies at 32 KiB", async () => {
  const app = createApp({ config: loadConfig(aiEnvironment()) });
  assert.equal((await request(app, "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).status, 403);
  assert.equal((await request(app, "/api/login", { method: "POST", headers: { origin, "content-type": "text/plain" }, body: "{}" })).status, 415);
  assert.equal((await request(app, "/api/login", { method: "POST", headers: { origin, "content-type": "application/json" }, body: `{"password":"${"x".repeat(33 * 1024)}"}` })).status, 413);
});

test("login limits failures by trusted client IP for fifteen minutes", async () => {
  let time = 1_000_000;
  const app = createApp({ config: loadConfig(aiEnvironment({ TRUST_PROXY: "true" })), now: () => time });
  const forwarded = ip => ({ "x-forwarded-for": ip, "x-forwarded-proto": "https", "x-forwarded-host": "demo.example" });
  for (let attempt = 0; attempt < 10; attempt += 1) assert.equal((await post(app, "/api/login", { password: "wrong" }, forwarded("192.0.2.10"))).status, 401);
  const limited = await post(app, "/api/login", { password: "approved-demo-password" }, forwarded("192.0.2.10"));
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get("retry-after")) > 0);
  assert.equal((await post(app, "/api/login", { password: "approved-demo-password" }, forwarded("192.0.2.11"))).status, 200);
  time += 15 * 60 * 1000 + 1;
  assert.equal((await post(app, "/api/login", { password: "approved-demo-password" }, forwarded("192.0.2.10"))).status, 200);
});

test("forwarded IP is ignored unless proxy trust is explicit", async () => {
  const app = createApp({ config: loadConfig(aiEnvironment()), clientIp: () => "198.51.100.1" });
  for (let attempt = 0; attempt < 10; attempt += 1) await post(app, "/api/login", { password: "wrong" }, { "x-forwarded-for": `192.0.2.${attempt}` });
  assert.equal((await post(app, "/api/login", { password: "approved-demo-password" }, { "x-forwarded-for": "192.0.2.99" })).status, 429);
});

test("trusted proxy origin and protocol control origin checks and Secure cookies", async () => {
  const app = createApp({ config: loadConfig(aiEnvironment({ TRUST_PROXY: "true" })) });
  const response = await app.request("http://internal:3000/api/login", { method: "POST", headers: { origin, host: "internal:3000", "x-forwarded-proto": "https", "x-forwarded-host": "demo.example", "content-type": "application/json" }, body: JSON.stringify({ password: "approved-demo-password" }) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /Secure/);
});

test("AI mode protects product assets until the session is authenticated", async () => {
  const app = createApp({ config: loadConfig(aiEnvironment()) });
  assert.equal((await request(app, "/")).status, 404);
  assert.equal((await request(app, "/styles.css")).status, 404);
  assert.equal((await request(app, "/src/ui/access.js")).status, 404);
  assert.equal((await request(app, "/src/ui/app.js")).status, 401);
});
