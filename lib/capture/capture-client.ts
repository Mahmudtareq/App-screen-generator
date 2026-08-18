import type { Orientation } from "@/lib/devices/types";

/**
 * Requests a website capture and returns it as a File.
 *
 * A File, specifically, so the result is indistinguishable from something the
 * user dropped in — it goes through `createLocalAsset` and the Cloudinary upload
 * exactly like an uploaded screenshot, with no second code path to keep in step.
 */
export async function captureWebsite(options: {
  url: string;
  deviceId: string;
  orientation: Orientation;
  fullPage?: boolean;
}): Promise<File> {
  const response = await fetch("/api/capture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: options.url,
      deviceId: options.deviceId,
      orientation: options.orientation,
      fullPage: options.fullPage ?? false,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "The screenshot could not be taken.");
  }

  const blob = await response.blob();
  const name = safeFilename(options.url);

  return new File([blob], name, { type: blob.type || "image/png" });
}

function safeFilename(url: string): string {
  try {
    const { hostname } = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return `${hostname.replace(/[^a-z0-9.-]/gi, "-")}.png`;
  } catch {
    return "capture.png";
  }
}
