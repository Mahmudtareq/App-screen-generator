import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { cloudinary, isOwnedBy } from "@/lib/cloudinary";
import { apiResponse } from "@/lib/server.utils";
import { Asset } from "@/models";
import { objectIdSchema } from "@/schemas/project";

export const DELETE = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid asset id.");
    }

    // Ownership as a filter clause, as everywhere else.
    const userId = new Types.ObjectId(req.user!._id);
    const asset = await Asset.findOne({ _id: id, userId }).lean();
    if (!asset) {
      return apiResponse(false, 404, "That asset could not be found.");
    }

    // Second, independent check against the storage path itself.
    if (!isOwnedBy(asset.publicId, req.user!._id)) {
      return apiResponse(false, 403, "That upload does not belong to your account.");
    }

    await cloudinary.uploader.destroy(asset.publicId);
    await Asset.deleteOne({ _id: asset._id, userId });

    return apiResponse(true, 200, "Asset deleted successfully.", { id });
  },
  true,
);
