"use server";

import { raise, withAction } from "@/lib/action";
import { Device } from "@/models";
import {
  createDeviceSchema,
  deviceIdSchema,
  deviceInputSchema,
  updateDeviceSchema,
  type CustomDeviceRow,
} from "@/schemas/device";

/**
 * Admin CRUD for the device catalog's dynamic half.
 *
 * Devices are global rows offered to every user, so unlike every other action in
 * this codebase there is no `userId` filter clause here — the guard is
 * `admin: true`, which `withAction` enforces against `ADMIN_EMAILS` before the
 * handler runs. The editor itself never calls these: it reads enabled devices
 * through `lib/devices/custom.ts` on the server pages, with no auth at all,
 * because the anonymous editor needs them too.
 */

function toRow(doc: {
  _id: { toString(): string };
  updatedAt: Date;
}): CustomDeviceRow | null {
  // Parsed through the authoring schema rather than cast: a row edited by an
  // older build (or by hand) that no longer parses is dropped from the list
  // instead of handing the form fields it cannot render.
  const parsed = deviceInputSchema.safeParse(doc);
  if (!parsed.success) return null;

  return {
    ...parsed.data,
    id: doc._id.toString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export const listDevicesAction = withAction(
  { name: "devices.list", admin: true },
  async (): Promise<CustomDeviceRow[]> => {
    const docs = await Device.find().sort({ createdAt: 1 }).lean();
    return docs.map(toRow).filter((row): row is CustomDeviceRow => row !== null);
  },
);

export const createDeviceAction = withAction(
  { name: "devices.create", schema: createDeviceSchema, admin: true },
  async ({ input }) => {
    const device = await Device.create(input);
    return { id: device._id.toString() };
  },
);

export const updateDeviceAction = withAction(
  { name: "devices.update", schema: updateDeviceSchema, admin: true },
  async ({ input }) => {
    const { id, ...changes } = input;

    const result = await Device.updateOne({ _id: id }, { $set: changes });
    if (result.matchedCount === 0) {
      raise("NOT_FOUND", "That device could not be found.");
    }

    return { id };
  },
);

export const deleteDeviceAction = withAction(
  { name: "devices.delete", schema: deviceIdSchema, admin: true },
  async ({ input }) => {
    // Projects referencing the deleted id keep it; the editor's registry falls
    // back to the default frame rather than breaking their documents.
    const result = await Device.deleteOne({ _id: input.id });
    if (result.deletedCount === 0) {
      raise("NOT_FOUND", "That device could not be found.");
    }

    return { id: input.id };
  },
);
