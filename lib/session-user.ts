import "server-only";

import { auth } from "@/auth";
import type { SessionUser } from "@/components/auth/user-menu";

/**
 * The session reduced to what the app chrome renders.
 *
 * Every page that shows the app bar needs the same three fields, and the guard is
 * always `session.user.id` rather than `session` — a session object with no id is
 * the JWT-callback failure described in auth.ts, and treating it as signed in is
 * how a header ends up rendering an avatar for a user that server actions will
 * then reject.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { name, email, image } = session.user;
  return { name: name ?? null, email: email ?? null, image: image ?? null };
}
