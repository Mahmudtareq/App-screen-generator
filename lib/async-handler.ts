import "server-only";

import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { env } from "@/config/env";
import { isAdminEmail } from "@/lib/admin";
import { connectDB } from "@/lib/db";
import { isNextControlFlowError } from "@/lib/redirect-guard";
import { apiResponse } from "@/lib/server.utils";

/**
 * Every API handler is wrapped: `export const GET = asyncHandler(handler, true)`
 * or, when there is a request body, `asyncHandler(schema, handler, true)` —
 * never a bare `export async function GET`.
 *
 * The wrapper owns, in order: the database connection, the session auth guard
 * (with an optional admin gate), awaiting Next's `Promise`-wrapped dynamic
 * params, zod-parsing the JSON body, and mapping every error class onto the one
 * `apiResponse` envelope. Handlers therefore contain no try/catch and no auth
 * code — just the resource logic.
 *
 * Auth levels: `false` (public), `true` (any signed-in user; the session user is
 * attached as `req.user`), `"admin"` (signed in and listed in ADMIN_EMAILS).
 */
export type AuthLevel = boolean | "admin";

type RouteParams = Record<string, string>;
type RouteContext = { params?: Promise<RouteParams> };

type Handler<P extends RouteParams = RouteParams> = (
  req: NextRequest,
  params: P,
) => Promise<NextResponse | Response>;

type SchemaHandler<S extends z.ZodTypeAny, P extends RouteParams = RouteParams> = (
  req: NextRequest,
  data: z.output<S>,
  params: P,
) => Promise<NextResponse | Response>;

export function asyncHandler<P extends RouteParams = RouteParams>(
  handler: Handler<P>,
  authLevel?: AuthLevel,
): (req: NextRequest, context: RouteContext) => Promise<Response>;
export function asyncHandler<
  S extends z.ZodTypeAny,
  P extends RouteParams = RouteParams,
>(
  schema: S,
  handler: SchemaHandler<S, P>,
  authLevel?: AuthLevel,
): (req: NextRequest, context: RouteContext) => Promise<Response>;
export function asyncHandler(
  schemaOrHandler: z.ZodTypeAny | Handler,
  handlerOrAuth?: SchemaHandler<z.ZodTypeAny> | AuthLevel,
  maybeAuth?: AuthLevel,
) {
  const hasSchema = schemaOrHandler instanceof z.ZodType;
  const schema = hasSchema ? (schemaOrHandler as z.ZodTypeAny) : null;
  const handler = hasSchema
    ? (handlerOrAuth as SchemaHandler<z.ZodTypeAny>)
    : (schemaOrHandler as Handler);
  const authLevel = (hasSchema ? maybeAuth : (handlerOrAuth as AuthLevel)) ?? false;

  return async (req: NextRequest, context: RouteContext): Promise<Response> => {
    try {
      await connectDB();

      if (authLevel) {
        const session = await auth();
        if (!session?.user?.id) {
          return apiResponse(false, 401, "You need to be signed in to do that.");
        }
        if (authLevel === "admin" && !isAdminEmail(session.user.email)) {
          return apiResponse(false, 403, "Only an administrator can do that.");
        }
        req.user = { _id: session.user.id, email: session.user.email ?? "" };
      }

      const params = (await context?.params) ?? {};

      if (schema) {
        const body = await req.json().catch(() => null);
        const data = schema.parse(body);
        return await (handler as SchemaHandler<z.ZodTypeAny>)(req, data, params);
      }

      return await (handler as Handler)(req, params);
    } catch (error) {
      if (isNextControlFlowError(error)) throw error;

      if (error instanceof z.ZodError) {
        const details = error.issues.reduce(
          (acc, issue) => {
            const field = issue.path.join(".") || "general";
            acc[field] = issue.message;
            return acc;
          },
          {} as Record<string, string>,
        );
        return apiResponse(false, 400, "Request validation failed!", details);
      }

      if ((error as { code?: number } | null)?.code === 11000) {
        return apiResponse(false, 409, "That value is already taken.");
      }

      const name = (error as { name?: string } | null)?.name;
      if (name === "ValidationError" || name === "CastError") {
        return apiResponse(false, 400, "Some of the submitted data was not valid.");
      }

      console.error(`[api:${req.method} ${req.nextUrl?.pathname}]`, error);
      return apiResponse(
        false,
        500,
        env.NODE_ENV === "production"
          ? "Something went wrong. Please try again."
          : ((error as Error)?.message ?? "Something went wrong. Please try again."),
      );
    }
  };
}
