import { NextResponse } from "next/server";
import { z } from "zod";

import { CaptureError, captureProvider } from "@/lib/capture";
import { getDeviceSpecServer } from "@/lib/devices/custom";
import { orientSpec } from "@/lib/devices/orientation";
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

export async function POST(request: Request) {
  if (rateLimited(clientKey(request))) {
    return NextResponse.json(
      { error: "Too many captures in a row. Wait a moment and try again." },
      { status: 429 },
    );
  }

  const parsed = captureRequestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    const issues = z.flattenError(parsed.error).fieldErrors;
    return NextResponse.json(
      { error: issues.url?.[0] ?? "That request was not valid." },
      { status: 400 },
    );
  }

  const { url, deviceId, orientation, fullPage } = parsed.data;

  // Capture at the device's own CSS viewport so the page lays itself out as a
  // phone. Using the device-pixel screenshot size here would render a desktop
  // layout and then shrink it. Built-in ids resolve from the static catalog;
  // admin-authored ones come from the database.
  const resolved = await getDeviceSpecServer(deviceId);
  if (!resolved) {
    return NextResponse.json(
      { error: "That device is not available." },
      { status: 400 },
    );
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
    if (error instanceof CaptureError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/capture]", error);
    return NextResponse.json(
      { error: "The screenshot could not be taken. Please try again." },
      { status: 500 },
    );
  }
}
