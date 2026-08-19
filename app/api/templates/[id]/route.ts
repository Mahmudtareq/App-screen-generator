import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse } from "@/lib/server.utils";
import { Template } from "@/models";
import type { EditorDoc } from "@/schemas/editor";
import { objectIdSchema } from "@/schemas/project";
import { customTemplateId, updateTemplateBodySchema } from "@/schemas/template";

// Reads are public; writes filter on `createdBy` and return NOT_FOUND rather
// than FORBIDDEN, so someone probing ids cannot tell "does not exist" from
// "belongs to someone else".

function ownedFilter(id: string, userId: string) {
  return { _id: id, createdBy: new Types.ObjectId(userId) };
}

export const GET = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid template id.");
    }

    const template = await Template.findOne({ _id: id, enabled: true }).lean();

    if (!template) {
      return apiResponse(false, 404, "That template could not be found.");
    }

    return apiResponse(true, 200, "Template fetched successfully.", {
      id: template._id.toString(),
      name: template.name,
      description: template.description ?? "",
      category: template.category,
      tags: template.tags ?? [],
      thumbnailUrl: template.thumbnailUrl ?? null,
      doc: template.doc as EditorDoc,
      createdBy: template.createdBy.toString(),
      creatorName: template.creatorName ?? "",
      updatedAt: template.updatedAt.toISOString(),
    });
  },
  false,
);

export const PATCH = asyncHandler(
  updateTemplateBodySchema,
  async (req: NextRequest, changes, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid template id.");
    }
    if (Object.keys(changes).length === 0) {
      return apiResponse(false, 400, "Nothing to update.");
    }

    const update: Record<string, unknown> = { $set: changes };
    if (changes.doc) {
      // The stored document always names its own template, whatever the client
      // sent — and a content change is what bumps the version counter.
      update.$set = {
        ...changes,
        doc: { ...changes.doc, templateId: customTemplateId(id) },
      };
      update.$inc = { version: 1 };
    }

    const result = await Template.updateOne(ownedFilter(id, req.user!._id), update);

    if (result.matchedCount === 0) {
      return apiResponse(false, 404, "That template could not be found.");
    }

    return apiResponse(true, 200, "Template updated successfully.", { id });
  },
  true,
);

export const DELETE = asyncHandler(
  async (req: NextRequest, { id }: { id: string }) => {
    if (!objectIdSchema.safeParse(id).success) {
      return apiResponse(false, 400, "Not a valid template id.");
    }

    const result = await Template.deleteOne(ownedFilter(id, req.user!._id));

    if (result.deletedCount === 0) {
      return apiResponse(false, 404, "That template could not be found.");
    }

    return apiResponse(true, 200, "Template deleted successfully.", { id });
  },
  true,
);
