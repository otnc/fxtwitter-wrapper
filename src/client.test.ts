import { describe, expect, it } from "vitest";
import { FxTwitter } from "./client";
import { mockJson } from "./test-utils";

describe("FxTwitter", () => {
  it("shares fetch and headers across versions but honors separate base URLs", async () => {
    const client = mockJson({ code: 200, message: "OK", tweet: null });
    const fx = new FxTwitter({
      fetch: client.fetchImpl,
      headers: { "X-Test": "1" },
      v1: { baseUrl: "https://v1.example.com" },
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
});
