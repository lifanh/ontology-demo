import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createAuth, SESSION_COOKIE, SESSION_SECONDS } from "./auth.js";

const MAX_BODY_BYTES = 32 * 1024;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 10;

const error = (c, status, code, message = "Request could not be completed") => c.json({ error: { code, message } }, status);

const externalOrigin = (c, trustProxy) => {
  if (!trustProxy) return new URL(c.req.url).origin;
  const protocol = c.req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = c.req.header("x-forwarded-host")?.split(",")[0]?.trim() || c.req.header("host");
  if (!protocol || !host || !["http", "https"].includes(protocol)) return null;
  try { return new URL(`${protocol}://${host}`).origin; } catch { return null; }
};

const requireOrigin = (c, trustProxy) => {
  const origin = c.req.header("origin");
  return Boolean(origin && origin === externalOrigin(c, trustProxy));
};

async function readJson(c) {
  if (!c.req.header("content-type")?.toLowerCase().startsWith("application/json")) throw new Error("UNSUPPORTED_MEDIA_TYPE");
  const declared = Number(c.req.header("content-length") || 0);
  if (declared > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const reader = c.req.raw.body?.getReader();
  if (!reader) throw new Error("INVALID_JSON");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error("BODY_TOO_LARGE");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new Error("INVALID_JSON"); }
}

const cookieOptions = (c, trustProxy) => ({
  httpOnly: true,
  sameSite: "Strict",
  path: "/",
  maxAge: SESSION_SECONDS,
  secure: externalOrigin(c, trustProxy)?.startsWith("https://") || false
});

export function createApp({ config, now = Date.now, clientIp = () => "unknown" }) {
  const app = new Hono();
  const auth = config.aiEnabled ? createAuth({ password: config.demoPassword, secret: config.sessionSecret, now }) : null;
  const failures = new Map();
  const publicAssets = new Set(["/", "/index.html", "/styles.css", "/src/ui/access.js"]);

  app.use("*", async (c, next) => {
    if (!config.aiEnabled || c.req.path.startsWith("/api/") || publicAssets.has(c.req.path) || auth.verify(getCookie(c, SESSION_COOKIE))) return next();
    return error(c, 401, "AUTH_REQUIRED", "Authentication required");
  });

  const ipFor = c => config.trustProxy
    ? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || clientIp(c)
    : clientIp(c);
  const activeFailures = ip => {
    const cutoff = now() - LOGIN_WINDOW_MS;
    const recent = (failures.get(ip) || []).filter(timestamp => timestamp > cutoff);
    if (recent.length) failures.set(ip, recent); else failures.delete(ip);
    return recent;
  };

  app.get("/api/session", c => c.json({ mode: config.mode, aiEnabled: config.aiEnabled, authenticated: !config.aiEnabled || auth.verify(getCookie(c, SESSION_COOKIE)), modelDisplayName: config.aiEnabled ? config.modelDisplayName : null }));

  app.post("/api/login", async c => {
    if (!config.aiEnabled) return error(c, 404, "NOT_FOUND");
    if (!requireOrigin(c, config.trustProxy)) return error(c, 403, "INVALID_ORIGIN");
    const ip = ipFor(c);
    const recent = activeFailures(ip);
    if (recent.length >= MAX_LOGIN_FAILURES) {
      c.header("Retry-After", String(Math.ceil((recent[0] + LOGIN_WINDOW_MS - now()) / 1000)));
      return error(c, 429, "LOGIN_RATE_LIMITED", "Too many login attempts");
    }
    let body;
    try { body = await readJson(c); } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INVALID_REQUEST";
      return error(c, code === "BODY_TOO_LARGE" ? 413 : code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 400, code);
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => key !== "password") || typeof body.password !== "string" || !auth.passwordMatches(body.password)) {
      failures.set(ip, [...recent, now()]);
      return error(c, 401, "INVALID_CREDENTIALS", "Invalid password");
    }
    failures.delete(ip);
    setCookie(c, SESSION_COOKIE, auth.issue(), cookieOptions(c, config.trustProxy));
    return c.json({ authenticated: true, expiresInSeconds: SESSION_SECONDS });
  });

  app.post("/api/logout", async c => {
    if (!config.aiEnabled) return error(c, 404, "NOT_FOUND");
    if (!requireOrigin(c, config.trustProxy)) return error(c, 403, "INVALID_ORIGIN");
    try { await readJson(c); } catch (caught) {
      const code = caught instanceof Error ? caught.message : "INVALID_REQUEST";
      return error(c, code === "BODY_TOO_LARGE" ? 413 : code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 400, code);
    }
    auth.revoke(getCookie(c, SESSION_COOKIE));
    deleteCookie(c, SESSION_COOKIE, { path: "/", secure: cookieOptions(c, config.trustProxy).secure });
    return c.json({ authenticated: false });
  });

  app.all("/api/*", c => error(c, 404, "NOT_FOUND"));
  app.onError(() => new Response(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Request could not be completed" } }), { status: 500, headers: { "content-type": "application/json" } }));
  return app;
}
