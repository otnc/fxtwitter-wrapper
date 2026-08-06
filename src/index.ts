// This release covers the FxTwitter v1 API only. The v2 client lives on the
// `release/v2` branch and will be published under the `fxtwitter/v2` subpath.

export { FxTwitterV1 } from "./v1";
export type {
  FxTwitterV1Options,
  GetStatusOptions,
  GetUserOptions,
} from "./v1";

export { FxTwitterError } from "./errors";
export type { FxTwitterErrorOptions } from "./errors";
export type { ClientOptions } from "./http";

export type * from "./types/v1";
