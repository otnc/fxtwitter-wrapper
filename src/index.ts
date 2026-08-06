// Each API version also ships under its own subpath (`fxtwitter/v1`), so those
// import paths stay stable as further versions are added here.

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
