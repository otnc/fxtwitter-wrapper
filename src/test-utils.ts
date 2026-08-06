import { vi } from "vitest";

export interface MockResponseInit {
  status?: number;
  body?: unknown;
  /** Raw body, used to simulate the HTML the v1 API returns for bad requests. */
  text?: string;
  contentType?: string;
}

/** Builds a `fetch`-compatible mock that records request URLs and returns fixed responses. */
export function mockFetch(...responses: MockResponseInit[]) {
  const calls: string[] = [];
  const inits: (RequestInit | undefined)[] = [];
  let index = 0;

  const fetchImpl = vi.fn<typeof fetch>(async (input, init) => {
    calls.push(input.toString());
    inits.push(init);

    if (init?.signal?.aborted) {
      throw Object.assign(new Error("This operation was aborted"), {
        name: "AbortError",
      });
    }

    const spec = responses[Math.min(index, responses.length - 1)] ?? {};
    index += 1;

    const status = spec.status ?? 200;
    if (status === 204) {
      return new Response(null, { status });
    }

    const contentType = spec.contentType ?? "application/json";
    const body = spec.text ?? JSON.stringify(spec.body ?? {});
    return new Response(body, {
      status,
      headers: { "content-type": contentType },
    });
  });

  return {
    fetchImpl: fetchImpl as unknown as typeof fetch,
    mock: fetchImpl,
    calls,
    inits,
    get lastUrl() {
      return new URL(calls[calls.length - 1]!);
    },
  };
}

/** Shorthand for the common "one successful JSON response" case. */
export function mockJson(body: unknown, status = 200) {
  return mockFetch({ status, body });
}
