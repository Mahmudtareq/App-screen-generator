/**
 * The built-in image library — the scribbles, badges and backdrops offered in the
 * image picker's Library tab.
 *
 * **Adding your own** is two steps and no code:
 *
 *   1. Drop the file in `public/library/<category>/`. SVG is preferred (see below);
 *      PNG, JPG and WebP work too.
 *   2. Add a line to the category's `items` array here.
 *
 * Adding a whole category is one entry in `IMAGE_LIBRARY` plus a folder. Removing
 * either is a deleted entry — nothing else in the picker reads these files.
 *
 * **Why SVG.** A library item is rasterised to a PNG at the moment it is picked
 * ([lib/editor/rasterize.ts](../lib/editor/rasterize.ts)), never handed to the
 * canvas as a vector. Konva draws bitmaps, and a 400px-wide SVG decoded at its
 * intrinsic size is visibly soft in a 3× export — so the SVG is the *source*, and
 * the rasteriser chooses the resolution. That indirection is also what makes
 * `recolorable` possible: a scribble drawn with `currentColor` is recoloured in
 * the markup before it is drawn, so one file serves a dark background and a light
 * one.
 *
 * **On store badges.** The App Store and Play Store marks, and brand logos
 * generally, are trademarks distributed under their owners' own terms — they are
 * not shipped here. Download the official artwork from Apple and Google, drop it
 * in `public/library/badges/`, and add the lines below; the licence you accept is
 * then yours rather than one this repo assumed on your behalf.
 */

export interface LibraryItem {
  /** Unique within its category; the React key and the pick's identity. */
  id: string;
  /** Shown on hover and matched by the search box. */
  name: string;
  /** Path under `public/`. */
  src: string;
  /**
   * True when the artwork is drawn with `currentColor` and should follow the
   * picker's colour swatch. Full-colour art (a photo, a gradient) is not.
   */
  recolorable?: boolean;
  /** Extra words the search box should match — synonyms, mostly. */
  keywords?: string;
}

/**
 * A sub-tab within a category.
 *
 * Only categories that need one have them: store badges split by owner because the
 * licence differs by owner, and mixing Apple's artwork with Google's in one grid
 * would make the notice above it a lie about which terms apply.
 */
export interface LibraryGroup {
  id: string;
  label: string;
  items: readonly LibraryItem[];
  /**
   * Shown in place of an empty grid.
   *
   * A group can ship with nothing in it and still be worth having: the trademarked
   * badges cannot live in this repo, so the group's job is to say what belongs here
   * and where it goes.
   */
  empty?: { title: string; body: string; path: string };
}

export interface LibraryLink {
  label: string;
  href: string;
}

export interface LibraryCategory {
  id: string;
  label: string;
  description: string;
  /** Long edge of the PNG a pick is rasterised to. Backdrops need more than a doodle. */
  rasterSize: number;
  /** A flat category. Mutually exclusive with `groups`. */
  items?: readonly LibraryItem[];
  /** A category split into sub-tabs. Mutually exclusive with `items`. */
  groups?: readonly LibraryGroup[];
  /** Terms the artwork in this category comes with, shown when it is opened alone. */
  notice?: { text: string; links: readonly LibraryLink[] };
  /**
   * How a thumbnail fills its tile.
   *
   * `cover` for artwork that *is* a rectangle — a backdrop reads better edge to
   * edge. Everything else is `contain`, because cropping a badge in the picker
   * misrepresents what picking it will produce.
   */
  tileFit?: "cover" | "contain";
}

const scribble = (id: string, name: string, keywords?: string): LibraryItem => ({
  id,
  name,
  src: `/library/scribbles/${id}.svg`,
  recolorable: true,
  keywords,
});

const badge = (id: string, name: string, keywords?: string): LibraryItem => ({
  id,
  name,
  src: `/library/badges/${id}.svg`,
  recolorable: true,
  keywords,
});

/**
 * Trademarked artwork, fetched by `pnpm fetch-store-badges` rather than redrawn.
 *
 * Never `recolorable`: both Apple and Google require their badge unaltered, and
 * tinting one is exactly the alteration their guidelines name first.
 */
const storeBadge = (
  owner: "apple" | "google",
  file: string,
  name: string,
  keywords?: string,
): LibraryItem => ({
  id: `${owner}-${file.replace(/\.[^.]+$/, "")}`,
  name,
  src: `/library/badges/${owner}/${file}`,
  keywords,
});

const backdrop = (id: string, name: string, keywords?: string): LibraryItem => ({
  id,
  name,
  src: `/library/backgrounds/${id}.svg`,
  keywords,
});

