import type { NextRequest } from "next/server";
import { Types } from "mongoose";

import { asyncHandler } from "@/lib/async-handler";
import { apiResponse, escapeRegex, makePaginate } from "@/lib/server.utils";
import { Project } from "@/models";
import {
  createProjectSchema,
  listProjectsSchema,
  type ProjectSummary,
} from "@/schemas/project";

/**
 * Ownership is always a filter clause, never a comparison after the fetch:
 *
 *   Project.findOne({ _id, userId })    ✅
 *   Project.findById(_id) then compare  ❌  races, and leaks whether the id exists
 *
 * `req.user` comes only from the session inside `asyncHandler`. No route here
 * reads a userId from the query or the body.
 */

export const GET = asyncHandler(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const { page, limit, search } = listProjectsSchema.parse(
    Object.fromEntries(searchParams),
  );

  const filter: Record<string, unknown> = {
    userId: new Types.ObjectId(req.user!._id),
  };
  if (search) {
    filter.name = { $regex: escapeRegex(search), $options: "i" };
  }

  const [docs, totalDocs] = await Promise.all([
    Project.find(filter)
      // Projecting away `doc` matters: an editor document with a gradient and
      // twenty text layers is far larger than the card that displays it.
      .select("name thumbnailUrl updatedAt")
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Project.countDocuments(filter),
  ]);

  const summaries: ProjectSummary[] = docs.map((doc) => ({
    id: doc._id.toString(),
    name: doc.name,
    thumbnailUrl: doc.thumbnailUrl ?? null,
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return apiResponse(true, 200, "Projects fetched successfully.", {
    docs: summaries,
    ...makePaginate(page, limit, totalDocs),
  });
}, true);

export const POST = asyncHandler(
  createProjectSchema,
  async (req: NextRequest, data) => {
    const project = await Project.create({
      userId: new Types.ObjectId(req.user!._id),
      name: data.name,
      doc: data.doc,
      thumbnailUrl: data.thumbnailUrl,
    });

    return apiResponse(true, 201, "Project created successfully.", {
      id: project._id.toString(),
    });
  },
  true,
);
