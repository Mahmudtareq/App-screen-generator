import type { NextRequest } from "next/server";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse, escapeRegex, makePaginate } from "@/lib/server.utils";
import { Device } from "@/models";
import {
  createDeviceSchema,
  deviceInputSchema,
  type CustomDeviceRow,
} from "@/schemas/device";

/**
 * Admin CRUD for the device catalog's dynamic half.
 *
 * Devices are global rows offered to every user, so unlike the project routes
 * there is no `userId` filter clause here — the guard is the `"admin"` auth
 * level, which `asyncHandler` enforces against ADMIN_EMAILS before the handler
 * runs. The editor itself never calls these: it reads enabled devices through
 * `lib/devices/custom.ts` on the server pages, with no auth at all, because the
 * anonymous editor needs them too.
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

export const GET = asyncHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  // The catalog is small; the default page holds every row the admin list needs.
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 200);
  const search = searchParams.get("search")?.trim() || "";

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const [docs, totalDocs] = await Promise.all([
    Device.find(filter)
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Device.countDocuments(filter),
  ]);

  const rows = docs
    .map(toRow)
    .filter((row): row is CustomDeviceRow => row !== null);

  return apiResponse(true, 200, "Devices fetched successfully.", {
    docs: rows,
    ...makePaginate(page, limit, totalDocs),
  });
}, "admin");

export const POST = asyncHandler(
  createDeviceSchema,
  async (req: NextRequest, data) => {
    const device = await Device.create(data);

    return apiResponse(true, 201, "Device created successfully.", {
      id: device._id.toString(),
    });
  },
  "admin",
);
