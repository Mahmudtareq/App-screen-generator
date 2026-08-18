import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { isOwnedBy } from "@/lib/cloudinary";
import { apiResponse } from "@/lib/server.utils";
import { Asset } from "@/models";
import { registerAssetSchema } from "@/schemas/asset";

/**
 * Records an upload the browser has already performed.
 *
 * The bytes never touch this server — the client uploads directly with a
 * signature from /api/cloudinary/sign, then reports the result here so the asset
 * can be listed and, later, deleted.
 */
export const POST = asyncHandler(
  registerAssetSchema,
  async (req: NextRequest, data) => {
    // A client could claim any public id; requiring the owner's prefix means it
    // can only register something it was actually signed to upload.
    if (!isOwnedBy(data.publicId, req.user!._id)) {
      return apiResponse(false, 403, "That upload does not belong to your account.");
    }

    const asset = await Asset.findOneAndUpdate(
      { publicId: data.publicId },
      { $set: { ...data, userId: new Types.ObjectId(req.user!._id) } },
      { upsert: true, new: true },
    );

    return apiResponse(true, 200, "Asset registered successfully.", {
      id: asset._id.toString(),
      secureUrl: asset.secureUrl,
    });
  },
  true,
);
