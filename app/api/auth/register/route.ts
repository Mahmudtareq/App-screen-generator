import { asyncHandler } from "@/lib/async-handler";
import { hashPassword } from "@/lib/password";
import { apiResponse } from "@/lib/server.utils";
import { User } from "@/models";
import { registerSchema } from "@/schemas/auth";

// No session required — this is how sessions start. The static /api/auth/register
// segment takes precedence over the [...nextauth] catch-all beside it.
export const POST = asyncHandler(registerSchema, async (req, data) => {
  const existing = await User.findOne({ email: data.email }).select("_id").lean();

  if (existing) {
    return apiResponse(false, 409, "An account with that email already exists.");
  }

  const user = await User.create({
    name: data.name,
    email: data.email,
    passwordHash: await hashPassword(data.password),
    plan: "free",
  });

  // Deliberately does not sign the user in. `signIn` issues a redirect by
  // throwing, and the client needs the result of this call to decide what to
  // show — so the sign-in happens from the form, right after this resolves.
  return apiResponse(true, 201, "Account created successfully.", {
    id: user._id.toString(),
    email: user.email,
  });
});
