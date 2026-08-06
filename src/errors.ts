export interface FxTwitterErrorOptions {
  /** HTTP status code returned by the API. */
  status?: number;
  /** `code` field from the JSON response body (mirrors the HTTP status). */
  code?: number;
  /** Parsed response body, when available. */
  body?: unknown;
  cause?: unknown;
}

/** Thrown for any non-2xx response, network failure, timeout, or unparsable body. */
export class FxTwitterError extends Error {
  readonly status?: number;
  readonly code?: number;
  readonly body?: unknown;

  constructor(message: string, options: FxTwitterErrorOptions = {}) {
    super(
      message,
      options.cause !== undefined ? { cause: options.cause } : undefined
    );
    this.name = "FxTwitterError";
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
  }
}
