import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.email().toLowerCase().trim(),
  password: z.string().min(1),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  email: z.email("Enter a valid email address").toLowerCase().trim(),
  password: z
    .string()
    .min(10, "Use at least 10 characters")
    .max(200, "That password is too long"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
