const emitted = new Set<string>();

interface ProcessLike {
  emitWarning?: (
    warning: string,
    options: { type?: string; code?: string }
  ) => void;
}

/**
 * Emits a deprecation warning once per process, the way Node's own deprecated
 * APIs (and libraries such as discord.js) do — so `--no-deprecation` and
 * `--throw-deprecation` apply, and repeated construction doesn't spam the
 * console. Falls back to `console.warn` in runtimes without
 * `process.emitWarning`.
 */
export function emitDeprecationWarning(code: string, message: string): void {
  if (emitted.has(code)) return;
  emitted.add(code);

  const proc = (globalThis as { process?: ProcessLike }).process;
  if (typeof proc?.emitWarning === "function") {
    proc.emitWarning(message, { type: "DeprecationWarning", code });
    return;
  }

  console.warn(`DeprecationWarning [${code}]: ${message}`);
}

/** Test-only: lets a suite observe the first-call behaviour more than once. */
export function resetDeprecationWarnings(): void {
  emitted.clear();
}
