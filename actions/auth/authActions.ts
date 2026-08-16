"use server";

import { withAction, raise } from "@/lib/action";
import { hashPassword } from "@/lib/password";
import { User } from "@/models";
import { registerSchema } from "@/schemas/auth";

export const registerAction = withAction(
  // No session required — this is how sessions start.
  { name: "auth.register", schema: registerSchema, auth: false },
  async ({ input }) => {
    const existing = await User.findOne({ email: input.email })
      .select("_id")
      .lean();

    if (existing) {
      raise("CONFLICT", "An account with that email already exists.");
    }

    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      plan: "free",
    });

    // Deliberately does not sign the user in. `signIn` issues a redirect by
    // throwing, and the client needs the result of this call to decide what to
    // show — so the sign-in happens from the form, right after this resolves.
    return { id: user._id.toString(), email: user.email };
  },
);
