import { DEFAULT_DEVICE_ID, DEVICES, findBuiltinDevice } from "./catalog";
import type { DeviceSpec } from "./types";

/**
 * The one place a device id becomes a spec.
 *
 * Built-in devices stay static TypeScript (see the catalog's header for why);
 * admin-authored devices arrive from MongoDB. This registry merges the two, the
 * way the catalog always planned: the editor's server pages fetch the enabled
 * custom specs and register them here before the first Stage renders, so every
 * lookup below stays synchronous — the canvas never has a loading state for
 * geometry.
 *
 * The map lives at module level rather than in the Zustand store for the same
 * reason bitmaps do: specs are static data for the lifetime of a page, and
 * putting them in the store would clone them into every undo snapshot.
 */
const customDevices = new Map<string, DeviceSpec>();

/**
 * Replaces the registered custom set. Idempotent, and called during render on
 * purpose: the specs arrive as server-component props, and registering them in
 * an effect would let the first canvas paint happen before they exist.
 */
export function registerCustomDevices(specs: readonly DeviceSpec[]): void {
  customDevices.clear();
  for (const spec of specs) customDevices.set(spec.id, spec);
}

/**
 * Never returns undefined: a document naming a device this client cannot
 * resolve — one an admin has since deleted or disabled — falls back to the
 * default frame rather than crashing five Stages. The document keeps its id, so
 * the project heals itself if the device comes back.
 */
export function resolveDevice(id: string): DeviceSpec {
  return (
    findBuiltinDevice(id) ??
    customDevices.get(id) ??
    findBuiltinDevice(DEFAULT_DEVICE_ID)!
  );
}

/** Everything the picker can offer: built-ins first, then the admin's devices. */
export function listDevices(): DeviceSpec[] {
  return [...(DEVICES as readonly DeviceSpec[]), ...customDevices.values()];
}

/** Ids of admin-authored devices carry this prefix, so provenance is visible. */
export const CUSTOM_DEVICE_PREFIX = "custom:";

export function isCustomDeviceId(id: string): boolean {
  return id.startsWith(CUSTOM_DEVICE_PREFIX);
}
