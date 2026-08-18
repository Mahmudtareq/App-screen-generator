import "server-only";

import { z } from "zod";

/**
 * Server environment, validated once at import.
 *
 * Everything reads from here rather than `process.env` directly. Raw access with
 * `||` fallbacks is how a hardcoded development URL ends up shipping to
 * production and how a missing secret becomes a confusing runtime error hours
 * later instead of a startup failure.
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB_NAME: z.string().min(1).default("mockup-studio"),

  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters — generate one with `openssl rand -base64 32`"),
  AUTH_URL: z.url().optional(),
  AUTH_TRUST_HOST: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),

  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),

  // Optional. Without it, website capture uses Microlink's free endpoint, which
  // is rate limited per IP at roughly 50 requests a day.
  MICROLINK_API_KEY: z.string().min(1).optional(),

  // Comma-separated emails allowed into the admin panel (device management).
  // Optional: without it, no one is an admin and the panel 404s for everyone.
  ADMIN_EMAILS: z.string().optional(),
});

function parseEnv() {
  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const issues = z
      .flattenError(result.error)
      .fieldErrors;
    const summary = Object.entries(issues)
      .map(([key, messages]) => `  ${key}: ${messages?.join(", ")}`)
      .join("\n");

    throw new Error(
      `Invalid environment configuration:\n${summary}\n\nCheck .env.local against .env.example.`,
    );
  }

  return result.data;
}

export const env = parseEnv();

/** Google sign-in is optional; the login page hides the button when unconfigured. */
export const googleAuthEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);
