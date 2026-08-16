"use server";

import { updateTag } from "next/cache";

import { raise, withAction } from "@/lib/action";
import { Project } from "@/models";
import type { EditorDoc } from "@/schemas/editor";
import {
  createProjectSchema,
  listProjectsSchema,
  projectIdSchema,
  updateProjectSchema,
  type PaginatedResult,
  type ProjectSummary,
} from "@/schemas/project";

const PROJECTS_TAG = "projects";

/**
 * Ownership is always a filter clause, never a comparison after the fetch:
 *
 *   Project.findOne({ _id, userId })    ✅
 *   Project.findById(_id) then compare  ❌  races, and leaks whether the id exists
 *
 * `ctx.userId` comes only from the session inside `withAction`. No action here
 * accepts a userId parameter, and none of the schemas has a field for one.
 */

export const listProjectsAction = withAction(
  { name: "projects.list", schema: listProjectsSchema },
  async ({ input, ctx }): Promise<PaginatedResult<ProjectSummary>> => {
    const filter = { userId: ctx.userId };
    const skip = (input.page - 1) * input.limit;

    const [docs, totalDocs] = await Promise.all([
      Project.find(filter)
        // Projecting away `doc` matters: an editor document with a gradient and
        // twenty text layers is far larger than the card that displays it.
        .select("name thumbnailUrl updatedAt")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(input.limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    const pages = Math.max(1, Math.ceil(totalDocs / input.limit));

    return {
      docs: docs.map((doc) => ({
        id: doc._id.toString(),
        name: doc.name,
        thumbnailUrl: doc.thumbnailUrl ?? null,
        updatedAt: doc.updatedAt.toISOString(),
      })),
      totalDocs,
      page: input.page,
      limit: input.limit,
      pages,
      hasNext: input.page < pages,
      hasPrev: input.page > 1,
    };
  },
);

export const getProjectAction = withAction(
  { name: "projects.get", schema: projectIdSchema },
  async ({ input, ctx }) => {
    const project = await Project.findOne({
      _id: input.id,
      userId: ctx.userId,
    }).lean();

    // NOT_FOUND rather than FORBIDDEN, so someone probing ids cannot tell the
    // difference between "does not exist" and "belongs to someone else".
    if (!project) raise("NOT_FOUND", "That project could not be found.");

    return {
      id: project._id.toString(),
      name: project.name,
      thumbnailUrl: project.thumbnailUrl ?? null,
      doc: project.doc as EditorDoc,
      updatedAt: project.updatedAt.toISOString(),
    };
  },
);

export const createProjectAction = withAction(
  { name: "projects.create", schema: createProjectSchema },
  async ({ input, ctx }) => {
    const project = await Project.create({
      userId: ctx.userId,
      name: input.name,
      doc: input.doc,
      thumbnailUrl: input.thumbnailUrl,
    });

    updateTag(PROJECTS_TAG);
    return { id: project._id.toString() };
  },
);

export const updateProjectAction = withAction(
  { name: "projects.update", schema: updateProjectSchema },
  async ({ input, ctx }) => {
    const { id, ...changes } = input;

    // One atomic $set of the whole editor document — the reason `doc` is nested
    // rather than flattened across a dozen top-level fields.
    const result = await Project.updateOne(
      { _id: id, userId: ctx.userId },
      { $set: changes },
    );

    if (result.matchedCount === 0) {
      raise("NOT_FOUND", "That project could not be found.");
    }

    updateTag(PROJECTS_TAG);
    return { id };
  },
);

export const duplicateProjectAction = withAction(
  { name: "projects.duplicate", schema: projectIdSchema },
  async ({ input, ctx }) => {
    const source = await Project.findOne({
      _id: input.id,
      userId: ctx.userId,
    }).lean();

    if (!source) raise("NOT_FOUND", "That project could not be found.");

    const copy = await Project.create({
      // The copy belongs to the caller, never to `source.userId` — the same value
      // here, but writing it this way keeps it correct if shared projects are
      // ever added.
      userId: ctx.userId,
      name: `${source.name} copy`,
      doc: source.doc,
      thumbnailUrl: source.thumbnailUrl,
    });

    updateTag(PROJECTS_TAG);
    return { id: copy._id.toString() };
  },
);

export const deleteProjectAction = withAction(
  { name: "projects.delete", schema: projectIdSchema },
  async ({ input, ctx }) => {
    const result = await Project.deleteOne({
      _id: input.id,
      userId: ctx.userId,
    });

    if (result.deletedCount === 0) {
      raise("NOT_FOUND", "That project could not be found.");
    }

    updateTag(PROJECTS_TAG);
    return { id: input.id };
  },
);
