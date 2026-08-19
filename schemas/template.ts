import { z } from "zod";

import { editorDocSchema, type EditorDoc } from "./editor";
import { objectIdSchema } from "./project";

/**
 * User-saved templates.
 *
 * Unlike the built-in recipes in `config/templates.ts`, a saved template holds a
 * full `EditorDoc` snapshot — every screen, layer and setting of the project it
 * was saved from. "Use this template" clones that document; there is no restyle
 * recipe to derive, which is why the in-editor "restyle" path stays built-ins
 * only.
 *
 * Pure zod, no `server-only`: the save dialog imports these for its form.
 */

export const TEMPLATE_CATEGORIES = [
  "general",
  "minimal",
  "bold",
  "colorful",
  "dark",
  "playful",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const templateMetaSchema = z.object({
  name: z.string().trim().min(1, "Give your template a name").max(120),
  description: z.string().trim().max(500).default(""),
  category: z.enum(TEMPLATE_CATEGORIES).default("general"),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
});

export const createTemplateSchema = templateMetaSchema.extend({
  doc: editorDocSchema,
  thumbnailUrl: z.url().nullable().default(null),
  /** The project this template was saved from, if it had been saved as one. */
  sourceProjectId: objectIdSchema.nullable().default(null),
});

/** The PATCH body — the id comes from the route path, never the payload. */
export const updateTemplateBodySchema = templateMetaSchema
  .extend({
    doc: editorDocSchema,
    thumbnailUrl: z.url().nullable(),
  })
  .partial();

export const listTemplatesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  search: z.string().trim().max(120).default(""),
  category: z.enum(TEMPLATE_CATEGORIES).optional(),
});

export type TemplateMeta = z.infer<typeof templateMetaSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateBody = z.infer<typeof updateTemplateBodySchema>;

/** What the gallery and picker list — deliberately without the full doc. */
export interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  thumbnailUrl: string | null;
  creatorName: string;
  updatedAt: string;
}

export interface TemplateDetail extends TemplateSummary {
  doc: EditorDoc;
  createdBy: string;
}

/**
 * Namespacing for user-template ids inside `doc.templateId`, mirroring
 * `customDeviceId` in `schemas/device.ts` — the prefix is what lets the editor
 * tell a database template from a built-in without a lookup.
 */
const CUSTOM_TEMPLATE_ID_PREFIX = "custom:";

export function customTemplateId(id: string): string {
  return `${CUSTOM_TEMPLATE_ID_PREFIX}${id}`;
}

export function isCustomTemplateId(id: string): boolean {
  return id.startsWith(CUSTOM_TEMPLATE_ID_PREFIX);
}

/** The database id inside a `custom:<id>` template id, or null if it is not one. */
export function parseCustomTemplateId(id: string): string | null {
  if (!isCustomTemplateId(id)) return null;
  const raw = id.slice(CUSTOM_TEMPLATE_ID_PREFIX.length);
  return /^[0-9a-f]{24}$/i.test(raw) ? raw : null;
}
