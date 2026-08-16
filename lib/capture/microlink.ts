import "server-only";

import { env } from "@/config/env";

import { CaptureError, type CaptureProvider, type CaptureRequest } from "./types";

const FREE_ENDPOINT = "https://api.microlink.io";
const PRO_ENDPOINT = "https://pro.microlink.io";

/** Microlink caps a single request at 30s; stop a little short of that. */
const TIMEOUT_MS = 28_000;

interface MicrolinkResponse {
  status: "success" | "fail" | "error";
  message?: string;
  data?: { screenshot?: { url?: string } };
}

/**
 * Screenshots via Microlink.
 *
 * Without `MICROLINK_API_KEY` this uses the free endpoint, which is rate limited
 * per IP (roughly 50 requests a day) and will start returning 429s under any real
 * traffic. Setting a key switches to the Pro endpoint transparently.
 */
export const microlinkProvider: CaptureProvider = {
  id: "microlink",
  label: "Microlink",

  async capture(request: CaptureRequest) {
    const endpoint = env.MICROLINK_API_KEY ? PRO_ENDPOINT : FREE_ENDPOINT;

    const params = new URLSearchParams({
      url: request.url,
      screenshot: "true",
      // Page metadata costs extra time to scrape and is not used here.
      meta: "false",
      "viewport.width": String(Math.round(request.width)),
      "viewport.height": String(Math.round(request.height)),
      "viewport.deviceScaleFactor": String(request.scale),
      "viewport.isMobile": "true",
      "viewport.hasTouch": "true",
      "screenshot.fullPage": String(request.fullPage),
      "screenshot.type": "png",
      // Wait for the network to settle so lazy-loaded hero images are present;
      // most marketing pages look empty without this.
      waitUntil: "networkidle2",
    });

    const response = await fetchJson(
      `${endpoint}/?${params.toString()}`,
      env.MICROLINK_API_KEY,
    );

    if (response.status !== "success" || !response.data?.screenshot?.url) {
      throw new CaptureError(
        502,
        response.message ??
          "That page could not be captured. It may block automated browsers.",
      );
    }

    const image = await fetch(response.data.screenshot.url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!image.ok) {
      throw new CaptureError(502, "The screenshot could not be downloaded.");
    }

    return {
      bytes: await image.arrayBuffer(),
      contentType: image.headers.get("content-type") ?? "image/png",
    };
  },
};

async function fetchJson(
  url: string,
  apiKey?: string,
): Promise<MicrolinkResponse> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: apiKey ? { "x-api-key": apiKey } : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new CaptureError(
        504,
        "That page took too long to load. Try again, or capture a simpler page.",
      );
    }
    throw new CaptureError(502, "Could not reach the screenshot service.");
  }

  if (response.status === 429) {
    throw new CaptureError(
      429,
      apiKey
        ? "The screenshot service is rate limiting this account."
        : "The free screenshot quota is used up for now. Add MICROLINK_API_KEY to raise it.",
    );
  }

  // Microlink reports page-level failures as 4xx with a JSON body, so parse
  // before deciding — the body usually explains what the site did.
  const body = (await response.json().catch(() => null)) as MicrolinkResponse | null;

  if (!body) {
    throw new CaptureError(502, "The screenshot service returned an unreadable response.");
  }

  return body;
}
