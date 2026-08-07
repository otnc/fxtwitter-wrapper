import { beforeEach, describe, expect, it, vi } from "vitest";
import { FxTwitter } from "./client";
import { resetDeprecationWarnings } from "./deprecation";
import { mockJson } from "./test-utils";

describe("FxTwitter", () => {
  beforeEach(() => {
    resetDeprecationWarnings();
  });

  it("shares fetch and headers across versions but honors separate base URLs", async () => {
    const client = mockJson({ code: 200, message: "OK", tweet: null });
    const fx = new FxTwitter({
      fetch: client.fetchImpl,
      headers: { "X-Test": "1" },
      v1: {
        baseUrl: "https://v1.example.com",
        silenceDeprecationWarning: true,
      },
      v2: { baseUrl: "https://v2.example.com" },
    });

    await fx.v2.getStatus("20");
    await fx.v1.getStatus("20");

    expect(client.calls[0]).toBe("https://v2.example.com/2/status/20");
    expect(client.calls[1]).toBe("https://v1.example.com/status/20");
    for (const init of client.inits) {
      expect(new Headers(init?.headers).get("x-test")).toBe("1");
    }
  });

  it("defaults both versions to api.fxtwitter.com", async () => {
    const client = mockJson({ code: 200 });
    const fx = new FxTwitter({ fetch: client.fetchImpl });

    await fx.v2.getStatus("20");

    expect(client.calls[0]).toBe("https://api.fxtwitter.com/2/status/20");
  });

  it("does not warn until the v1 client is actually accessed", () => {
    const emitWarning = vi
      .spyOn(process, "emitWarning")
      .mockImplementation(() => undefined);
    const { fetchImpl } = mockJson({ code: 200 });

    const fx = new FxTwitter({ fetch: fetchImpl });
    expect(emitWarning).not.toHaveBeenCalled();

    void fx.v1;
    expect(emitWarning).toHaveBeenCalledTimes(1);

    emitWarning.mockRestore();
  });

  it("reuses the same v1 instance across accesses", () => {
    const { fetchImpl } = mockJson({ code: 200 });
    const fx = new FxTwitter({
      fetch: fetchImpl,
      v1: { silenceDeprecationWarning: true },
    });

    expect(fx.v1).toBe(fx.v1);
  });
});