export const IMAGE_LIBRARY = [
  {
    id: "scribbles",
    label: "Scribbles & Doodles",
    description: "Hand-drawn arrows, circles, marks and highlights.",
    rasterSize: 1024,
    items: [
      scribble("circle", "Circle", "ring loop highlight"),
      scribble("underline", "Underline", "emphasis mark"),
      scribble("underline-double", "Double underline", "emphasis"),
      scribble("wave", "Wave", "squiggle line"),
      scribble("zigzag", "Zigzag", "line"),
      scribble("squiggle", "Squiggle", "wavy line"),
      scribble("arrow-curved", "Curved arrow", "pointer"),
      scribble("arrow-loop", "Looping arrow", "pointer swirl"),
      scribble("arrow-straight", "Straight arrow", "pointer"),
      scribble("bracket", "Brackets", "enclose"),
      scribble("sparkles", "Sparkles", "stars shine magic ai"),
      scribble("star-burst", "Starburst", "shine"),
      scribble("check", "Tick", "check yes done"),
      scribble("cross", "Cross", "x no"),
      scribble("heart", "Heart outline", "love like"),
      scribble("spiral", "Spiral", "swirl loop curl"),
    ],
  },
  {
    id: "badges",
    label: "Store Badges & Icons",
    description: "Store badges, ratings, marks and small UI icons for callouts.",
    rasterSize: 1024,
    notice: {
      text:
        "Trademarks and copyright material must be used in accordance with their owners’ licensing and terms.",
      links: [
        {
          label: "Apple trademarks & licensing",
          href: "https://developer.apple.com/app-store/marketing/guidelines/",
        },
        {
          label: "Google Play brand guidelines",
          href: "https://play.google.com/intl/en_us/badges/",
        },
      ],
    },
    groups: [
      {
        id: "icons",
        label: "Icons",
        items: [
          badge("stars", "Five stars", "rating review"),
          badge("check-badge", "Verified", "check tick approved"),
          badge("shield", "Secure", "shield privacy safe"),
          badge("heart-filled", "Heart", "love like favourite"),
          badge("bell", "Notifications", "alert reminder"),
          badge("download", "Download", "install get"),
          badge("tag", "Price tag", "offer sale"),
          badge("play", "Play", "video watch"),
          badge("bolt", "Fast", "speed lightning power"),
          badge("lock", "Private", "lock security"),
        ],
      },
      {
        id: "apple",
        label: "Apple Badges",
        // Apple's own artwork, downloaded from its marketing tools API by
        // `pnpm fetch-store-badges`. Not redrawn: Apple's terms require its
        // unmodified files, so a hand-made lookalike is a violation rather than a
        // shortcut — and not committed blind either, which is what the script is for.
        items: [
          storeBadge("apple", "app-store-black.svg", "Download on the App Store", "ios iphone dark"),
          storeBadge("apple", "app-store-white.svg", "App Store (white)", "ios iphone light"),
          storeBadge("apple", "mac-app-store-black.svg", "Download on the Mac App Store", "macos dark"),
          storeBadge("apple", "mac-app-store-white.svg", "Mac App Store (white)", "macos light"),
        ],
        empty: {
          title: "Add Apple’s official badges",
          body:
            "Run pnpm fetch-store-badges to download the artwork from Apple, then add a line each to config/image-library.ts. Pass a locale to get another language.",
          path: "public/library/badges/apple/",
        },
      },
      {
        id: "google",
        label: "Google Badges",
        items: [
          storeBadge("google", "google-play.png", "Get it on Google Play", "android play store"),
        ],
        empty: {
          title: "Add Google Play’s official badges",
          body:
            "Run pnpm fetch-store-badges to download the badge for your locale, then add a line each to config/image-library.ts.",
          path: "public/library/badges/google/",
        },
      },
    ],
  },
  {
    id: "backgrounds",
    label: "Backgrounds",
    description: "Gradients and blooms, as a full-bleed backdrop layer.",
    rasterSize: 1600,
    tileFit: "cover",
    items: [
      backdrop("dusk", "Dusk", "purple blue gradient"),
      backdrop("sunrise", "Sunrise", "orange pink warm"),
      backdrop("mint", "Mint", "green teal fresh"),
      backdrop("blush", "Blush", "pink peach soft"),
      backdrop("midnight", "Midnight", "dark navy night"),
      backdrop("aurora", "Aurora", "green purple mesh"),
      backdrop("candy", "Candy", "magenta yellow bright"),
      backdrop("lilac", "Lilac", "light purple soft"),
      backdrop("ember", "Ember", "red orange warm dark"),
      backdrop("slate", "Slate", "grey neutral light"),
    ],
  },
] as const satisfies readonly LibraryCategory[];

/**
 * A category's sub-tabs, with a flat category standing in as a single unnamed one.
 *
 * Normalising here rather than at every call site is what lets `items` stay the
 * simple, obvious shape for a category that does not need splitting.
 */
export function categoryGroups(category: LibraryCategory): readonly LibraryGroup[] {
  return (
    category.groups ?? [
      { id: category.id, label: category.label, items: category.items ?? [] },
    ]
  );
}

/** Everything in a category, for the overview row and for search. */
export function categoryItems(category: LibraryCategory): readonly LibraryItem[] {
  return category.groups
    ? category.groups.flatMap((group) => group.items)
    : (category.items ?? []);
}

/** Default ink for recolourable artwork — near-black, matching the UI's foreground. */
export const LIBRARY_DEFAULT_COLOR = "#111827";

/** One-click inks, chosen to cover a light backdrop, a dark one, and an accent. */
export const LIBRARY_COLOR_PRESETS = [
  LIBRARY_DEFAULT_COLOR,
  "#ffffff",
  "#4f46e5",
  "#e11d48",
  "#f59e0b",
  "#10b981",
] as const;
