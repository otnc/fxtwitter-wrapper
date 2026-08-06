// Each API version also ships under its own subpath (`fxtwitter/v1`,
// `fxtwitter/v2`), where its types are exported unqualified.
//
// Here, v1's types stay unqualified so existing imports keep working, and
// later versions are namespaced — the versions share many type names
// (`Photo`, `User`, `Poll`…) that would otherwise collide.

export { FxTwitter } from "./client";
export type { FxTwitterOptions } from "./client";

export { FxTwitterV1 } from "./v1";
export type {
  FxTwitterV1Options,
  GetStatusOptions,
  GetUserOptions,
} from "./v1";

export { byUserId, FxTwitterV2 } from "./v2";
export type { FxTwitterV2Options } from "./v2";

export { FxTwitterError } from "./errors";
export type { FxTwitterErrorOptions } from "./errors";
export type { ClientOptions } from "./http";

export type * from "./types/v1";
export type * as V2 from "./types/v2";
