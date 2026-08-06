import { hasWindow, provider, runtime } from "std-env";

/**
 * Package version, inlined at build time by tsdown's `define`. Falls back to
 * `0.0.0` when running straight from source (tests, `tsc --noEmit`).
 */
declare const __PACKAGE_VERSION__: string | undefined;

const version =
  typeof __PACKAGE_VERSION__ === "string" ? __PACKAGE_VERSION__ : "0.0.0";

const HOMEPAGE = "https://github.com/otnc/fxtwitter-wrapper";

/**
 * The API rejects requests without a `User-Agent` (HTTP 401), and its guidance
 * is to send something that identifies the caller. This builds one that names
 * the package, its version, and the host runtime — e.g.
 * `fxtwitter/1.0.0 (+https://github.com/otnc/fxtwitter-wrapper; node, vercel)`.
 *
 * Returns `undefined` in browsers, where `User-Agent` is a forbidden header:
 * the request carries the browser's own UA regardless, and trying to set it
 * only produces a console warning. `hasWindow` stands in for "is a browser" —
 * Node, Bun, Deno and workerd all leave `window` undefined.
 */
export function defaultUserAgent(): string | undefined {
  if (hasWindow) return undefined;

  const host = [runtime, provider].filter(Boolean).join(", ");
  const context = host ? `+${HOMEPAGE}; ${host}` : `+${HOMEPAGE}`;

  return `fxtwitter/${version} (${context})`;
}
