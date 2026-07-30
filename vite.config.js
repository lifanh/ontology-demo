import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    allowedHosts: [".e2b.app", ".onamp.dev"],
  },
  check: {
    fmt: false,
  },
  lint: {
    ignorePatterns: ["dist/**"],
  },
});
