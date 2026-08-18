import { Schema, model, models, type Model, type Types } from "mongoose";

import type { DeviceInput } from "@/schemas/device";

/**
 * An admin-authored device frame.
 *
 * Global rows, not per-user: a device an admin adds is offered to everyone, so
 * there is deliberately no `userId` here and the actions that write it are
 * admin-gated instead of ownership-filtered.
 *
 * What is stored is the *authoring* shape from `schemas/device.ts` — the
 * renderer's `DeviceSpec` is derived from it on read by `buildDeviceSpec`, so
 * the geometry arithmetic lives in exactly one place. As with `Project.doc`,
 * the zod schema is the authority on shape; this schema mirrors it loosely and
 * `withAction` has already validated by the time anything reaches Mongo.
 */
export interface IDevice extends DeviceInput {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const deviceSchema = new Schema<IDevice>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    screenshotWidth: { type: Number, required: true },
    screenshotHeight: { type: Number, required: true },
    scaleFactor: { type: Number, required: true },
    bezel: { type: Number, required: true },
    bodyCornerRadius: { type: Number, required: true },
    screenCornerRadius: { type: Number, required: true },
    notch: {
      kind: { type: String, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      offsetX: { type: Number, required: true },
      offsetY: { type: Number, required: true },
      cornerRadius: { type: Number, required: true },
    },
    supportsLandscape: { type: Boolean, required: true },
    colorways: [
      {
        _id: false,
        label: { type: String, required: true },
        bodyFill: { type: String, required: true },
      },
    ],
    enabled: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

// The editor's only query: every enabled device, on each editor page load.
deviceSchema.index({ enabled: 1 });

export const Device: Model<IDevice> =
  (models.Device as Model<IDevice>) ?? model<IDevice>("Device", deviceSchema);
