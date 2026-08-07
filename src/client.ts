import type { ClientOptions } from "./http";
import { FxTwitterV1 } from "./v1";
import { FxTwitterV2 } from "./v2";

export type FxTwitterOptions = ClientOptions & {
  /** Overrides applied only to the v1 client. */
  v1?: Pick<ClientOptions, "baseUrl"> & {
    /** Suppresses the one-time deprecation warning emitted when `v1` is first accessed. */
    silenceDeprecationWarning?: boolean;
  };
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
  readonly v2: FxTwitterV2;

  private readonly v1Options: ClientOptions & {
    silenceDeprecationWarning?: boolean;
  };
  private v1Client?: FxTwitterV1;

  constructor(options: FxTwitterOptions = {}) {
    const { v1, v2, ...shared } = options;

    this.v2 = new FxTwitterV2({ ...shared, baseUrl: v2?.baseUrl });
    this.v1Options = {
      ...shared,
      baseUrl: v1?.baseUrl,
      silenceDeprecationWarning: v1?.silenceDeprecationWarning,
    };
  }

  /**
   * The legacy v1 client, constructed on first access so its deprecation
   * warning is only emitted if you actually use it.
   *
   * @deprecated Use {@link FxTwitter.v2} instead.
   */
  get v1(): FxTwitterV1 {
    this.v1Client ??= new FxTwitterV1(this.v1Options);
    return this.v1Client;
  }
}
