import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: ["src/index.ts", "src/v1.ts", "src/v2.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    target: "node22",
    platform: "node",
  },
  {
    entry: ["src/cli.ts"],
    format: "esm",
    dts: false,
    target: "node22",
    platform: "node",
  },
]);
