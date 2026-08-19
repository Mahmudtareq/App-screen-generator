import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse, escapeRegex, makePaginate } from "@/lib/server.utils";
import { Template } from "@/models";
import {
  createTemplateSchema,
  customTemplateId,
  listTemplatesSchema,
  type TemplateSummary,
} from "@/schemas/template";

/**
 * Templates are public to read and ownership-filtered to write: the list and
 * "use this template" work for guests, while create/update/delete require the
 * session and filter on `createdBy` (see the [id] route).
 */

export const GET = asyncHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, limit, search, category } = listTemplatesSchema.parse(
    Object.fromEntries(searchParams),
  );

  const filter: Record<string, unknown> = { enabled: true };
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }
  if (category) {
    filter.category = category;
  }

  const [docs, totalDocs] = await Promise.all([
    Template.find(filter)
      // Projecting away `doc` matters: a full five-screen editor document is
      // far larger than the card that displays it.
      .select("name description category tags thumbnailUrl creatorName updatedAt")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Template.countDocuments(filter),
  ]);

  const summaries: TemplateSummary[] = docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description ?? "",
    category: doc.category,
    tags: doc.tags ?? [],
    thumbnailUrl: doc.thumbnailUrl ?? null,
    creatorName: doc.creatorName ?? "",
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return apiResponse(true, 200, "Templates fetched successfully.", {
    docs: summaries,
    ...makePaginate(page, limit, totalDocs),
  });
}, false);

export const POST = asyncHandler(
  createTemplateSchema,
  async (req: NextRequest, data) => {
    // The id is allocated up front so the stored document can reference its own
    // template: a project started from this template carries `custom:<id>` in
    // `doc.templateId`, which is what makes "Update template" offerable later.
    const _id = new Types.ObjectId();

    const template = await Template.create({
      _id,
      name: data.name,
      description: data.description,
      category: data.category,
      tags: data.tags,
      thumbnailUrl: data.thumbnailUrl,
      doc: { ...data.doc, templateId: customTemplateId(_id.toString()) },
      createdBy: new Types.ObjectId(req.user!._id),
      // `req.user` carries no display name (see async-handler), and the
      // Auth.js-shared `users` collection is deliberately not read here — the
      // email local-part is a good-enough stable label.
      creatorName: req.user!.email.split("@")[0] ?? "",
      sourceProjectId: data.sourceProjectId
        ? new Types.ObjectId(data.sourceProjectId)
        : null,
    });

    const id = template._id.toString();
    return apiResponse(true, 201, "Template created successfully.", {
      id,
      templateId: customTemplateId(id),
    });
  },
  true,
);
