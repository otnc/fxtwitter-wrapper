import { describe, expect, it } from "vitest";
import { FxTwitterError } from "./errors";
import { mockFetch, mockJson } from "./test-utils";
import { byUserId, FxTwitterV2 } from "./v2";

describe("FxTwitterV2", () => {
  it("getStatus sends about_account and lang query params", async () => {
    const client = mockJson({ code: 200 });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.getStatus("20", { aboutAccount: true, lang: "es" });

    const url = client.lastUrl;
    expect(url.pathname).toBe("/2/status/20");
    expect(url.searchParams.get("about_account")).toBe("1");
    expect(url.searchParams.get("lang")).toBe("es");
  });

  it("getStatus omits about_account when falsy", async () => {
    const client = mockJson({ code: 200 });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.getStatus("20");

    expect(client.lastUrl.searchParams.has("about_account")).toBe(false);
  });

  it("getProfile encodes the handle and supports byUserId", async () => {
    const client = mockJson({ code: 200 });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.getProfile(byUserId("783214"));

    expect(client.lastUrl.pathname).toBe("/2/profile/id%3A783214");
  });

  it("getProfileStatuses maps groupThreads/withReplies/since to upstream query names", async () => {
    const client = mockJson({ code: 200, results: [] });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.getProfileStatuses("X", {
      groupThreads: true,
      withReplies: true,
      since: 1700000000,
      count: 5,
    });

    const url = client.lastUrl;
    expect(url.pathname).toBe("/2/profile/X/statuses");
    expect(url.searchParams.get("groupthreads")).toBe("1");
    expect(url.searchParams.get("with_replies")).toBe("1");
    expect(url.searchParams.get("since")).toBe("1700000000");
    expect(url.searchParams.get("count")).toBe("5");
  });

  it("getProfileStatuses resolves to null on 204", async () => {
    const { fetchImpl } = mockFetch({ status: 204 });
    const v2 = new FxTwitterV2({ fetch: fetchImpl });

    await expect(v2.getProfileStatuses("X", { since: 1 })).resolves.toBeNull();
  });

  it("throws rather than returning null when another endpoint answers 204", async () => {
    const { fetchImpl } = mockFetch({ status: 204 });
    const v2 = new FxTwitterV2({ fetch: fetchImpl });

    await expect(v2.getStatus("20")).rejects.toBeInstanceOf(FxTwitterError);
  });

  it("search sends q, feed, count, cursor, and lang", async () => {
    const client = mockJson({ code: 200, results: [] });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.search("puppies", {
      feed: "top",
      count: 50,
      cursor: "abc",
      lang: "en",
    });

    const url = client.lastUrl;
    expect(url.pathname).toBe("/2/search");
    expect(url.searchParams.get("q")).toBe("puppies");
    expect(url.searchParams.get("feed")).toBe("top");
    expect(url.searchParams.get("count")).toBe("50");
    expect(url.searchParams.get("cursor")).toBe("abc");
    expect(url.searchParams.get("lang")).toBe("en");
  });

  it("typeahead joins resultType into a comma-separated list", async () => {
    const client = mockJson({
      code: 200,
      query: "a",
      num_results: 0,
      users: [],
      topics: [],
      events: [],
    });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.typeahead("a", { resultType: ["users", "topics"] });

    expect(client.lastUrl.searchParams.get("result_type")).toBe("users,topics");
  });

  it("trends always sends type=trending and forwards count", async () => {
    const client = mockJson({
      code: 200,
      timeline_type: "trending",
      trends: [],
      cursor: { top: null, bottom: null },
    });
    const v2 = new FxTwitterV2({ fetch: client.fetchImpl });

    await v2.trends({ count: 5 });

    const url = client.lastUrl;
    expect(url.searchParams.get("type")).toBe("trending");
    expect(url.searchParams.get("count")).toBe("5");
  });

  it("respects a custom base URL", async () => {
    const client = mockJson({ code: 200 });
    const v2 = new FxTwitterV2({
      fetch: client.fetchImpl,
      baseUrl: "https://self-hosted.example.com",
    });

    await v2.getStatusReposts("20");

    const url = client.lastUrl;
    expect(url.origin).toBe("https://self-hosted.example.com");
    expect(url.pathname).toBe("/2/status/20/reposts");
  });

  describe("empty result pages", () => {
    // List endpoints report "no results or timeline unavailable" as a 404
    // carrying an otherwise normal body, which is a result, not an error.
    const emptyBody = {
      code: 404,
      results: [],
      cursor: { top: null, bottom: null },
    };

    it("returns the empty page from search rather than throwing", async () => {
      const { fetchImpl } = mockFetch({ status: 404, body: emptyBody });
      const v2 = new FxTwitterV2({ fetch: fetchImpl, retry: false });

      await expect(v2.search("puppies")).resolves.toEqual(emptyBody);
    });

    it.each([
      ["getStatusReposts", (v2: FxTwitterV2) => v2.getStatusReposts("20")],
      ["getStatusQuotes", (v2: FxTwitterV2) => v2.getStatusQuotes("20")],
      ["getProfileStatuses", (v2: FxTwitterV2) => v2.getProfileStatuses("X")],
      ["getProfileArticles", (v2: FxTwitterV2) => v2.getProfileArticles("X")],
      ["getProfileMedia", (v2: FxTwitterV2) => v2.getProfileMedia("X")],
      ["getProfileFollowers", (v2: FxTwitterV2) => v2.getProfileFollowers("X")],
      ["getProfileFollowing", (v2: FxTwitterV2) => v2.getProfileFollowing("X")],
    ])("%s resolves with the empty page", async (_name, call) => {
      const { fetchImpl } = mockFetch({ status: 404, body: emptyBody });
      const v2 = new FxTwitterV2({ fetch: fetchImpl, retry: false });

      await expect(call(v2)).resolves.toEqual(emptyBody);
    });

    it("still throws on a 404 that carries no result page", async () => {
      const { fetchImpl } = mockFetch({
        status: 404,
        body: { code: 404, message: "User not found" },
      });
      const v2 = new FxTwitterV2({ fetch: fetchImpl, retry: false });

      await expect(v2.search("puppies")).rejects.toBeInstanceOf(FxTwitterError);
    });

    it("still throws for endpoints that return a single object", async () => {
      const { fetchImpl } = mockFetch({
        status: 404,
        body: { code: 404, message: "Not found" },
      });
      const v2 = new FxTwitterV2({ fetch: fetchImpl, retry: false });

      await expect(v2.getStatus("20")).rejects.toBeInstanceOf(FxTwitterError);
    });
  });

  it("surfaces API errors as FxTwitterError", async () => {
    const { fetchImpl } = mockFetch({
      status: 400,
      body: { code: 400, message: "id: tweet ID must be a numeric snowflake" },
    });
    const v2 = new FxTwitterV2({ fetch: fetchImpl, retry: false });

    const error = await v2.getStatus("1").catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    expect((error as FxTwitterError).code).toBe(400);
  });
});
