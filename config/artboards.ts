export interface ArtboardPreset {
  id: string;
  label: string;
  group: "App Store" | "Play Store" | "Social" | "Other";
  width: number;
  height: number;
}

export const ARTBOARD_PRESETS = [
  { id: "appstore-6-9", label: 'iPhone 6.9" — 1290 × 2796', group: "App Store", width: 1290, height: 2796 },
  { id: "appstore-6-5", label: 'iPhone 6.5" — 1242 × 2688', group: "App Store", width: 1242, height: 2688 },
  { id: "appstore-ipad-12-9", label: 'iPad 12.9" — 2048 × 2732', group: "App Store", width: 2048, height: 2732 },
  { id: "playstore-phone", label: "Play Store phone — 1080 × 1920", group: "Play Store", width: 1080, height: 1920 },
  { id: "ig-post", label: "Instagram post — 1080 × 1080", group: "Social", width: 1080, height: 1080 },
  { id: "ig-story", label: "Instagram story — 1080 × 1920", group: "Social", width: 1080, height: 1920 },
  { id: "x-post", label: "X post — 1600 × 900", group: "Social", width: 1600, height: 900 },
  { id: "dribbble", label: "Dribbble — 1600 × 1200", group: "Social", width: 1600, height: 1200 },
] as const satisfies readonly ArtboardPreset[];

export type ArtboardPresetId = (typeof ARTBOARD_PRESETS)[number]["id"];

export const DEFAULT_ARTBOARD_PRESET_ID: ArtboardPresetId = "appstore-6-9";

export function getArtboardPreset(id: string): ArtboardPreset | undefined {
  return ARTBOARD_PRESETS.find((p) => p.id === id);
}

/** Hard bounds shared by the zod schema and the artboard panel's number inputs. */
export const ARTBOARD_MIN = 16;
export const ARTBOARD_MAX = 8000;
