/**
 * The authenticated user `asyncHandler` attaches to the request before a
 * protected route handler runs. Populated from the Auth.js session, never from
 * anything the client sent in the body.
 */
declare module "next/server" {
  interface NextRequest {
    user?: {
      _id: string;
      email: string;
    };
  }
}

export {};
