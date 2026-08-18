import "server-only";

import { env } from "@/config/env";

/**
 * Who counts as an administrator.
 *
 * A comma-separated `ADMIN_EMAILS` env var rather than a role column: the user
 * document is shared with the Auth.js adapter, which bypasses Mongoose defaults
 * and validators, and that interplay is delicate enough (see models/User.ts)
 * that not adding a second writer-visible field to it is a feature. Promoting
 * someone is a config change and a restart, which for a team-sized admin list
 * is exactly the right amount of ceremony.
 *
 * Checked server-side at every admin surface — the layout that renders the
 * pages, and `asyncHandler(..., "admin")` for every mutation route — never
 * inferred on the client.
 */
const adminEmails = new Set(
  (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && adminEmails.has(email!.toLowerCase());
}
