/**
 * `redirect()` and `notFound()` work by throwing. Swallowing them in a catch
 * silently turns a redirect into a no-op, which is the single easiest way to
 * break auth flows — so every catch in an action or handler calls this first.
 */
export function isNextControlFlowError(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return (
    typeof digest === "string" &&
    (digest.startsWith("NEXT_REDIRECT") ||
      digest === "NEXT_NOT_FOUND" ||
      digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
  );
}

/** Re-throws Next control-flow errors; returns normally for everything else. */
export function rethrowIfRedirect(error: unknown): void {
  if (isNextControlFlowError(error)) throw error;
}
