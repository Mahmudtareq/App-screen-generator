import "server-only";

import { Types } from "mongoose";
import { z } from "zod";

import { auth } from "@/auth";
import { env } from "@/config/env";
import { connectDB } from "@/lib/db";

/**
 * One envelope, one wrapper, for every server action.
 *
 * This file has no `"use server"` directive on purpose: such a module may only
 * export async functions, and `ok`/`fail` are synchronous while `withAction`
 * returns a function. Action files carry the directive and import from here.
 */

export type ActionErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL";

export interface ActionError {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
}

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

export function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function fail(
  code: ActionErrorCode,
  message: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<never> {
  return { success: false, error: { code, message, fieldErrors } };
}

/** Throw from a handler; the wrapper turns it into a `fail` envelope. */
export class ActionFailure extends Error {
  constructor(
    readonly code: ActionErrorCode,
    message: string,
    readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(message);
    this.name = "ActionFailure";
  }
}

export function raise(code: ActionErrorCode, message: string): never {
  throw new ActionFailure(code, message);
}

/**
 * `redirect()` and `notFound()` work by throwing. Swallowing them in a catch
 * silently turns a redirect into a no-op, which is the single easiest way to
 * break auth flows — so every catch checks this first.
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

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface ActionCtx {
  user: SessionUser;
  userId: Types.ObjectId;
}

interface ActionConfig<S extends z.ZodTypeAny | undefined> {
  /** Used in server logs when an unexpected error is swallowed. */
  name: string;
  schema?: S;
  /** Defaults to true. */
  auth?: boolean;
  /** Defaults to true. */
  db?: boolean;
}

type Input<S> = S extends z.ZodTypeAny ? z.input<S> : void;
type Parsed<S> = S extends z.ZodTypeAny ? z.output<S> : undefined;

function isDuplicateKeyError(error: unknown): boolean {
  return (error as { code?: number } | null)?.code === 11000;
}

function isMongooseDataError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "ValidationError" || name === "CastError";
}

/**
 * Wraps a handler with the four things every action needs, in order: an auth
 * guard, server-side validation, a database connection, and error mapping.
 *
 * Making these structural rather than per-action is what prevents the drift they
 * otherwise accumulate — a mix of `{ok}` / `{status}` / `{success}` envelopes,
 * validation that only ever ran in the client form, ad-hoc ownership checks, and
 * catches that eat redirects.
 */
export function withAction<TOut, S extends z.ZodTypeAny | undefined = undefined>(
  config: ActionConfig<S>,
  handler: (args: { input: Parsed<S>; ctx: ActionCtx }) => Promise<TOut>,
): (input: Input<S>) => Promise<ActionResult<TOut>> {
  return async function action(rawInput) {
    try {
      const requireAuth = config.auth ?? true;
      const session = requireAuth ? await auth() : null;

      if (requireAuth && !session?.user?.id) {
        return fail("UNAUTHORIZED", "You need to be signed in to do that.");
      }

      let input: unknown = rawInput;
      if (input instanceof FormData) input = Object.fromEntries(input.entries());

      let parsed: unknown;
      if (config.schema) {
        const result = config.schema.safeParse(input);
        if (!result.success) {
          return fail(
            "VALIDATION",
            "Please check the highlighted fields.",
            z.flattenError(result.error).fieldErrors,
          );
        }
        parsed = result.data;
      }

      if (config.db ?? true) await connectDB();

      const ctx = {
        user: {
          id: session?.user?.id ?? "",
          email: session?.user?.email ?? "",
          name: session?.user?.name ?? null,
        },
        userId: session?.user?.id
          ? new Types.ObjectId(session.user.id)
          : (null as unknown as Types.ObjectId),
      } satisfies ActionCtx;

      return ok(await handler({ input: parsed as Parsed<S>, ctx }));
    } catch (error) {
      if (isNextControlFlowError(error)) throw error;

      if (error instanceof ActionFailure) {
        return fail(error.code, error.message, error.fieldErrors);
      }
      if (isDuplicateKeyError(error)) {
        return fail("CONFLICT", "That value is already taken.");
      }
      if (isMongooseDataError(error)) {
        return fail("VALIDATION", "Some of the submitted data was not valid.");
      }

      console.error(`[action:${config.name}]`, error);
      return fail(
        "INTERNAL",
        env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : ((error as Error)?.message ?? "Unknown error"),
      );
    }
  };
}
