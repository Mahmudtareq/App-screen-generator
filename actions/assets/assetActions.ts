"use server";

import { raise, withAction } from "@/lib/action";
import { cloudinary, isOwnedBy } from "@/lib/cloudinary";
import { Asset } from "@/models";
import { registerAssetSchema, assetIdSchema } from "@/schemas/asset";

/**
 * Records an upload the browser has already performed.
 *
 * The bytes never touch this server — the client uploads directly with a
 * signature from /api/cloudinary/sign, then reports the result here so the asset
 * can be listed and, later, deleted.
 */
export const registerAssetAction = withAction(
  { name: "assets.register", schema: registerAssetSchema },
  async ({ input, ctx }) => {
    // A client could claim any public id; requiring the owner's prefix means it
    // can only register something it was actually signed to upload.
    if (!isOwnedBy(input.publicId, ctx.user.id)) {
      raise("FORBIDDEN", "That upload does not belong to your account.");
    }

    const asset = await Asset.findOneAndUpdate(
      { publicId: input.publicId },
      { $set: { ...input, userId: ctx.userId } },
      { upsert: true, new: true },
    );

    return {
      id: asset._id.toString(),
      secureUrl: asset.secureUrl,
    };
  },
);

export const deleteAssetAction = withAction(
  { name: "assets.delete", schema: assetIdSchema },
  async ({ input, ctx }) => {
    // Ownership as a filter clause, as everywhere else.
    const asset = await Asset.findOne({ _id: input.id, userId: ctx.userId }).lean();
    if (!asset) raise("NOT_FOUND", "That asset could not be found.");

    // Second, independent check against the storage path itself.
    if (!isOwnedBy(asset.publicId, ctx.user.id)) {
      raise("FORBIDDEN", "That upload does not belong to your account.");
    }

    await cloudinary.uploader.destroy(asset.publicId);
    await Asset.deleteOne({ _id: asset._id, userId: ctx.userId });

    return { id: input.id };
  },
);
