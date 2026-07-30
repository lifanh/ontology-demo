import { GatewayFailure } from "./ai-gateway.js";

export function createOpenAiProvider(config, fetchImplementation = fetch) {
  return Object.freeze({
    async complete({ input, signal }) {
      let response;
      try {
        response = await fetchImplementation(config.chatCompletionsUrl, {
          method: "POST",
          headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" },
          body: JSON.stringify({ messages: input.messages, response_format: { type: "json_schema", json_schema: { name: input.schemaName, strict: true, schema: input.responseSchema } }, ...(input.tools ? { tools: input.tools, tool_choice: "auto" } : {}), stream: false }),
          signal
        });
      } catch (caught) {
        if (signal.aborted) throw caught;
        throw new GatewayFailure("PROVIDER_UNAVAILABLE", 503, true);
      }
      if (!response.ok) throw new GatewayFailure("PROVIDER_UNAVAILABLE", 503, response.status === 408 || response.status === 429 || response.status >= 500);
      let payload;
      try { payload = await response.json(); } catch { throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false); }
      const message = payload?.choices?.[0]?.message;
      if (Array.isArray(message?.tool_calls)) {
        if (message.role !== "assistant" || !message.tool_calls.length || (message.content != null && message.content !== "")) throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
        const calls = message.tool_calls.map(call => ({ id: call?.id, name: call?.function?.name, arguments: call?.function?.arguments }));
        if (calls.some(call => typeof call.id !== "string" || !call.id || typeof call.name !== "string" || typeof call.arguments !== "string") || new Set(calls.map(call => call.id)).size !== calls.length) throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
        return { type: "tool_calls", calls };
      }
      const content = message?.content;
      if (typeof content !== "string") throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
      try { return JSON.parse(content); } catch { throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false); }
    }
  });
}
