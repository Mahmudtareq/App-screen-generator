import { z } from "zod";

import { objectIdSchema } from "./project";

export const registerAssetSchema = z.object({
  kind: z.enum(["screenshot", "logo", "background"]),
  publicId: z.string().min(1).max(300),
  secureUrl: z.url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  format: z.string().min(1).max(16),
});

export const assetIdSchema = z.object({ id: objectIdSchema });

export type RegisterAssetInput = z.infer<typeof registerAssetSchema>;
