"use server";

import { apiClient } from "@/lib/api-client";
import { rethrowIfRedirect } from "@/lib/redirect-guard";
import { routes } from "@/config/routes";
import type { RegisterAssetInput } from "@/schemas/asset";

/**
 * Wrappers over the /api/assets routes. The upload bytes never touch this
 * server — the client uploads directly with a signature from
 * /api/cloudinary/sign, then reports the result here so the asset can be listed
 * and, later, deleted.
 */

export async function registerAsset(data: RegisterAssetInput) {
  try {
    const res = await apiClient(routes.api.assets, {
      method: "POST",
      body: data,
    });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to register the asset",
    };
  }
}

export async function deleteAsset(id: string) {
  try {
    const res = await apiClient(routes.api.asset(id), { method: "DELETE" });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to delete the asset",
    };
  }
}
