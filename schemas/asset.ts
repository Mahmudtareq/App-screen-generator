import { z } from "zod";

export const registerAssetSchema = z.object({
  /** "logo" is legacy — image layers replaced the single logo slot. */
  kind: z.enum(["screenshot", "image", "logo", "background"]),
  publicId: z.string().min(1).max(300),
  secureUrl: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  format: z.string().min(1).max(16),
});

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
