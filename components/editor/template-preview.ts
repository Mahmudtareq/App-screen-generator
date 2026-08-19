import type { Background } from "@/schemas/editor";

/**
 * A document background as a CSS value, for preview swatches only — the one
 * approximation shared by the gallery cards and the picker.
 */
export function backgroundPreviewCss(background: Background): string {
  if (background.type === "color") return background.color;
  if (background.type === "gradient") {
    const stops = background.stops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(", ");
    return `linear-gradient(${background.angle}deg, ${stops})`;
  }
  if (background.type === "radial") {
    const stops = background.stops
      .map((stop) => `${stop.color} ${Math.round(stop.offset * 100)}%`)
      .join(", ");
    return `radial-gradient(circle at center, ${stops})`;
  }
  return "#e5e7eb";
}
