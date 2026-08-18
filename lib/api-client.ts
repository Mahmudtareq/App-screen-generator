import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "@/auth";
import { env } from "@/config/env";
import { routes } from "@/config/routes";
import { isNextControlFlowError } from "@/lib/redirect-guard";

/**
 * The one HTTP client between server actions and this app's own API routes.
 *
 * Components never call `fetch` against the API themselves — the flow is always
 * UI → server action → `apiClient` → API route → database, so every request
 * shares the same base URL, auth forwarding, caching options and error shape.
 *
 * Auth rides on the Auth.js session cookie: the incoming action request's
 * `cookie` header is forwarded to the route, where `asyncHandler` resolves the
 * session again. A 401 on an authenticated call means the session is gone, so
 * the client signs out and redirects to login rather than surfacing an error
 * every component would have to special-case.
 */

/** What every API route returns; `data` carries the field map on validation failure. */
export interface ApiEnvelope<T = unknown> {
  status: boolean;
  message: string;
  data?: T;
}

export interface ApiError extends Error {
  statusCode?: number;
  data?: unknown;
}

type FetchOptions<TBody> = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  tags?: string[];
  cache?: "force-cache" | "no-store";
  revalidate?: number | false;
  /** Defaults to true. Public endpoints skip cookie forwarding and 401 recovery. */
  auth?: boolean;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function apiClient<TResponse = any, TBody = undefined>(
  url: string,
  options: FetchOptions<TBody> = {},
): Promise<TResponse> {
  const { method = "GET", body, tags, cache, revalidate, auth = true } = options;

  try {
    const requestHeaders: Record<string, string> = {};

    if (auth) {
      const cookie = (await headers()).get("cookie");
      if (cookie) requestHeaders["cookie"] = cookie;
    }

    if (body) requestHeaders["Content-Type"] = "application/json";

    const isMutation = method !== "GET";

    const fetchOptions: RequestInit & {
      next?: { tags?: string[]; revalidate?: number | false };
    } = {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    if (isMutation) {
      fetchOptions.cache = "no-store";
    } else {
      if (cache) fetchOptions.cache = cache;
      if (tags || revalidate !== undefined) {
        fetchOptions.next = {
          ...(tags && { tags }),
          ...(revalidate !== undefined && { revalidate }),
        };
      }
    }

    const res = await fetch(`${env.NEXT_PUBLIC_BASE_URL}${url}`, fetchOptions);

    if (!res.ok) {
      if (res.status === 401 && auth) {
        // Setting cookies is only allowed in actions and routes; when a stale
        // session surfaces during a server-component render, skip the cookie
        // write and just send the user to login.
        try {
          await signOut({ redirect: false });
        } catch (signOutError) {
          if (isNextControlFlowError(signOutError)) throw signOutError;
        }
        redirect(routes.public.login);
      }

      let message = `HTTP error! status: ${res.status}`;
      let data: unknown;
      const raw = await res.text().catch(() => "");
      try {
        const errorBody = JSON.parse(raw) as ApiEnvelope;
        message = errorBody.message || message;
        data = errorBody.data;
      } catch {
        if (raw) message = raw;
      }

      const error = new Error(message) as ApiError;
      error.statusCode = res.status;
      error.data = data;
      throw error;
    }

    return (await res.json()) as TResponse;
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    if (error instanceof Error) throw error;
    throw new Error("An unexpected error occurred!");
  }
}
