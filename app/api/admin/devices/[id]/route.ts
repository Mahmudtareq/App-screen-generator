import type { NextRequest } from "next/server";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse } from "@/lib/server.utils";
import { Device } from "@/models";
import { deviceInputSchema } from "@/schemas/device";
import { objectIdSchema } from "@/schemas/project";

export const PATCH = asyncHandler(
  deviceInputSchema,
  async (req: NextRequest, changes, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid device id.");
    }

    const result = await Device.updateOne({ _id: id }, { $set: changes });
    if (result.matchedCount === 0) {
      return apiResponse(false, 404, "That device could not be found.");
    }

    return apiResponse(true, 200, "Device updated successfully.", { id });
  },
  "admin",
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid device id.");
    }

    // Projects referencing the deleted id keep it; the editor's registry falls
    // back to the default frame rather than breaking their documents.
    const result = await Device.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return apiResponse(false, 404, "That device could not be found.");
    }

    return apiResponse(true, 200, "Device deleted successfully.", { id });
  },
  "admin",
);
