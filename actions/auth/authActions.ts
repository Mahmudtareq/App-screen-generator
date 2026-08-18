"use server";

import { apiClient, type ApiError } from "@/lib/api-client";
import { rethrowIfRedirect } from "@/lib/redirect-guard";
import { routes } from "@/config/routes";
import type { RegisterInput } from "@/schemas/auth";

export async function handleRegister(data: RegisterInput) {
  try {
    // Public endpoint — there is no session to forward yet.
    const res = await apiClient(routes.api.register, {
      method: "POST",
      body: data,
      auth: false,
    });
    return res;
  } catch (error) {
    rethrowIfRedirect(error);
    return {
      status: false,
      message:
        error instanceof Error ? error.message : "Failed to create the account",
      // On validation failure the route puts a { field: message } map here,
      // which the form wires back onto its inputs.
      data: (error as ApiError)?.data,
    };
  }
}
