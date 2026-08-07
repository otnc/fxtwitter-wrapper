import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hasHeader } from "./user-agent";

describe("environmentUserAgent", () => {
  it("names the runtime and its version", async () => {
    // The suite runs on Node; other runtimes are covered below via mocking.
    const { environmentUserAgent } = await import("./user-agent");
    expect(environmentUserAgent()).toBe(`Node.js/${process.versions.node}`);
  });

  it("is a single well-formed product token", async () => {
    const { environmentUserAgent } = await import("./user-agent");
    expect(environmentUserAgent()).toMatch(/^[\w.-]+(\/[\w.+-]+)?$/);
  });

  it("says nothing about this package", async () => {
    const { environmentUserAgent } = await import("./user-agent");
    const userAgent = environmentUserAgent() ?? "";
    expect(userAgent.toLowerCase()).not.toContain("fxtwitter");
    expect(userAgent).not.toContain("github.com");
  });

  describe("per runtime", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.doUnmock("std-env");
      vi.unstubAllGlobals();
    });

    it("returns null in browsers, regardless of runtime", async () => {
      vi.doMock("std-env", () => ({ hasWindow: true, runtime: "node" }));
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBeNull();
    });

    it("names Bun using the global Bun.version", async () => {
      vi.doMock("std-env", () => ({ hasWindow: false, runtime: "bun" }));
      vi.stubGlobal("Bun", { version: "1.3.0" });
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBe("Bun/1.3.0");
    });

    it("names Bun without a version when the global is unavailable", async () => {
      vi.doMock("std-env", () => ({ hasWindow: false, runtime: "bun" }));
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBe("Bun");
    });

    it("names Deno using the global Deno.version.deno", async () => {
      vi.doMock("std-env", () => ({ hasWindow: false, runtime: "deno" }));
      vi.stubGlobal("Deno", { version: { deno: "2.0.0" } });
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBe("Deno/2.0.0");
    });

    it.each([
      ["workerd", "Cloudflare-Workers"],
      ["edge-light", "Vercel-Edge"],
      ["fastly", "Fastly-Compute"],
      ["netlify", "Netlify-Edge"],
    ])("names %s as %s", async (runtime, expected) => {
      vi.doMock("std-env", () => ({ hasWindow: false, runtime }));
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBe(expected);
    });

    it("falls back to the raw runtime name when it isn't specially handled", async () => {
      vi.doMock("std-env", () => ({
        hasWindow: false,
        runtime: "some-future-runtime",
      }));
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBe("some-future-runtime");
    });

    it("returns null when there is no runtime name at all", async () => {
      vi.doMock("std-env", () => ({ hasWindow: false, runtime: "" }));
      const { environmentUserAgent } = await import("./user-agent");
      expect(environmentUserAgent()).toBeNull();
    });
  });
});

describe("hasHeader", () => {
  it.each([
    ["User-Agent", true],
    ["user-agent", true],
    ["USER-AGENT", true],
  ])("matches %j regardless of case", (key, expected) => {
    expect(hasHeader({ [key]: "x" }, "User-Agent")).toBe(expected);
  });

  it("is false for a missing header or no headers at all", () => {
    expect(hasHeader({ Accept: "application/json" }, "User-Agent")).toBe(false);
    expect(hasHeader(undefined, "User-Agent")).toBe(false);
  });
});
