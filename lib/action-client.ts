import type { ActionResult } from "./action";

/**
 * Client-side companion to the action envelope.
 *
 * Kept in its own module so a Client Component can narrow an ActionResult without
 * importing lib/action.ts, which is marked `server-only`.
 */

export function isOk<T>(
  result: ActionResult<T>,
): result is { success: true; data: T } {
  return result.success;
}

/** Throws the action's message, for callers that would rather use try/catch. */
export function unwrap<T>(result: ActionResult<T>): T {
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}

/** First message for a given field, for wiring an envelope back into a form. */
export function fieldError<T>(
  result: ActionResult<T>,
  field: string,
): string | undefined {
  if (result.success) return undefined;
  return result.error.fieldErrors?.[field]?.[0];
}
