import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * An image a user uploaded to Cloudinary.
 *
 * Only metadata and URLs — never the binary. `publicId` is what Cloudinary needs
 * to delete the file later, and it is prefixed with the owner's id so a stolen
 * public id cannot be used to delete another account's asset.
 */
export interface IAsset {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  kind: "screenshot" | "logo" | "background";
  publicId: string;
  secureUrl: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: ["screenshot", "logo", "background"],
      required: true,
    },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    bytes: { type: Number, required: true },
    format: { type: String, required: true },
  },
  { timestamps: true },
);

assetSchema.index({ userId: 1, createdAt: -1 });
assetSchema.index({ publicId: 1 }, { unique: true });

export const Asset: Model<IAsset> =
  (models.Asset as Model<IAsset>) ?? model<IAsset>("Asset", assetSchema);
