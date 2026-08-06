import { hasWindow, nodeVersion, runtime } from "std-env";

/** Reads a version off a runtime global without assuming it exists. */
function globalVersion(name: string, path: readonly string[]): string | null {
  let value: unknown = (globalThis as Record<string, unknown>)[name];
  for (const key of path) {
    if (typeof value !== "object" || value === null) return null;
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" ? value : null;
}

function product(name: string, version: string | null): string {
  return version ? `${name}/${version}` : name;
}

/**
 * A `User-Agent` describing the runtime the request is made from, such as
 * `Node.js/22.16.0`, `Bun/1.3.0` or `Cloudflare-Workers`.
 *
 * The API requires callers to identify themselves and answers `401` otherwise.
 * Runtimes that fill the header in do so very tersely — Node sends just `node`
 * — so this states the runtime and version instead. It deliberately says
 * nothing about this package.
 *
 * Returns `null` in browsers, where `User-Agent` is a forbidden header: the
 * request carries the browser's own regardless, and setting it only logs a
 * warning.
 */
export function environmentUserAgent(): string | null {
  if (hasWindow) return null;

  switch (runtime) {
    case "node":
      return product("Node.js", nodeVersion);
    case "bun":
      return product("Bun", globalVersion("Bun", ["version"]));
    case "deno":
      return product("Deno", globalVersion("Deno", ["version", "deno"]));
    case "workerd":
      return "Cloudflare-Workers";
    case "edge-light":
      return "Vercel-Edge";
    case "fastly":
      return "Fastly-Compute";
    case "netlify":
      return "Netlify-Edge";
    default:
      return runtime || null;
  }
}

/** Header lookup that ignores case, as HTTP header names are case-insensitive. */
export function hasHeader(
  headers: Record<string, string> | undefined,
  name: string
): boolean {
  if (!headers) return false;
  const wanted = name.toLowerCase();
  return Object.keys(headers).some((key) => key.toLowerCase() === wanted);
}
