import "server-only";

import { NextResponse } from "next/server";

/**
 * The one response envelope every API route speaks.
 *
 * `{ status, message, data }` — success and failure differ only in `status` and
 * the HTTP code, so the api-client and the actions can handle both with a single
 * shape. Validation failures put a `{ field: message }` map in `data`.
 */
export function apiResponse<T = undefined>(
  status: boolean,
  statusCode: number = 200,
  message: string,
  data?: T,
): NextResponse {
  return NextResponse.json({ status, message, data }, { status: statusCode });
}

/**
 * Escapes user input before it is interpolated into a `$regex` search filter —
 * an unescaped `(` in a search box must not become a Mongo regex error, and a
 * crafted pattern must not become a ReDoS.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The list-endpoint pagination block, shared by every paginated route. */
export function makePaginate(page: number, limit: number, totalDocs: number) {
  const pages = Math.max(1, Math.ceil(totalDocs / limit));
  return {
    totalDocs,
    page,
    limit,
    pages,
    hasNext: page < pages,
    hasPrev: page > 1,
  };
}
