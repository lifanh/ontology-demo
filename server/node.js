import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConnInfo } from "@hono/node-server/conninfo";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createOpenAiProvider } from "./openai-provider.js";
import { draftRuleExecutor } from "./draft-rule.js";
import { explainReviewExecutor } from "./review-evidence.js";

const config = loadConfig();
const provider = config.aiEnabled ? createOpenAiProvider(config) : undefined;
const app = createApp({ config, ...(provider ? { provider, aiExecutors: { draft_rule: draftRuleExecutor, explain_review: explainReviewExecutor } } : {}), clientIp: c => getConnInfo(c).remote.address || "unknown" });
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
app.use("/*", serveStatic({ root: dist }));
app.get("*", serveStatic({ path: path.join(dist, "index.html") }));

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
serve({ fetch: app.fetch, port }, info => console.log(`AI Credit Review demo listening on port ${info.port} in ${config.mode} mode`));
