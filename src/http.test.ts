import { describe, expect, it } from "vitest";
import { FxTwitterError } from "./errors";
import { HttpClient } from "./http";
import { mockFetch, mockJson } from "./test-utils";
import { environmentUserAgent } from "./user-agent";

describe("HttpClient", () => {
  it("returns the parsed JSON body on success", async () => {
    const { fetchImpl } = mockJson({ code: 200, message: "OK" });
    const http = new HttpClient({ fetch: fetchImpl });

    const result = await http.get<{ code: number; message: string }>({
      path: "/2/status/20",
    });

    expect(result).toEqual({ code: 200, message: "OK" });
  });

  it("builds the URL and omits undefined query values", async () => {
    const client = mockJson({ code: 200 });
    const http = new HttpClient({ fetch: client.fetchImpl });

    await http.get({
      path: "/2/search",
      query: { q: "puppies", cursor: undefined, count: 10 },
    });

    const url = client.lastUrl;
    expect(url.origin + url.pathname).toBe(
      "https://api.fxtwitter.com/2/search"
    );
    expect(url.searchParams.get("q")).toBe("puppies");
    expect(url.searchParams.get("count")).toBe("10");
    expect(url.searchParams.has("cursor")).toBe(false);
  });

  it("preserves a path prefix in a custom base URL", async () => {
    const client = mockJson({ code: 200 });
    const http = new HttpClient({
      fetch: client.fetchImpl,
      baseUrl: "https://self-hosted.example.com/fx",
    });

    await http.get({ path: "/2/status/20" });

    expect(client.lastUrl.pathname).toBe("/fx/2/status/20");
  });

  it("resolves to null on 204 No Content", async () => {
    const { fetchImpl } = mockFetch({ status: 204 });
    const http = new HttpClient({ fetch: fetchImpl });

    await expect(
      http.get({ path: "/2/profile/x/statuses" })
    ).resolves.toBeNull();
  });

  it("throws FxTwitterError with status/code/body on a non-2xx response", async () => {
    const { fetchImpl } = mockFetch({
      status: 404,
      body: { code: 404, message: "User not found" },
    });
    const http = new HttpClient({ fetch: fetchImpl, retry: false });

    const error = await http
      .get({ path: "/2/profile/nope" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    const fxError = error as FxTwitterError;
    expect(fxError.status).toBe(404);
    expect(fxError.code).toBe(404);
    expect(fxError.message).toBe("User not found");
    expect(fxError.body).toEqual({ code: 404, message: "User not found" });
  });

  it("explains HTML responses instead of failing to parse them", async () => {
    // The v1 API answers some bad requests with its embed page at HTTP 200.
    const { fetchImpl } = mockFetch({
      status: 200,
      text: "<!DOCTYPE html><html></html>",
      contentType: "text/html; charset=UTF-8",
    });
    const http = new HttpClient({ fetch: fetchImpl });

    const error = await http
      .get({ path: "/status/1" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    expect((error as FxTwitterError).message).toContain("an HTML document");
    expect((error as FxTwitterError).status).toBe(200);
  });

  it("wraps network failures in FxTwitterError, keeping the original as cause", async () => {
    const networkError = new Error("boom");
    const fetchImpl = (async () => {
      throw networkError;
    }) as unknown as typeof fetch;
    const http = new HttpClient({ fetch: fetchImpl, retry: false });

    const error = await http
      .get({ path: "/2/status/1" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    const fxError = error as FxTwitterError;
    // There is no HTTP response to read these from.
    expect(fxError.status).toBeUndefined();
    expect(fxError.code).toBeUndefined();
    expect(fxError.body).toBeUndefined();
    // ofetch wraps the original error in its own FetchError, which chains it
    // as `cause` in turn — the original is still reachable, just one level in.
    expect(fxError.cause).toBeInstanceOf(Error);
    expect((fxError.cause as Error).cause).toBe(networkError);
  });

  it("fills in a runtime User-Agent and keeps custom headers", async () => {
    const client = mockJson({ code: 200 });
    const http = new HttpClient({
      fetch: client.fetchImpl,
      headers: { "X-Test": "1" },
    });

    await http.get({ path: "/status/20" });

    const headers = new Headers(client.inits[0]?.headers);
    // The API answers 401 to requests that do not identify themselves.
    expect(headers.get("user-agent")).toBe(environmentUserAgent());
    expect(headers.get("user-agent")).toMatch(/^Node\.js\/\d+\./);
    expect(headers.get("x-test")).toBe("1");
  });

  it("does not override a User-Agent the caller supplied", async () => {
    const client = mockJson({ code: 200 });
    const http = new HttpClient({
      fetch: client.fetchImpl,
      headers: { "User-Agent": "MyBot/1.0 (+https://example.com)" },
    });

    await http.get({ path: "/status/20" });

    expect(new Headers(client.inits[0]?.headers).get("user-agent")).toBe(
      "MyBot/1.0 (+https://example.com)"
    );
  });

  it("recognises a caller's User-Agent whatever its casing", async () => {
    const client = mockJson({ code: 200 });
    const http = new HttpClient({
      fetch: client.fetchImpl,
      headers: { "user-agent": "MyBot/1.0" },
    });

    await http.get({ path: "/status/20" });

    expect(new Headers(client.inits[0]?.headers).get("user-agent")).toBe(
      "MyBot/1.0"
    );
  });

  it("leaves the caller's headers object untouched", async () => {
    const client = mockJson({ code: 200 });
    const headers = { "X-Test": "1" };
    const http = new HttpClient({ fetch: client.fetchImpl, headers });

    await http.get({ path: "/status/20" });

    expect(headers).toEqual({ "X-Test": "1" });
  });

  it("reports the API's User-Agent requirement, which uses an `error` body", async () => {
    const { fetchImpl } = mockFetch({
      status: 401,
      body: { error: "You must identify yourself with a User-Agent header" },
    });
    const http = new HttpClient({ fetch: fetchImpl, retry: false });

    const error = await http
      .get({ path: "/status/20" })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    expect((error as FxTwitterError).status).toBe(401);
    expect((error as FxTwitterError).message).toContain("User-Agent");
  });

  it("forwards an AbortSignal, keeping the original error as cause", async () => {
    const controller = new AbortController();
    controller.abort();
    const { fetchImpl } = mockJson({ code: 200 });
    const http = new HttpClient({ fetch: fetchImpl, retry: false });

    const error = await http
      .get({ path: "/2/status/20", signal: controller.signal })
      .catch((err: unknown) => err);

    expect(error).toBeInstanceOf(FxTwitterError);
    expect((error as FxTwitterError).cause).toBeDefined();
  });

  it("retries retryable statuses when asked", async () => {
    const client = mockFetch(
      { status: 500, body: { code: 500, message: "API_FAIL" } },
      { status: 200, body: { code: 200, message: "OK" } }
    );
    const http = new HttpClient({ fetch: client.fetchImpl, retry: 1 });

    await expect(http.get({ path: "/2/status/20" })).resolves.toEqual({
      code: 200,
      message: "OK",
    });
    expect(client.mock).toHaveBeenCalledTimes(2);
  });
});
