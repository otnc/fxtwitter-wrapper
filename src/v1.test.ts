import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDeprecationWarnings } from "./deprecation";
import { FxTwitterError } from "./errors";
import { mockFetch, mockJson } from "./test-utils";
import { FxTwitterV1 } from "./v1";

const silent = { silenceDeprecationWarning: true } as const;

describe("FxTwitterV1", () => {
  beforeEach(() => {
    resetDeprecationWarnings();
  });

  it("requests /status/:id when no screen name or translation is given", async () => {
    const client = mockJson({ code: 200, message: "OK", tweet: { id: "20" } });
    const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

    const result = await v1.getStatus("20");

    expect(client.calls[0]).toBe("https://api.fxtwitter.com/status/20");
    expect(result.tweet?.id).toBe("20");
  });

  it("includes the screen name and translation segments when given", async () => {
    const client = mockJson({ code: 200, message: "OK", tweet: null });
    const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

    await v1.getStatus("1548602399862013953", {
      screenName: "dangeredwolf",
      translateTo: "es",
    });

    expect(client.calls[0]).toBe(
      "https://api.fxtwitter.com/dangeredwolf/status/1548602399862013953/es"
    );
  });

  it("fetches a user profile from /:handle", async () => {
    const client = mockJson({
      code: 200,
      message: "OK",
      user: { screen_name: "jack", tweets: 30859 },
    });
    const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

    const result = await v1.getUser("jack");

    expect(client.calls[0]).toBe("https://api.fxtwitter.com/jack");
    expect(result.user?.tweets).toBe(30859);
  });

  it("respects a custom base URL", async () => {
    const client = mockJson({ code: 200, message: "OK", tweet: null });
    const v1 = new FxTwitterV1({
      fetch: client.fetchImpl,
      baseUrl: "https://self-hosted.example.com",
      ...silent,
    });

    await v1.getStatus("20");

    expect(client.calls[0]).toBe("https://self-hosted.example.com/status/20");
  });

  it("surfaces API errors as FxTwitterError", async () => {
    const { fetchImpl } = mockFetch({
      status: 404,
      body: { code: 404, message: "NOT_FOUND", tweet: null },
    });
    const v1 = new FxTwitterV1({ fetch: fetchImpl, retry: false, ...silent });

    const error = await v1.getStatus("20").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    expect((error as FxTwitterError).code).toBe(404);
    expect((error as FxTwitterError).message).toBe("NOT_FOUND");
  });

  it("reports the User-Agent requirement, which uses an `error` body", async () => {
    const { fetchImpl } = mockFetch({
      status: 401,
      body: { error: "You must identify yourself with a User-Agent header" },
    });
    const v1 = new FxTwitterV1({ fetch: fetchImpl, retry: false, ...silent });

    const error = await v1.getUser("jack").catch((err: unknown) => err);

    expect((error as FxTwitterError).message).toContain("User-Agent");
    expect((error as FxTwitterError).status).toBe(401);
  });

  describe("deprecation warning", () => {
    it("emits one, once per process", () => {
      const emitWarning = vi
        .spyOn(process, "emitWarning")
        .mockImplementation(() => undefined);
      const { fetchImpl } = mockJson({ code: 200 });

      new FxTwitterV1({ fetch: fetchImpl });
      new FxTwitterV1({ fetch: fetchImpl });

      expect(emitWarning).toHaveBeenCalledTimes(1);
      expect(emitWarning).toHaveBeenCalledWith(
        expect.stringContaining("legacy FxTwitter v1 API"),
        expect.objectContaining({
          type: "DeprecationWarning",
          code: "FXTWITTER_V1_DEPRECATED",
        })
      );

      emitWarning.mockRestore();
    });

    it("can be silenced", () => {
      const emitWarning = vi
        .spyOn(process, "emitWarning")
        .mockImplementation(() => undefined);
      const { fetchImpl } = mockJson({ code: 200 });

      new FxTwitterV1({ fetch: fetchImpl, ...silent });

      expect(emitWarning).not.toHaveBeenCalled();
      emitWarning.mockRestore();
    });
  });

  describe("input validation", () => {
    // These inputs make the API answer with embed HTML or a redirect rather
    // than JSON, so they are rejected before a request goes out.
    it.each(["1", "", "abc", "12345678901234567890123", "20/../x"])(
      "rejects invalid status ID %j without making a request",
      async (id) => {
        const client = mockJson({ code: 200 });
        const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

        await expect(v1.getStatus(id)).rejects.toBeInstanceOf(FxTwitterError);
        expect(client.calls).toHaveLength(0);
      }
    );

    it.each(["", "toolonghandle1234", "has-dash", "@jack"])(
      "rejects invalid handle %j without making a request",
      async (handle) => {
        const client = mockJson({ code: 200 });
        const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

        await expect(v1.getUser(handle)).rejects.toBeInstanceOf(FxTwitterError);
        expect(client.calls).toHaveLength(0);
      }
    );

    it("rejects an empty screenName, which would break the path shape", async () => {
      const client = mockJson({ code: 200 });
      const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

      await expect(
        v1.getStatus("20", { screenName: "  " })
      ).rejects.toBeInstanceOf(FxTwitterError);
      expect(client.calls).toHaveLength(0);
    });

    it("accepts any non-empty screenName, since the API ignores it", async () => {
      const client = mockJson({ code: 200, message: "OK", tweet: null });
      const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

      await v1.getStatus("20", { screenName: "way_too_long_handle" });

      expect(client.calls[0]).toBe(
        "https://api.fxtwitter.com/way_too_long_handle/status/20"
      );
    });

    it("accepts handles at the 15-character limit", async () => {
      const client = mockJson({ code: 200, message: "OK", user: {} });
      const v1 = new FxTwitterV1({ fetch: client.fetchImpl, ...silent });

      await v1.getUser("abcde1234567890");

      expect(client.calls).toHaveLength(1);
    });
  });
});
