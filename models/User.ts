import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Bound to the same `users` collection the Auth.js MongoDB adapter owns.
 *
 * One collection, one document per person, two writers. The adapter creates and
 * updates users during OAuth sign-in; this schema is a strict superset of
 * `AdapterUser` so Mongoose can read those documents and add app-specific fields
 * the adapter never sees.
 *
 * The alternative — pointing the adapter at `auth_users` so Mongoose could own
 * `users` — produces two user identities: `accounts` foreign-keys to the
 * adapter's, `session.user.id` derives from it, and every OAuth login orphans a
 * record.
 *
 * Consequences of sharing, and how they are handled:
 * - The adapter bypasses Mongoose defaults, validators and `timestamps`, so a
 *   Google-created user has no `createdAt` and no `plan`. Those are optional
 *   here, `plan` is read as `plan ?? "free"`, and `_id.getTimestamp()` is the
 *   reliable signup date.
 * - `select: false` only applies to Mongoose reads. The adapter returns raw
 *   documents including `passwordHash`, so auth callbacks must pick fields
 *   explicitly and never spread the user object.
 */
export interface IUser {
  _id: Types.ObjectId;
  name?: string | null;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  /** Absent for OAuth-only accounts. */
  passwordHash?: string;
  plan?: "free" | "pro";
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, default: null },
    email: { type: String, required: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: null },
    passwordHash: { type: String, select: false },
    plan: { type: String, enum: ["free", "pro"], default: "free" },
  },
  {
    collection: "users",
    timestamps: true,
    // The adapter writes fields this schema does not declare (and vice versa);
    // stripping them on a Mongoose save would corrupt adapter state.
    strict: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });

export const User: Model<IUser> =
  (models.User as Model<IUser>) ?? model<IUser>("User", userSchema);
