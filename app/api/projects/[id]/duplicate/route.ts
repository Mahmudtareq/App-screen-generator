import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse } from "@/lib/server.utils";
import { Project } from "@/models";
import { objectIdSchema } from "@/schemas/project";

export const POST = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid project id.");
    }

    const source = await Project.findOne({
      _id: id,
      userId: new Types.ObjectId(req.user!._id),
    }).lean();

    if (!source) {
      return apiResponse(false, 404, "That project could not be found.");
    }

    const copy = await Project.create({
      // The copy belongs to the caller, never to `source.userId` — the same
      // value here, but writing it this way keeps it correct if shared projects
      // are ever added.
      userId: new Types.ObjectId(req.user!._id),
      name: `${source.name} copy`,
      doc: source.doc,
      thumbnailUrl: source.thumbnailUrl,
    });

    return apiResponse(true, 201, "Project duplicated successfully.", {
      id: copy._id.toString(),
    });
  },
  true,
);
