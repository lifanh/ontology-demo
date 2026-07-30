import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { getConnInfo } from "@hono/node-server/conninfo";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp({ config, clientIp: c => getConnInfo(c).remote.address || "unknown" });
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
app.use("/*", serveStatic({ root: dist }));
app.get("*", serveStatic({ path: path.join(dist, "index.html") }));

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
serve({ fetch: app.fetch, port }, info => console.log(`AI Credit Review demo listening on port ${info.port} in ${config.mode} mode`));
