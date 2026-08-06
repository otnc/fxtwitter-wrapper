import { describe, expect, it } from "vitest";
import { environmentUserAgent, hasHeader } from "./user-agent";

describe("environmentUserAgent", () => {
  it("names the runtime and its version", () => {
    // The suite runs on Node; other runtimes are covered by the same mapping.
    expect(environmentUserAgent()).toBe(`Node.js/${process.versions.node}`);
  });

  it("is a single well-formed product token", () => {
    expect(environmentUserAgent()).toMatch(/^[\w.-]+(\/[\w.+-]+)?$/);
  });

  it("says nothing about this package", () => {
    const userAgent = environmentUserAgent() ?? "";
    expect(userAgent.toLowerCase()).not.toContain("fxtwitter");
    expect(userAgent).not.toContain("github.com");
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
