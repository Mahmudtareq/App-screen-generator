import "server-only";

import { microlinkProvider } from "./microlink";
import { CaptureError, type CaptureProvider } from "./types";

const PROVIDERS: Record<string, CaptureProvider> = {
  [microlinkProvider.id]: microlinkProvider,
};

/**
 * Swap the default here — or register another provider above — to move off
 * Microlink. Nothing in the UI or the route handler names a specific service.
 *
 * A self-hosted Playwright provider would slot in as another entry, though it
 * needs a Chromium binary alongside the app and will not run on serverless
 * without `@sparticuz/chromium`.
 */
export const captureProvider: CaptureProvider = microlinkProvider;

export function getProvider(id?: string): CaptureProvider {
  if (!id) return captureProvider;
  const provider = PROVIDERS[id];
  if (!provider) throw new CaptureError(400, `Unknown capture provider "${id}".`);
  return provider;
}

export { CaptureError };
export type { CaptureProvider, CaptureRequest, CaptureResult } from "./types";
