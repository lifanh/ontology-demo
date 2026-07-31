import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const executable = name => path.join(root, "node_modules", ".bin", process.platform === "win32" ? `${name}.cmd` : name);
const gateway = spawn(process.execPath, [path.join(root, "server/node.js")], { cwd: root, env: { ...process.env, AI_ENABLED: process.env.AI_ENABLED ?? "false", PORT: process.env.API_PORT || "3000" }, stdio: "inherit" });
const vite = spawn(executable("vp"), ["dev", ...process.argv.slice(2)], { cwd: root, stdio: "inherit" });

const stop = signal => {
  gateway.kill(signal);
  vite.kill(signal);
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
gateway.on("exit", code => { vite.kill(); process.exitCode = code ?? 1; });
vite.on("exit", code => { gateway.kill(); process.exitCode = code ?? 1; });
