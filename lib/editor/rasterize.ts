"use client";

/**
 * Turns a library file into PNG bytes the normal asset pipeline can carry.
 *
 * Two problems solved in one pass.
 *
 * **Sharpness.** Konva draws bitmaps. An SVG handed to the canvas is decoded once
 * at its intrinsic size, so a 400px doodle is visibly soft in a 3× export of a
 * 1290px-wide artboard. Rasterising here means the *library* chooses the
 * resolution rather than the artwork's own attributes.
 *
 * **Recolouring.** Scribbles are drawn with `currentColor`, which is meaningless
 * to an `<img>`. Substituting it in the markup before the bitmap exists is the
 * only place the colour can be applied without a tint pass at render time — and
 * it means one file serves a dark backdrop and a light one.
 *
 * The result then behaves exactly like a dropped file: local object URL first,
 * Cloudinary upload on save. Nothing downstream knows the difference, which is
 * what keeps the library from needing its own persistence story.
 */

const PNG = "image/png";

async function decode(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/**
 * Draws at `longEdge` on its longer side.
 *
 * A vector source may be enlarged — that is the point of drawing it big — but a
 * bitmap never is: upscaling a 646px store badge to 1024 invents pixels and lands
 * softer than the file it started from.
 */
function targetSize(
  natural: { width: number; height: number },
  longEdge: number,
  vector: boolean,
): { width: number; height: number } {
  const longest = Math.max(natural.width, natural.height);
  if (longest <= 0) return { width: longEdge, height: longEdge };

  const scale = Math.min(longEdge / longest, vector ? 8 : 1);
  return {
    width: Math.round(natural.width * scale),
    height: Math.round(natural.height * scale),
  };
}

/**
 * Fetches a library asset and returns it as a PNG File.
 *
 * `color` is applied only to SVG sources that use `currentColor`; anything else is
 * rasterised as it is.
 */
export async function rasterizeLibraryImage(
  src: string,
  { name, longEdge = 1024, color }: { name: string; longEdge?: number; color?: string },
): Promise<File> {
  const response = await fetch(src);
  if (!response.ok) throw new Error(`Could not load ${src}`);

  const isSvg =
    src.endsWith(".svg") ||
    (response.headers.get("content-type") ?? "").includes("svg");

  const blob = isSvg
    ? new Blob([(await response.text()).replaceAll("currentColor", color ?? "#000000")], {
        type: "image/svg+xml",
      })
    : await response.blob();

  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await decode(objectUrl);
    const size = targetSize(
      { width: image.naturalWidth, height: image.naturalHeight },
      longEdge,
      isSvg,
    );

    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context unavailable");

    context.drawImage(image, 0, 0, size.width, size.height);

    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, PNG),
    );
    if (!png) throw new Error("Could not rasterise that image");

    return new File([png], `${name}.png`, { type: PNG });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
