import Ajv from "ajv";
import { getCookie } from "hono/cookie";
import { randomUUID } from "node:crypto";
import { aiContracts, aiOperationNames, aiResponseSchema } from "./ai-contracts.js";
import { SESSION_COOKIE } from "./auth.js";

export const DEFAULT_AI_LIMITS = Object.freeze({ session: 300, minute: 30, providerConcurrency: 20, providerCalls: 3, providerTimeoutMs: 45_000, operationTimeoutMs: 90_000 });

export class GatewayFailure extends Error {
  constructor(code, status, retryable = false, retryAfter = null) { super(code); this.code = code; this.status = status; this.retryable = retryable; this.retryAfter = retryAfter; }
}

const deadline = async (work, milliseconds, signal, code) => {
  const controller = new AbortController();
  if (signal?.aborted) {
    controller.abort(signal.reason);
    throw new GatewayFailure("REQUEST_CANCELLED", 499, true);
  }
  let rejectAbort;
  const abort = () => { controller.abort(signal?.reason); rejectAbort?.(new GatewayFailure("REQUEST_CANCELLED", 499, true)); };
  signal?.addEventListener("abort", abort, { once: true });
  let timer;
  try {
    return await Promise.race([
      work(controller.signal),
      new Promise((_, reject) => { rejectAbort = reject; }),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new GatewayFailure(code, 504, true)); }, milliseconds); })
    ]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
};

export function createAiGateway({ config, auth, readJson, requireOrigin, error, provider, now = Date.now, correlationId = randomUUID, limits = DEFAULT_AI_LIMITS, logger = { info() {} }, executors = {} }) {
  const ajv = new Ajv({ allErrors: false, strict: true });
  const validators = Object.fromEntries(aiOperationNames.map(name => [name, {
    request: ajv.compile(aiContracts[name].request),
    response: ajv.compile(aiResponseSchema(name, aiContracts[name].result))
  }]));
  const usage = new Map();
  let providerInFlight = 0;

  const fail = (c, failure, id) => {
    if (failure.retryAfter) c.header("Retry-After", String(failure.retryAfter));
    return error(c, failure.status, failure.code, undefined, failure.retryable, id, failure.retryAfter);
  };

  const checkQuota = sessionId => {
    const current = now();
    for (const [id, candidate] of usage) if (candidate.lastSeen <= current - 8 * 60 * 60 * 1000) usage.delete(id);
    while (usage.size >= 10_000 && !usage.has(sessionId)) usage.delete(usage.keys().next().value);
    const record = usage.get(sessionId) || { total: 0, minute: [] };
    record.minute = record.minute.filter(timestamp => timestamp > current - 60_000);
    if (record.total >= limits.session) throw new GatewayFailure("SESSION_QUOTA_EXCEEDED", 429, false);
    if (record.minute.length >= limits.minute) throw new GatewayFailure("RATE_LIMITED", 429, true, Math.max(1, Math.ceil((record.minute[0] + 60_000 - current) / 1000)));
    record.total += 1;
    record.minute.push(current);
    record.lastSeen = current;
    usage.set(sessionId, record);
  };

  const run = async (operation, request, operationSignal, tracker) => {
    const providerCall = input => {
      if (tracker.calls >= limits.providerCalls) throw new GatewayFailure("PROVIDER_CALL_LIMIT", 502, false);
      if (providerInFlight >= limits.providerConcurrency) throw new GatewayFailure("PROVIDER_BUSY", 503, true);
      tracker.calls += 1;
      providerInFlight += 1;
      return deadline(signal => {
        const raw = Promise.resolve().then(() => provider.complete({ operation, input, signal }));
        raw.then(() => { providerInFlight -= 1; }, () => { providerInFlight -= 1; });
        return raw;
      }, limits.providerTimeoutMs, operationSignal, "PROVIDER_TIMEOUT")
        .catch(caught => { if (caught instanceof GatewayFailure) throw caught; throw new GatewayFailure("PROVIDER_UNAVAILABLE", 503, true); })
    };
    const execute = executors[operation] || (context => context.providerCall(context.request));
    return execute({ operation, request, providerCall, signal: operationSignal });
  };

  return async (operation, c) => {
    const id = correlationId();
    const startedAt = now();
    const tracker = { calls: 0 };
    try {
      if (!config.aiEnabled) throw new GatewayFailure("AI_DISABLED", 503, false);
      const sessionId = auth.sessionId(getCookie(c, SESSION_COOKIE));
      if (!sessionId) throw new GatewayFailure("AUTH_REQUIRED", 401, false);
      if (!requireOrigin(c, config.trustProxy)) throw new GatewayFailure("INVALID_ORIGIN", 403, false);
      const response = await deadline(async signal => {
        let request;
        try { request = await readJson(c, signal); } catch (caught) {
          const code = caught instanceof Error ? caught.message : "INVALID_REQUEST";
          throw new GatewayFailure(code, code === "BODY_TOO_LARGE" ? 413 : code === "UNSUPPORTED_MEDIA_TYPE" ? 415 : 400, false);
        }
        if (!validators[operation].request(request)) throw new GatewayFailure("INVALID_REQUEST", 400, false);
        checkQuota(sessionId);
        const result = await run(operation, request, signal, tracker);
        const completed = { schemaVersion: "1", operation, result };
        if (!validators[operation].response(completed)) throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
        return completed;
      }, limits.operationTimeoutMs, c.req.raw.signal, "OPERATION_TIMEOUT");
      logger.info({ correlationId: id, operation, status: "ok", providerCalls: tracker.calls, durationMs: now() - startedAt });
      return c.json(response);
    } catch (caught) {
      const failure = caught instanceof GatewayFailure ? caught : new GatewayFailure("INTERNAL_ERROR", 500, false);
      logger.info({ correlationId: id, operation, status: failure.code, providerCalls: tracker.calls, durationMs: now() - startedAt });
      return fail(c, failure, id);
    }
  };
}
