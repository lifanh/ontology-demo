import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "ai_credit_review_session";
export const SESSION_SECONDS = 8 * 60 * 60;

const digest = value => createHmac("sha256", "password-comparison").update(value).digest();
const sign = (value, secret) => createHmac("sha256", secret).update(value).digest("base64url");
const equal = (left, right) => timingSafeEqual(digest(String(left)), digest(String(right)));

export function createAuth({ password, secret, now = Date.now, createId = () => randomBytes(24).toString("base64url") }) {
  const sessions = new Map();
  const prune = () => {
    const currentTime = now();
    for (const [id, expiresAt] of sessions) if (expiresAt <= currentTime) sessions.delete(id);
    while (sessions.size >= 10_000) sessions.delete(sessions.keys().next().value);
  };

  const issue = () => {
    prune();
    const id = createId();
    const expiresAt = now() + SESSION_SECONDS * 1000;
    sessions.set(id, expiresAt);
    const payload = `${id}.${expiresAt}`;
    return `${payload}.${sign(payload, secret)}`;
  };

  const verify = token => {
    if (!token) return false;
    const pieces = token.split(".");
    if (pieces.length !== 3) return false;
    const [id, expiresAt, signature] = pieces;
    const expected = sign(`${id}.${expiresAt}`, secret);
    if (!equal(signature, expected)) return false;
    const expiry = Number(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= now() || sessions.get(id) !== expiry) {
      sessions.delete(id);
      return false;
    }
    return true;
  };

  const revoke = token => {
    const id = token?.split(".")[0];
    if (id) sessions.delete(id);
  };

  return Object.freeze({ passwordMatches: candidate => equal(candidate, password), issue, verify, revoke });
}
