import path from "node:path";
import os from "node:os";

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
  const copilotModel = environment.COPILOT_MODEL?.trim() || "gpt-5.6-luna";
  const copilotHome = path.resolve(environment.COPILOT_HOME?.trim() || path.join(os.homedir(), ".copilot"));
  const copilotToken = environment.COPILOT_GITHUB_TOKEN?.trim() || undefined;

  return Object.freeze({
    mode: "ai",
    aiEnabled,
    trustProxy,
    demoPassword,
    sessionSecret,
    copilotModel,
    copilotHome,
    copilotToken,
    modelDisplayName: `GitHub Copilot (${copilotModel})`
  });
}
