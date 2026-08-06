import {
  createFetch,
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
  /** Extra headers sent with every request. */
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

// The API varies its response on User-Agent (it serves embed HTML to browsers
// and crawlers), so identify as a plain API client rather than sending
// whatever the runtime's default is.
const DEFAULT_USER_AGENT =
  "fxtwitter (+https://github.com/otnc/fxtwitter-wrapper)";

/** Narrow shape of the errors ofetch throws, avoiding a hard dependency on its class. */
interface OFetchLikeError {
  data?: unknown;
  status?: number;
  statusCode?: number;
  response?: { status?: number };
  name?: string;
  message?: string;
  cause?: unknown;
}

/** ofetch wraps aborts in a FetchError, so the original name lives on `cause`. */
function isAbort(error: OFetchLikeError): boolean {
  const names = new Set(["AbortError", "TimeoutError"]);
  if (error.name && names.has(error.name)) return true;

  const cause = error.cause;
  return isRecord(cause) && typeof cause.name === "string"
    ? names.has(cause.name)
    : false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Wraps ofetch with the conventions shared by the v1 and v2 clients:
 * `null` for 204 responses, and `FxTwitterError` for everything that fails.
 */
export class HttpClient {
  private readonly request: $Fetch;

  constructor(options: ClientOptions = {}) {
    // Error responses stay as thrown FetchErrors so ofetch's retry still
    // applies; `toFxTwitterError` unpacks them below.
    const defaults: FetchOptions = {
      baseURL: options.baseUrl ?? DEFAULT_BASE_URL,
      headers: { "User-Agent": DEFAULT_USER_AGENT, ...options.headers },
    };

    if (options.timeout !== undefined) defaults.timeout = options.timeout;
    if (options.retry !== undefined) defaults.retry = options.retry;
    if (options.retryDelay !== undefined) {
      defaults.retryDelay = options.retryDelay;
    }

    const globalOptions: CreateFetchOptions = { defaults };
    if (options.fetch) globalOptions.fetch = options.fetch;

    this.request = createFetch(globalOptions);
  }

  /** Runs a GET request and returns the parsed JSON body, or `null` on a 204. */
  async get<T>(options: RequestOptions): Promise<T | null> {
    // No `responseType` — ofetch picks it from the Content-Type, so a non-JSON
    // response arrives as a string instead of throwing a parse error.
    let response: { status: number; ok: boolean; _data?: unknown };
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

    // The v1 API answers some bad requests with its embed HTML at HTTP 200, or
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

function toFxTwitterError(cause: unknown): FxTwitterError {
  if (cause instanceof FxTwitterError) return cause;

  const error = isRecord(cause) ? (cause as OFetchLikeError) : {};

  if (isAbort(error)) {
    return new FxTwitterError("Request aborted or timed out", { cause });
  }

  const status = error.status ?? error.statusCode ?? error.response?.status;
  const data = error.data;

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

  return new FxTwitterError(error.message ?? "Network request failed", {
    status,
    body: data,
    cause,
  });
}
