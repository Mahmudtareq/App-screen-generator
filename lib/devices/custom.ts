import "server-only";

import { connectDB } from "@/lib/db";
import { Device } from "@/models";
import {
  buildDeviceSpec,
  customDeviceId,
  deviceInputSchema,
} from "@/schemas/device";

import { findBuiltinDevice } from "./catalog";
import type { DeviceSpec } from "./types";

/**
 * The dynamic half of the device catalog, read server-side.
 *
 * Editor pages call this and hand the result to `registerCustomDevices` on the
 * client, so the canvas can keep resolving specs synchronously (rule of the
 * static catalog: geometry is needed on first paint, with no loading state).
 */

/**
 * Every enabled admin-authored device, as renderer specs.
 *
 * Failure returns an empty list rather than throwing: the anonymous editor must
 * open even when the database is down — it would only lose the admin's devices,
 * not the built-in ones.
 */
export async function listEnabledDeviceSpecs(): Promise<DeviceSpec[]> {
  try {
    await connectDB();
    const docs = await Device.find({ enabled: true }).sort({ createdAt: 1 }).lean();

    const specs: DeviceSpec[] = [];
    for (const doc of docs) {
      const parsed = deviceInputSchema.safeParse(doc);
      if (!parsed.success) continue; // a malformed row costs itself, not the page
      specs.push(buildDeviceSpec(customDeviceId(doc._id.toString()), parsed.data));
    }
    return specs;
  } catch (error) {
    console.error("[devices] failed to load custom devices", error);
    return [];
  }
}

/**
 * Server-side id-to-spec resolution, for the capture route.
 *
 * The client registry cannot help on the server (custom devices are only
 * registered in the browser), so this checks the static catalog first and then
 * the database. Null means "unknown id" and the caller decides the status code.
 */
export async function getDeviceSpecServer(id: string): Promise<DeviceSpec | null> {
  const builtin = findBuiltinDevice(id);
  if (builtin) return builtin;

  const prefix = "custom:";
  if (!id.startsWith(prefix)) return null;

  const objectId = id.slice(prefix.length);
  if (!/^[0-9a-f]{24}$/i.test(objectId)) return null;

  try {
    await connectDB();
    const doc = await Device.findOne({ _id: objectId, enabled: true }).lean();
    if (!doc) return null;

    const parsed = deviceInputSchema.safeParse(doc);
    return parsed.success ? buildDeviceSpec(id, parsed.data) : null;
  } catch (error) {
    console.error("[devices] failed to resolve device", error);
    return null;
  }
}
