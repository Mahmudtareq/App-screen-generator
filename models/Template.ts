import { Schema, model, models, type Model, type Types } from "mongoose";

import type { EditorDoc } from "@/schemas/editor";
import type { TemplateCategory } from "@/schemas/template";

/**
 * A user-saved template.
 *
 * Rows are public to read — the template list and "use this template" work for
 * guests — but writes are ownership-filtered on `createdBy`, exactly the way
 * `Project` filters on `userId`.
 *
 * `doc` is a full `EditorDoc` snapshot stored as `Mixed`, same arrangement as
 * `Project.doc`: `schemas/template.ts` (embedding `editorDocSchema`) is the
 * authority on shape and `asyncHandler` has validated before anything reaches
 * Mongo. Its inner `templateId` is rewritten to this row's own `custom:<id>` at
 * write time, so a project started from the template knows where it came from.
 *
 * `creatorName` is denormalised at create time rather than populated from the
 * Auth.js-shared `users` collection — see the header of `models/User.ts` for
 * why reading that collection is a minefield; a stale display label is fine.
 */
export interface ITemplate {
  _id: Types.ObjectId;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnailUrl: string | null;
  doc: EditorDoc;
  createdBy: Types.ObjectId;
  creatorName: string;
  sourceProjectId: Types.ObjectId | null;
  sourceTemplateId: Types.ObjectId | null;
  enabled: boolean;
  /** Bumped on every content update; reserved for future version history. */
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const templateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: "", trim: true, maxlength: 500 },
    category: { type: String, required: true, default: "general" },
    tags: { type: [String], default: [] },
    thumbnailUrl: { type: String, default: null },
    doc: { type: Schema.Types.Mixed, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    creatorName: { type: String, default: "" },
    sourceProjectId: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    sourceTemplateId: { type: Schema.Types.ObjectId, ref: "Template", default: null },
    enabled: { type: Boolean, required: true, default: true },
    version: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);

// The public list: every enabled template, newest first.
templateSchema.index({ enabled: 1, updatedAt: -1 });
// Ownership-filtered writes, and a future "my templates" list.
templateSchema.index({ createdBy: 1, updatedAt: -1 });

export const Template: Model<ITemplate> =
  (models.Template as Model<ITemplate>) ?? model<ITemplate>("Template", templateSchema);
