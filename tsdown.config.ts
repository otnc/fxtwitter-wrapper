import { defineConfig } from "tsdown";

export default defineConfig({
  // "." plus the "fxtwitter/v1" subpath export, so the import path stays
  // stable once the v2 client ships alongside it.
  entry: ["src/index.ts", "src/v1.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  // Node >= 22 supports ES2024
  target: "node22",
  platform: "node",
});
