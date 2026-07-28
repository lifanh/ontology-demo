import { defineConfig } from "vite-plus";

export default defineConfig({
  check: {
    fmt: false,
  },
  lint: {
    ignorePatterns: ["dist/**"],
  },
});
