import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { routes } from "@/config/routes";

/**
 * Route protection.
 *
 * Next 16 renamed `middleware` to `proxy`; it now runs on the Node.js runtime by
 * default. It still imports `auth.config.ts` rather than `auth.ts`, because this
 * runs on every matched request and has no business loading Mongoose, the
 * MongoDB adapter and bcrypt — or opening a database pool — just to read a JWT.
 */
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const signedIn = Boolean(request.auth?.user);
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname === routes.public.login || pathname === routes.public.register;

  if (isAuthPage && signedIn) {
    return NextResponse.redirect(new URL(routes.private.dashboard, request.url));
  }

  if (!isAuthPage && !signedIn) {
    const target = new URL(routes.public.login, request.url);
    target.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
});

export const config = {
  /**
   * Only the genuinely private surfaces.
   *
   * Note `:id+` rather than `:id*` — `*` matches zero or more segments and would
   * therefore capture bare `/editor`. That page is intentionally public: anyone
   * can open the editor and export from it without an account, because export is
   * entirely client-side. Signing in is required to *save*, not to try, which is
   * what makes the editor the product's own advertisement.
   */
  matcher: ["/dashboard/:path*", "/editor/:id+", "/login", "/register"],
};
