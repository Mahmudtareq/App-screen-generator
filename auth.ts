import { MongoDBAdapter } from "@auth/mongodb-adapter";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/auth.config";
import { env, googleAuthEnabled } from "@/config/env";
import { connectDB, getMongoClient } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { User } from "@/models";
import { credentialsSchema } from "@/schemas/auth";

/**
 * The adapter takes a promise, so it never blocks module evaluation — the pool is
 * opened on the first request that actually needs it.
 *
 * Mongoose's own MongoClient is reused rather than opening a second pool against
 * the same cluster. The cast exists only because `@auth/mongodb-adapter` declares
 * a peer range of mongodb@6 while Mongoose 9 bundles the v7 driver, so the two
 * `MongoClient` types are nominally different; the handful of collection methods
 * the adapter calls are unchanged between those versions.
 */
type AdapterClientArg = Parameters<typeof MongoDBAdapter>[0];

const clientPromise = getMongoClient() as unknown as AdapterClientArg;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,

  adapter: MongoDBAdapter(clientPromise, { databaseName: env.MONGODB_DB_NAME }),

  secret: env.AUTH_SECRET,
  trustHost: env.AUTH_TRUST_HOST,

  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(raw) {
        // Validate here, not only in the sign-in form: `authorize` is reachable
        // by anyone who can POST to the callback endpoint.
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        await connectDB();

        // passwordHash is `select: false`, so it has to be asked for explicitly.
        const user = await User.findOne({ email: parsed.data.email })
          .select("+passwordHash")
          .lean();

        // OAuth-only accounts have no hash. Returning null rather than throwing
        // keeps the failure indistinguishable from a wrong password, so the form
        // cannot be used to enumerate which emails are registered.
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        // Picked explicitly. Spreading `user` here would put passwordHash into
        // the JWT callback and, from there, potentially into the session.
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? null,
          image: user.image ?? null,
        };
      },
    }),

    ...(googleAuthEnabled
      ? [
          Google({
            clientId: env.GOOGLE_CLIENT_ID!,
            clientSecret: env.GOOGLE_CLIENT_SECRET!,
            // Safe for Google specifically, because Google verifies email
            // ownership. Without it, signing up with a password and later using
            // "Continue with Google" hits the unique email index and surfaces as
            // an opaque OAuthAccountNotLinked error. Never enable this for a
            // provider that does not verify emails.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
  ],

  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id as string;
      }

      // Lets the client refresh a stale name/avatar after a profile edit without
      // forcing a sign-out; JWT contents are otherwise frozen until re-login.
      if (trigger === "update" && session) {
        token.name = (session as { name?: string }).name ?? token.name;
      }

      return token;
    },

    async session({ session, token }) {
      // Under the JWT strategy this callback receives no `user` argument — reading
      // `user.id` here yields undefined, which is the usual cause of a null
      // userId inside server actions.
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
