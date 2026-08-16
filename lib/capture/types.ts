/**
 * Website screenshot capture, behind a provider interface.
 *
 * The default provider calls Microlink's free API, which needs no key and no
 * infrastructure. Capture is an inherently swappable concern though — rate
 * limits, ad-blocking, authenticated pages and cookie banners all eventually
 * push you toward a paid API or a self-hosted headless browser — so the route
 * handler talks to this interface rather than to any one service.
 */

export interface CaptureRequest {
  url: string;
  /** CSS pixels, not device pixels — this is what the page lays itself out against. */
  width: number;
  height: number;
  /** Device pixel ratio. 3 gives a retina-sharp capture for a 3x phone. */
  scale: number;
  /** Capture the whole scrollable page rather than just the viewport. */
  fullPage: boolean;
}

export interface CaptureResult {
  bytes: ArrayBuffer;
  contentType: string;
}

export interface CaptureProvider {
  id: string;
  label: string;
  capture(request: CaptureRequest): Promise<CaptureResult>;
}

/**
 * A capture failure with a message safe to show the user.
 *
 * Capture fails for mundane, user-fixable reasons far more often than for bugs —
 * the site blocks bots, the page never settles, the daily quota is spent — and
 * each of those deserves its own sentence rather than "something went wrong".
 */
export class CaptureError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "CaptureError";
  }
}
