import { defineConfig } from "vite-plus";

export default defineConfig({
  server: {
    allowedHosts: [".e2b.app", ".onamp.dev"],
    proxy: {
      "/api": "http://127.0.0.1:3000",
    },
  },
  check: {
    fmt: false,
  },
  lint: {
    ignorePatterns: ["dist/**"],
  },
});
