import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse } from "@/lib/server.utils";
import { Project } from "@/models";
import type { EditorDoc } from "@/schemas/editor";
import { objectIdSchema, updateProjectBodySchema } from "@/schemas/project";

// NOT_FOUND rather than FORBIDDEN throughout, so someone probing ids cannot
// tell the difference between "does not exist" and "belongs to someone else".

function ownedFilter(id: string, userId: string) {
  return { _id: id, userId: new Types.ObjectId(userId) };
}

export const GET = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid project id.");
    }

    const project = await Project.findOne(ownedFilter(id, req.user!._id)).lean();

    if (!project) {
      return apiResponse(false, 404, "That project could not be found.");
    }

    return apiResponse(true, 200, "Project fetched successfully.", {
      id: project._id.toString(),
      name: project.name,
      thumbnailUrl: project.thumbnailUrl ?? null,
      doc: project.doc as EditorDoc,
      updatedAt: project.updatedAt.toISOString(),
    });
  },
  true,
);

export const PATCH = asyncHandler(
  updateProjectBodySchema,
  async (req: NextRequest, changes, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid project id.");
    }
    if (Object.keys(changes).length === 0) {
      return apiResponse(false, 400, "Nothing to update.");
    }

    // One atomic $set of the whole editor document — the reason `doc` is nested
    // rather than flattened across a dozen top-level fields.
    const result = await Project.updateOne(ownedFilter(id, req.user!._id), {
      $set: changes,
    });

    if (result.matchedCount === 0) {
      return apiResponse(false, 404, "That project could not be found.");
    }

    return apiResponse(true, 200, "Project updated successfully.", { id });
  },
  true,
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid project id.");
    }

    const result = await Project.deleteOne(ownedFilter(id, req.user!._id));

    if (result.deletedCount === 0) {
      return apiResponse(false, 404, "That project could not be found.");
    }

    return apiResponse(true, 200, "Project deleted successfully.", { id });
  },
  true,
);
