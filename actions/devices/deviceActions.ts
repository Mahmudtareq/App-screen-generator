"use server";

import { apiClient, type ApiError } from "@/lib/api-client";
import { rethrowIfRedirect } from "@/lib/redirect-guard";
import { routes } from "@/config/routes";
import type { CustomDeviceRow, DeviceInput } from "@/schemas/device";
import type { PaginatedResult } from "@/schemas/project";

/**
 * Admin CRUD for the device catalog's dynamic half, as wrappers over the
 * /api/admin/devices routes. The editor itself never calls these: it reads
 * enabled devices through `lib/devices/custom.ts` on the server pages, with no
 * auth at all, because the anonymous editor needs them too.
 */

export async function getDeviceList(page = 1, limit = 100, search = "") {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      search: search || "",
    });

    const res = await apiClient<{
      status: boolean;
      message: string;
      data: PaginatedResult<CustomDeviceRow>;
    }>(`${routes.api.adminDevices}?${params.toString()}`, { method: "GET" });

    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to get device list",
      data: {
        docs: [] as CustomDeviceRow[],
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

export async function createDevice(data: DeviceInput) {
  try {
    const res = await apiClient(routes.api.adminDevices, {
      method: "POST",
      body: data,
    });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to create the device",
      data: (error as ApiError)?.data,
    };
  }
}

export async function updateDevice(id: string, data: DeviceInput) {
  try {
    const res = await apiClient(routes.api.adminDevice(id), {
      method: "PATCH",
      body: data,
    });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to update the device",
      data: (error as ApiError)?.data,
    };
  }
}

export async function deleteDevice(id: string) {
  try {
    const res = await apiClient(routes.api.adminDevice(id), {
      method: "DELETE",
    });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to delete the device",
    };
  }
}
