import { z } from "zod";

import { editorDocSchema } from "./editor";

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, "Not a valid id");

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "Give your project a name")
  .max(120);

export const createProjectSchema = z.object({
  name: projectNameSchema,
  doc: editorDocSchema,
  thumbnailUrl: z.url().nullable().default(null),
});

export const updateProjectSchema = z.object({
  id: objectIdSchema,
  name: projectNameSchema.optional(),
  doc: editorDocSchema.optional(),
  thumbnailUrl: z.url().nullable().optional(),
});

/** The PATCH body — the id comes from the route path, never the payload. */
export const updateProjectBodySchema = updateProjectSchema.omit({ id: true });

export const listProjectsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(24),
  search: z.string().trim().max(120).default(""),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>;

/** What the dashboard list needs — deliberately without the full editor doc. */
export interface ProjectSummary {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  docs: T[];
  totalDocs: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
