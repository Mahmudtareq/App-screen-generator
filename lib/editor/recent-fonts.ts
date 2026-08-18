"use client";

/**
 * The last few fonts this browser picked, most recent first.
 *
 * localStorage rather than the document: which fonts someone reaches for is a
 * property of the person, not of the project, and putting it in `doc` would make
 * opening the picker an undo step and a dirty autosave.
 */

const KEY = "editor:recent-fonts:v1";
const LIMIT = 8;

export function readRecentFonts(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string").slice(0, LIMIT)
      : [];
  } catch {
    // Private browsing throws on read. An empty list is the right degradation.
    return [];
  }
}

/** Moves a font to the front of the list and returns the new one. */
export function rememberFont(id: string): string[] {
  const next = [id, ...readRecentFonts().filter((entry) => entry !== id)].slice(
    0,
    LIMIT,
  );

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Quota or private browsing. Losing the history is not worth surfacing.
  }

  return next;
}
