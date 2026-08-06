import type { ClientOptions } from "./http";
import { FxTwitterV1 } from "./v1";
import { FxTwitterV2 } from "./v2";

export type FxTwitterOptions = ClientOptions & {
  /** Overrides applied only to the v1 client. */
  v1?: Pick<ClientOptions, "baseUrl">;
  /** Overrides applied only to the v2 client. */
  v2?: Pick<ClientOptions, "baseUrl">;
};

/**
 * Combined client exposing every API version.
 *
 * Prefer importing a single version when you only need one — `FxTwitterV2`
 * from `fxtwitter/v2` — and reach for this only when you use both.
 *
 * ```ts
 * const fx = new FxTwitter();
 * const { status } = await fx.v2.getStatus("20");
 * const { tweet } = await fx.v1.getStatus("20");
 * ```
 */
export class FxTwitter {
  readonly v1: FxTwitterV1;
  readonly v2: FxTwitterV2;

  constructor(options: FxTwitterOptions = {}) {
    const { v1, v2, ...shared } = options;

    this.v1 = new FxTwitterV1({ ...shared, baseUrl: v1?.baseUrl });
    this.v2 = new FxTwitterV2({ ...shared, baseUrl: v2?.baseUrl });
  }
}
