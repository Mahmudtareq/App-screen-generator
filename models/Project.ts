import { Schema, model, models, type Model, type Types } from "mongoose";

import type { EditorDoc } from "@/schemas/editor";

/**
 * A saved mockup.
 *
 * The editor document lives nested under `doc` rather than flattened onto the
 * project. That gives an atomic `$set: { doc }` instead of a dozen field paths, a
 * `doc.version` hook for migrating the editor schema, and a clean split between
 * the design itself and the metadata the dashboard lists.
 *
 * The subdocument below is deliberately permissive: `schemas/editor.ts` is the
 * authority on shape, enforced by `asyncHandler` before anything reaches Mongo.
 * Duplicating those rules here would mean two definitions to keep in step, and
 * the stricter one would reject documents the editor considers valid.
 */
export interface IProject {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  thumbnailUrl: string | null;
  doc: EditorDoc;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    thumbnailUrl: { type: String, default: null },
    doc: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);

// The dashboard's only query: this user's projects, most recently edited first.
projectSchema.index({ userId: 1, updatedAt: -1 });

export const Project: Model<IProject> =
  (models.Project as Model<IProject>) ?? model<IProject>("Project", projectSchema);
