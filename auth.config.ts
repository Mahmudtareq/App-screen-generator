import type { NextAuthConfig } from "next-auth";

import { routes } from "@/config/routes";

/**
 * The half of the auth configuration that carries no heavy dependencies.
 *
 * `proxy.ts` imports this rather than `auth.ts`, so route protection does not
 * drag Mongoose, the MongoDB adapter and bcrypt into a module that runs on every
 * single matched request. Proxy runs on the Node runtime in Next 16, so this is
 * about not opening a database pool per request rather than about edge limits.
 */
export const authConfig = {
  pages: {
    signIn: routes.public.login,
  },

  session: {
    // Credentials sign-in forces JWT (see auth.ts); stated here so the two halves
    // cannot disagree.
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  // Providers are added in auth.ts. The array must exist here for the config to
  // typecheck on its own.
  providers: [],

  callbacks: {
    authorized({ auth }) {
      return Boolean(auth?.user);
    },
  },
} satisfies NextAuthConfig;
