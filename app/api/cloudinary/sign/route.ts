import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { asyncHandler } from "@/lib/async-handler";
import { signUpload, userFolder } from "@/lib/cloudinary";
import { apiResponse } from "@/lib/server.utils";

/**
 * Issues a signed Cloudinary upload, which the browser then performs directly.
 *
 * The upload does not go through the api-client/action chain: server actions cap
 * request bodies at 1MB by default, and a serverless deployment enforces its own
 * few-megabyte ceiling on top. App Store screenshots routinely exceed both.
 * Proxying would also double the bytes on the wire and give the client no upload
 * progress. This is the one route the browser calls directly.
 *
 * Signed rather than an unsigned preset, because an unsigned preset is a public
 * write endpoint against the account's quota. Signing costs one small request and
 * lets the folder, the public id and the size limit be fixed server-side.
 */
/**
 * "logo" is retained only so assets uploaded before layers were generalised keep
 * resolving; nothing writes it any more. New image layers use "image".
 */
const bodySchema = z.object({
  kind: z.enum(["screenshot", "image", "logo", "background", "thumbnail"]),
});

export const POST = asyncHandler(
  bodySchema,
  async (req: NextRequest, data) => {
    const folder = userFolder(req.user!._id, data.kind);
    const publicId = `${folder}/${randomUUID()}`;

    const signed = signUpload({
      folder,
      public_id: publicId,
    });

    return apiResponse(true, 200, "Upload signature created.", {
      ...signed,
      folder,
      publicId,
    });
  },
  true,
);
