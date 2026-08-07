import { emitDeprecationWarning } from "./deprecation";
import { FxTwitterError } from "./errors";
import { type ClientOptions, HttpClient } from "./http";
import type { StatusResponse, UserResponse } from "./types/v1";

export type FxTwitterV1Options = ClientOptions & {
  /** Suppresses the one-time deprecation warning emitted on construction. */
  silenceDeprecationWarning?: boolean;
};

export interface GetStatusOptions {
  /**
   * Included in the URL for readability only. The API resolves the status from
   * `id` alone and never validates this, so a wrong handle still succeeds.
   */
  screenName?: string;
  /**
   * Language to translate the status into, as an ISO 639-1 code (`es`) or a
   * locale (`zh-cn`). Adds a `translation` object to the returned status.
   */
  translateTo?: string;
  /** Per-call cancellation, composed with the client-level `timeout`. */
  signal?: AbortSignal;
}

export interface GetUserOptions {
  signal?: AbortSignal;
}

/**
 * The API resolves a status from the first 2-20 digit run in the path segment,
 * and answers anything else with its embed HTML at HTTP 200 rather than JSON.
 */
const STATUS_ID_PATTERN = /^\d{2,20}$/;

/**
 * Handles are matched as `\w{1,15}` upstream; anything else is redirected to
 * the project's GitHub page instead of returning JSON.
 */
const HANDLE_PATTERN = /^\w{1,15}$/;

const DEPRECATION_MESSAGE =
  "FxTwitterV1 targets the legacy FxTwitter v1 API, which is kept only for " +
  "backwards compatibility and does not receive new features. Use " +
  'FxTwitterV2 (import from "fxtwitter/v2") instead.';

/**
 * Client for the legacy FxTwitter v1 API.
 *
 * @deprecated Use {@link import("./v2").FxTwitterV2} instead. v1 is kept only
 * for backwards compatibility and does not receive new features.
 */
export class FxTwitterV1 {
  private readonly http: HttpClient;

  constructor(options: FxTwitterV1Options = {}) {
    if (!options.silenceDeprecationWarning) {
      emitDeprecationWarning("FXTWITTER_V1_DEPRECATED", DEPRECATION_MESSAGE);
    }
    this.http = new HttpClient(options);
  }

  /**
   * Fetches a single status by its snowflake ID.
   *
   * `GET /status/:id`, `GET /status/:id/:language`,
   * `GET /:handle/status/:id`, `GET /:handle/status/:id/:language`
   */
  async getStatus(
    id: string,
    options: GetStatusOptions = {}
  ): Promise<StatusResponse> {
    if (!STATUS_ID_PATTERN.test(id)) {
      throw new FxTwitterError(
        `Invalid status ID ${JSON.stringify(id)}: expected 2-20 digits`
      );
    }
    // Not checked against HANDLE_PATTERN: the status route ignores the handle,
    // so only a value that would break the path shape is a problem.
    if (options.screenName !== undefined && options.screenName.trim() === "") {
      throw new FxTwitterError("screenName must not be empty");
    }

    const segments = [
      options.screenName,
      "status",
      id,
      options.translateTo,
    ].filter((segment): segment is string => segment !== undefined);

    return requireBody(
      await this.http.get<StatusResponse>({
        path: `/${segments.map(encodeURIComponent).join("/")}`,
        signal: options.signal,
      })
    );
  }

  /** Fetches a user profile by handle (`GET /:handle`). */
  async getUser(
    screenName: string,
    options: GetUserOptions = {}
  ): Promise<UserResponse> {
    assertHandle(screenName);

    return requireBody(
      await this.http.get<UserResponse>({
        path: `/${encodeURIComponent(screenName)}`,
        signal: options.signal,
      })
    );
  }
}

function assertHandle(handle: string): void {
  if (!HANDLE_PATTERN.test(handle)) {
    throw new FxTwitterError(
      `Invalid handle ${JSON.stringify(handle)}: expected 1-15 letters, ` +
        "digits or underscores, without a leading @"
    );
  }
}

/** v1 never answers 204, so an empty body here means something went wrong. */
function requireBody<T>(body: T | null): T {
  if (body === null) {
    throw new FxTwitterError("The API returned an empty response");
  }
  return body;
}

export type * from "./types/v1";
