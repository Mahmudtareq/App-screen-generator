import type { DefaultSession } from "next-auth";

/**
 * `session.user.id` is populated from `token.id` in the session callback — under
 * the JWT strategy that callback receives no `user` argument, so the id has to
 * travel through the token. Declared here so server actions get it typed rather
 * than casting at every call site.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
  }
}

export {};
