import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  emitDeprecationWarning,
  resetDeprecationWarnings,
} from "./deprecation";

describe("emitDeprecationWarning", () => {
  beforeEach(() => {
    resetDeprecationWarnings();
  });

  it("emits via process.emitWarning with the given code and message", () => {
    const emitWarning = vi
      .spyOn(process, "emitWarning")
      .mockImplementation(() => undefined);

    emitDeprecationWarning("TEST_CODE", "test message");

    expect(emitWarning).toHaveBeenCalledWith("test message", {
      type: "DeprecationWarning",
      code: "TEST_CODE",
    });
    emitWarning.mockRestore();
  });

  it("emits a given code only once, even across messages", () => {
    const emitWarning = vi
      .spyOn(process, "emitWarning")
      .mockImplementation(() => undefined);

    emitDeprecationWarning("TEST_CODE", "first");
    emitDeprecationWarning("TEST_CODE", "second");

    expect(emitWarning).toHaveBeenCalledTimes(1);
    emitWarning.mockRestore();
  });

  it("tracks codes independently", () => {
    const emitWarning = vi
      .spyOn(process, "emitWarning")
      .mockImplementation(() => undefined);

    emitDeprecationWarning("CODE_A", "a");
    emitDeprecationWarning("CODE_B", "b");

    expect(emitWarning).toHaveBeenCalledTimes(2);
    emitWarning.mockRestore();
  });

  describe("without process.emitWarning", () => {
    let original: typeof process.emitWarning;

    beforeEach(() => {
      original = process.emitWarning;
      // @ts-expect-error - simulating a runtime without process.emitWarning
      delete process.emitWarning;
    });

    afterEach(() => {
      process.emitWarning = original;
    });

    it("falls back to console.warn", () => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);

      emitDeprecationWarning("TEST_CODE", "test message");

      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("test message")
      );
      warn.mockRestore();
    });
  });
});
