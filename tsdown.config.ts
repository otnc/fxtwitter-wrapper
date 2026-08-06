import { readFileSync } from "node:fs";
import { defineConfig } from "tsdown";

const { version } = JSON.parse(
  readFileSync(new URL("package.json", import.meta.url), "utf8")
) as { version: string };

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
  // Keeps the User-Agent version in sync with package.json automatically.
  define: { __PACKAGE_VERSION__: JSON.stringify(version) },
});
