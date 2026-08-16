/**
 * Hands a Blob to the browser as a download.
 *
 * Object URL rather than a data URI: a 3870 × 8388 PNG data URI is a 30–60MB
 * JavaScript string, which stalls the main thread building it and has
 * historically broken Safari when used as an `href`.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Revoking immediately can cancel the download in some browsers, which need the
  // URL to stay alive until they have started reading it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `My design` -> `my-design.png` */
export function toFilename(name: string, extension: string) {
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "mockup";

  return `${slug}.${extension}`;
}
