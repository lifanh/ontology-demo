import { CopilotClient, defineTool } from "@github/copilot-sdk";
import { GatewayFailure } from "./ai-gateway.js";

const parseJson = content => {
  if (typeof content !== "string") throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false);
  const match = content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  try { return JSON.parse(match ? match[1] : content); } catch { throw new GatewayFailure("INVALID_MODEL_RESPONSE", 502, false); }
};

const promptFor = input => {
  const system = input.messages.filter(message => message.role === "system").map(message => message.content).join("\n\n");
  const conversation = input.messages.filter(message => message.role !== "system").map(message => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  return {
    system: `${system}\n\nReturn only JSON matching this exact JSON Schema. Do not wrap it in Markdown.\n${JSON.stringify(input.responseSchema)}`,
    conversation
  };
};

export function createCopilotProvider(config, suppliedClient) {
  const client = suppliedClient || new CopilotClient({
    mode: config.copilotToken ? "empty" : "copilot-cli",
    baseDirectory: config.copilotHome,
    ...(config.copilotToken ? { gitHubToken: config.copilotToken, useLoggedInUser: false } : { useLoggedInUser: true }),
    sessionIdleTimeoutSeconds: 120
  });
  return Object.freeze({
    async close() { await client.stop(); },
    async complete({ input, signal }) {
      const prompt = promptFor(input);
      let session;
      let toolFailure;
      const abort = () => { void session?.abort().catch(() => {}); };
      try {
        if (signal.aborted) throw signal.reason || new Error("aborted");
        session = await client.createSession({
          model: config.copilotModel,
          systemMessage: { mode: "replace", content: prompt.system },
          tools: (input.tools || []).map(tool => defineTool(tool.name, {
            description: tool.description,
            parameters: tool.parameters,
            handler: async argumentsValue => {
              try { return await tool.handler(argumentsValue); } catch (caught) { toolFailure = caught; throw caught; }
            },
            skipPermission: true,
            defer: "never"
          })),
          availableTools: (input.tools || []).map(tool => `custom:${tool.name}`),
          infiniteSessions: { enabled: false },
          memory: { enabled: false },
          enableConfigDiscovery: false,
          skipEmbeddingRetrieval: true
        });
        signal.addEventListener("abort", abort, { once: true });
        const response = await session.sendAndWait({ prompt: prompt.conversation }, 120_000);
        if (toolFailure) throw toolFailure;
        return parseJson(response?.data?.content);
      } catch (caught) {
        if (toolFailure instanceof GatewayFailure) throw toolFailure;
        if (caught instanceof GatewayFailure || signal.aborted) throw caught;
        throw new GatewayFailure("PROVIDER_UNAVAILABLE", 503, true);
      } finally {
        signal.removeEventListener("abort", abort);
        await session?.disconnect().catch(() => {});
        if (session) await client.deleteSession(session.sessionId).catch(() => {});
      }
    }
  });
}
