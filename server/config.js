const required = (environment, name) => {
  const value = environment[name]?.trim();
  if (!value) throw new Error(`Invalid AI gateway configuration: ${name} is required`);
  return value;
};

const boolean = (environment, name, fallback) => {
  const value = environment[name];
  if (value == null) {
    if (fallback == null) throw new Error(`Invalid AI gateway configuration: ${name} must be true or false`);
    return fallback;
  }
  if (value !== "true" && value !== "false") throw new Error(`Invalid AI gateway configuration: ${name} must be true or false`);
  return value === "true";
};

export function loadConfig(environment = process.env) {
  const aiEnabled = boolean(environment, "AI_ENABLED");
  const trustProxy = boolean(environment, "TRUST_PROXY", false);
  if (!aiEnabled) return Object.freeze({ mode: "static", aiEnabled, trustProxy });

  const demoPassword = required(environment, "DEMO_PASSWORD");
  const sessionSecret = required(environment, "SESSION_SECRET");
  if (Buffer.byteLength(sessionSecret, "utf8") < 32) throw new Error("Invalid AI gateway configuration: SESSION_SECRET must contain at least 32 bytes");
  const chatCompletionsUrl = required(environment, "LLM_CHAT_COMPLETIONS_URL");
  let endpoint;
  try { endpoint = new URL(chatCompletionsUrl); } catch { throw new Error("Invalid AI gateway configuration: LLM_CHAT_COMPLETIONS_URL must be a complete URL"); }
  if (!endpoint.pathname || endpoint.pathname === "/" || !["https:", "http:"].includes(endpoint.protocol)) throw new Error("Invalid AI gateway configuration: LLM_CHAT_COMPLETIONS_URL must be a complete HTTP URL");

  const modelDisplayName = required(environment, "LLM_MODEL_DISPLAY_NAME");
  if (modelDisplayName !== "GPT-5.6 Luna") throw new Error("Invalid AI gateway configuration: LLM_MODEL_DISPLAY_NAME is unsupported");

  return Object.freeze({
    mode: "ai",
    aiEnabled,
    trustProxy,
    demoPassword,
    sessionSecret,
    chatCompletionsUrl: endpoint.toString(),
    apiKey: required(environment, "LLM_API_KEY"),
    modelDisplayName
  });
}
