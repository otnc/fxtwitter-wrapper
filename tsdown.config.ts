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
    deps: { alwaysBundle: ["citty"], onlyBundle: ["citty"] },
    copy: [
      { from: "node_modules/citty/LICENSE", rename: "LICENSE-citty" },
      {
        from: "node_modules/citty/dist/THIRD-PARTY-LICENSES.md",
        rename: "THIRD-PARTY-LICENSES-citty.md",
      },
    ],
    format: "esm",
    dts: false,
    target: "node22",
    platform: "node",
  },
]);
