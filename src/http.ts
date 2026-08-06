import { defu } from "defu";
import {
  createFetch,
  FetchError,
  type CreateFetchOptions,
  type FetchOptions,
  type $Fetch,
} from "ofetch";
import { FxTwitterError } from "./errors";

export type QueryValue = string | number | boolean | undefined;

/** Options shared by every client, forwarded to ofetch. */
export interface ClientOptions {
  /** Overrides the API host. Defaults to `https://api.fxtwitter.com`. */
  baseUrl?: string;
  /** Custom fetch implementation (e.g. a mock, or undici in older runtimes). */
  fetch?: typeof fetch;
  /**
   * Extra headers sent with every request.
   *
   * The API requires a `User-Agent` identifying the caller and answers `401`
   * without one. Most runtimes set it automatically; set it here on those that
   * don't, or to identify your app.
   */
  headers?: Record<string, string>;
  /** Abort a request after this many milliseconds. Disabled by default. */
  timeout?: number;
  /** Retry count for failed requests. Defaults to ofetch's `1` for GET. */
  retry?: number | false;
  /** Delay between retries in milliseconds. Defaults to `0`. */
  retryDelay?: number;
}

export interface RequestOptions {
  path: string;
  query?: Record<string, QueryValue>;
  /** Per-call cancellation, composed with the client-level `timeout`. */
  signal?: AbortSignal;
}

export const DEFAULT_BASE_URL = "https://api.fxtwitter.com";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Wraps ofetch with the conventions shared by the clients: `null` for 204
 * responses, and `FxTwitterError` for everything that fails.
 */
export class HttpClient {
  private readonly request: $Fetch;

  constructor(options: ClientOptions = {}) {
    // Error responses stay as thrown FetchErrors so ofetch's retry still
    // applies; `toFxTwitterError` unpacks them below.
    const defaults: FetchOptions = defu(
      {
        baseURL: options.baseUrl,
        headers: options.headers,
        timeout: options.timeout,
        retry: options.retry,
        retryDelay: options.retryDelay,
      },
      { baseURL: DEFAULT_BASE_URL }
    );

    const globalOptions: CreateFetchOptions = { defaults };
    if (options.fetch) globalOptions.fetch = options.fetch;

    this.request = createFetch(globalOptions);
  }

  /** Runs a GET request and returns the parsed JSON body, or `null` on a 204. */
  async get<T>(options: RequestOptions): Promise<T | null> {
    // No `responseType` — ofetch picks it from the Content-Type, so a non-JSON
    // response arrives as a string instead of throwing a parse error.
    let response: { status: number; _data?: unknown };
    try {
      response = await this.request.raw(options.path, {
        query: options.query,
        signal: options.signal,
      });
    } catch (cause) {
      throw toFxTwitterError(cause);
    }

    if (response.status === 204) return null;

    const body: unknown = response._data;

    // The API answers some bad requests with its embed HTML at HTTP 200, or
    // redirects to the project's GitHub page — a non-object body here means the
    // request never reached a JSON endpoint.
    if (!isRecord(body)) {
      throw new FxTwitterError(nonJsonMessage(body, response.status), {
        status: response.status,
        body,
      });
    }

    return body as T;
  }
}

function nonJsonMessage(body: unknown, status: number): string {
  const kind =
    typeof body === "string"
      ? body.trimStart().startsWith("<")
        ? "an HTML document"
        : "a plain text body"
      : `a ${typeof body} body`;

  return (
    `Expected a JSON response but got ${kind} (HTTP ${status}). ` +
    "The endpoint may not exist, or the request was redirected."
  );
}

/** ofetch wraps aborts in a FetchError, so the original name lives on `cause`. */
function isAbort(error: Error): boolean {
  const names = new Set(["AbortError", "TimeoutError"]);
  if (names.has(error.name)) return true;

  const cause: unknown = error.cause;
  return isRecord(cause) && typeof cause.name === "string"
    ? names.has(cause.name)
    : false;
}

function toFxTwitterError(cause: unknown): FxTwitterError {
  if (cause instanceof FxTwitterError) return cause;
  if (!(cause instanceof Error)) {
    return new FxTwitterError("Network request failed", { cause });
  }
  if (isAbort(cause)) {
    return new FxTwitterError("Request aborted or timed out", { cause });
  }
  if (!(cause instanceof FetchError)) {
    return new FxTwitterError(cause.message, { cause });
  }

  const status = cause.status ?? cause.response?.status;
  const data: unknown = cause.data;

  // Documented error responses carry `{ code, message }`. The API-wide
  // User-Agent check answers 401 with `{ error }` instead.
  if (isRecord(data)) {
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : `Request failed with HTTP ${status ?? "error"}`;

    return new FxTwitterError(message, {
      status,
      code: typeof data.code === "number" ? data.code : undefined,
      body: data,
      cause,
    });
  }

  if (data !== undefined && status !== undefined) {
    return new FxTwitterError(nonJsonMessage(data, status), {
      status,
      body: data,
      cause,
    });
  }

  return new FxTwitterError(cause.message, { status, body: data, cause });
}
