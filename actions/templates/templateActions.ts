"use server";

import { updateTag } from "next/cache";

import { apiClient, type ApiError } from "@/lib/api-client";
import { rethrowIfRedirect } from "@/lib/redirect-guard";
import { routes } from "@/config/routes";
import type { PaginatedResult } from "@/schemas/project";
import type {
  CreateTemplateInput,
  TemplateCategory,
  TemplateDetail,
  TemplateSummary,
  UpdateTemplateBody,
} from "@/schemas/template";

/**
 * Thin wrappers over the api-client — no direct database access here. The
 * routes own auth, ownership filters, validation and the response envelope;
 * an action's job is to build the request and soften a thrown error into the
 * same `{ status, message, data }` shape the routes return.
 */

const TEMPLATES_TAG = "templates";

export async function getTemplateList(
  page: number,
  limit: number,
  search = "",
  category?: TemplateCategory,
) {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search || "",
    });
    if (category) params.set("category", category);

    const res = await apiClient<{
      status: boolean;
      message: string;
      data: PaginatedResult<TemplateSummary>;
    }>(`${routes.api.templates}?${params.toString()}`, {
      method: "GET",
      tags: [TEMPLATES_TAG],
    });

    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to get template list",
      data: {
        docs: [] as TemplateSummary[],
        totalDocs: 0,
        page: 1,
        limit,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
}

export async function getTemplateDetail(id: string) {
  try {
    const res = await apiClient<{
      status: boolean;
      message: string;
      data: TemplateDetail;
    }>(routes.api.template(id), { method: "GET" });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to get the template",
      // Explicitly null rather than absent, so callers can narrow on `data`
      // without the `in` operator fighting the union.
      data: null,
    };
  }
}

export async function createTemplate(data: CreateTemplateInput) {
  try {
    const res = await apiClient<
      {
        status: boolean;
        message: string;
        data: { id: string; templateId: string };
      },
      CreateTemplateInput
    >(routes.api.templates, {
      method: "POST",
      body: data,
    });
    updateTag(TEMPLATES_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to create the template",
      data: (error as ApiError)?.data,
    };
  }
}

export async function updateTemplate(id: string, data: UpdateTemplateBody) {
  try {
    const res = await apiClient(routes.api.template(id), {
      method: "PATCH",
      body: data,
    });
    updateTag(TEMPLATES_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to update the template",
      data: (error as ApiError)?.data,
    };
  }
}

export async function deleteTemplate(id: string) {
  try {
    const res = await apiClient(routes.api.template(id), { method: "DELETE" });
    updateTag(TEMPLATES_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to delete the template",
    };
  }
}
