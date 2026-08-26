/** Extracts a readable message from a caught error of unknown shape.
 *
 * `err instanceof Error ? err.message : String(err)` was the pattern used
 * everywhere in this app, but its fallback is nearly useless: `String()`
 * on a plain object (not an `Error` instance — e.g. some Supabase error
 * shapes, or a raw parsed JSON error body) always produces the literal
 * text "[object Object]", discarding whatever the object actually said.
 * This tries several known shapes before falling back to `JSON.stringify`
 * (which at least surfaces the real content, so a future unexpected shape
 * is diagnosable from the UI instead of a dead end). */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  if (err && typeof err === "object") {
    const withMessage = err as { message?: unknown; error?: unknown };
    if (typeof withMessage.message === "string") return withMessage.message;
    if (typeof withMessage.error === "string") return withMessage.error;

    try {
      return JSON.stringify(err);
    } catch {
      // circular or otherwise unstringifiable — fall through
    }
  }

  return String(err);
}
