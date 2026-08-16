import { z } from "zod";

import { DEVICE_IDS } from "@/lib/devices/catalog";

/**
 * Hostnames that must never be captured.
 *
 * The screenshot service does the fetching, not this server, so this is not a
 * classic SSRF hole — but a private hostname would still be resolved from
 * somewhere, and letting arbitrary internal addresses through a public endpoint
 * is not worth the convenience of allowing `localhost` in development.
 */
const BLOCKED_HOSTNAME =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

export const captureUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a website address")
  .max(2048)
  // Bare domains are what people actually paste, so add the scheme rather than
  // rejecting "stripe.com".
  //
  // Matches *any* scheme, not just http(s): testing for `https?://` alone turns
  // "ftp://host" into "https://ftp://host", which parses as a valid URL with
  // host "ftp" and sails past the protocol check into a wasted capture request.
  .transform((value) =>
    /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`,
  )
  // Parsed once, inside a single guarded check. Zod runs every refinement even
  // after one fails, so a second `new URL(...)` in its own refine would throw on
  // exactly the input the first one rejected — surfacing as a 500 rather than a
  // validation error.
  .superRefine((value, ctx) => {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "That does not look like a valid web address",
      });
      return;
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({
        code: "custom",
        message: "Only http and https addresses can be captured",
      });
      return;
    }

    if (BLOCKED_HOSTNAME.test(url.hostname)) {
      ctx.addIssue({
        code: "custom",
        message: "Local and private addresses cannot be captured",
      });
    }
  });

export const captureRequestSchema = z.object({
  url: captureUrlSchema,
  deviceId: z.enum(DEVICE_IDS),
  orientation: z.enum(["portrait", "landscape"]).default("portrait"),
  fullPage: z.boolean().default(false),
});

export type CaptureRequestInput = z.input<typeof captureRequestSchema>;
