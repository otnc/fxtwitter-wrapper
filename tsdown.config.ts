import { defineConfig } from "tsdown";

export default defineConfig({
  // "." plus the per-version subpath exports, so import paths stay stable as
  // further API versions are added alongside them.
  entry: ["src/index.ts", "src/v1.ts", "src/v2.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Node >= 22 supports ES2024
  target: "node22",
  platform: "node",
});
