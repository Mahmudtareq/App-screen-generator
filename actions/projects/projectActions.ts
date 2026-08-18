"use server";

import { updateTag } from "next/cache";

import { apiClient, type ApiError } from "@/lib/api-client";
import { rethrowIfRedirect } from "@/lib/redirect-guard";
import { routes } from "@/config/routes";
import type {
  CreateProjectInput,
  PaginatedResult,
  ProjectSummary,
  UpdateProjectBody,
} from "@/schemas/project";

/**
 * Thin wrappers over the api-client — no direct database access here. The
 * routes own auth, ownership filters, validation and the response envelope;
 * an action's job is to build the request and soften a thrown error into the
 * same `{ status, message, data }` shape the routes return.
 */

const PROJECTS_TAG = "projects";

export async function getProjectList(page: number, limit: number, search = "") {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search || "",
    });

    const res = await apiClient<{
      status: boolean;
      message: string;
      data: PaginatedResult<ProjectSummary>;
    }>(`${routes.api.projects}?${params.toString()}`, {
      method: "GET",
      tags: [PROJECTS_TAG],
    });

    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to get project list",
      data: {
        docs: [] as ProjectSummary[],
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

export async function getProject(id: string) {
  try {
    const res = await apiClient(routes.api.project(id), { method: "GET" });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to get the project",
    };
  }
}

export async function createProject(data: CreateProjectInput) {
  try {
    const res = await apiClient(routes.api.projects, {
      method: "POST",
      body: data,
    });
    updateTag(PROJECTS_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to create the project",
      data: (error as ApiError)?.data,
    };
  }
}

export async function updateProject(id: string, data: UpdateProjectBody) {
  try {
    const res = await apiClient(routes.api.project(id), {
      method: "PATCH",
      body: data,
    });
    updateTag(PROJECTS_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to update the project",
      data: (error as ApiError)?.data,
    };
  }
}

export async function duplicateProject(id: string) {
  try {
    const res = await apiClient(routes.api.projectDuplicate(id), {
      method: "POST",
    });
    updateTag(PROJECTS_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error
          ? error.message
          : "Failed to duplicate the project",
    };
  }
}

export async function deleteProject(id: string) {
  try {
    const res = await apiClient(routes.api.project(id), { method: "DELETE" });
    updateTag(PROJECTS_TAG);
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to delete the project",
    };
  }
}
