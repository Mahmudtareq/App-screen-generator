import { NextResponse, type NextRequest } from "next/server";

import { asyncHandler } from "@/lib/async-handler";
import { CaptureError, captureProvider } from "@/lib/capture";
import { getDeviceSpecServer } from "@/lib/devices/custom";
import { orientSpec } from "@/lib/devices/orientation";
import { apiResponse } from "@/lib/server.utils";
import { captureRequestSchema } from "@/schemas/capture";

/**
 * Captures a website as a mobile screenshot and returns the image bytes.
 *
 * Returning the image itself, rather than a URL to it, is what lets a capture
 * enter the exact same pipeline as a dropped file: the client turns the response
 * into a Blob, renders it from a same-origin object URL immediately, and uploads
 * it to Cloudinary only when the project is saved. That keeps one image path for
 * everything on the canvas — no third-party URL is ever drawn directly, so
 * capture cannot reintroduce the canvas-tainting problem.
 *
 * Open to anonymous users on purpose: trying the tool without an account is the
 * point. That does mean the third-party quota is spendable by anyone, hence the
 * rate limit below.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 6;

/**
 * Per-instance rate limit.
 *
 * Deliberately simple and deliberately not sufficient for a multi-instance
 * deployment — it lives in process memory, so each instance counts separately
 * and a restart forgets everything. It exists to stop one tab from burning the
 * daily quota. Move it to Redis before scaling out.
 */
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);

  // Bound the map so a long-lived instance does not accumulate an entry per
  // client address forever.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  return false;
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// Anonymous on purpose (auth level false); the rate limit above is the guard.
// Unlike every other route, the success path returns raw image bytes rather
// than the JSON envelope — see the header comment. Errors still use apiResponse.
export const POST = asyncHandler(
  captureRequestSchema,
  async (req: NextRequest, data) => {
    if (rateLimited(clientKey(req))) {
      return apiResponse(
        false,
        429,
        "Too many captures in a row. Wait a moment and try again.",
      );
    }

    const { url, deviceId, orientation, fullPage } = data;

    // Capture at the device's own CSS viewport so the page lays itself out as a
    // phone. Using the device-pixel screenshot size here would render a desktop
    // layout and then shrink it. Built-in ids resolve from the static catalog;
    // admin-authored ones come from the database.
    const resolved = await getDeviceSpecServer(deviceId);
    if (!resolved) {
      return apiResponse(false, 400, "That device is not available.");
    }
    const spec = orientSpec(resolved, orientation);

    try {
      const result = await captureProvider.capture({
        url,
        width: spec.viewport.width,
        height: spec.viewport.height,
        scale: spec.viewport.scale,
        fullPage,
      });

      return new NextResponse(result.bytes, {
        headers: {
          "Content-Type": result.contentType,
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      // The provider's status codes carry meaning (timeouts, blocked hosts) the
      // wrapper's generic mapping would flatten to 500, so they are kept here.
      if (error instanceof CaptureError) {
        return apiResponse(false, error.status, error.message);
      }
      throw error;
    }
  },
  false,
);
