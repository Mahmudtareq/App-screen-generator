/**
 * Downloads the official App Store and Google Play badges into the image library.
 *
 * The artwork is fetched rather than vendored by hand, and rather than redrawn: both
 * Apple's and Google's terms require *their* unmodified files, so the only correct
 * copy is the one their own endpoints serve. Keeping the fetch in a script means the
 * provenance of every file in `public/library/badges/` is readable here instead of
 * being a binary someone once committed.
 *
 *   pnpm fetch-store-badges          # en-us
 *   pnpm fetch-store-badges fr-fr    # another locale
 *
 * Using these badges means accepting their owners' terms:
 *   https://developer.apple.com/app-store/marketing/guidelines/
 *   https://play.google.com/intl/en_us/badges/
 *
 * After adding a locale, add the new files to the `apple` / `google` groups in
 * `config/image-library.ts` — nothing here writes that file, because which badges a
 * project offers is an editorial choice rather than a download side effect.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BADGES_DIR = join(process.cwd(), "public", "library", "badges");

/** Apple serves SVG from its marketing tools API, keyed by badge, colour and locale. */
const APPLE_ENDPOINT = "https://toolbox.marketingtools.apple.com/api/v2/badges";

const APPLE_BADGES = [
  { badge: "download-on-the-app-store", color: "black", file: "app-store-black.svg" },
  { badge: "download-on-the-app-store", color: "white", file: "app-store-white.svg" },
  { badge: "download-on-the-mac-app-store", color: "black", file: "mac-app-store-black.svg" },
  { badge: "download-on-the-mac-app-store", color: "white", file: "mac-app-store-white.svg" },
] as const;

/** Google serves one generic PNG per locale. */
const GOOGLE_BADGES = [
  {
    url: (locale: string) =>
      `https://play.google.com/intl/${locale.replace("-", "_")}/badges/static/images/badges/en_badge_web_generic.png`,
    file: "google-play.png",
  },
] as const;

async function download(url: string, target: string) {
  const response = await fetch(url);

  if (!response.ok) {
    console.warn(`  skipped ${target} — ${response.status} from ${url}`);
    return;
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(target, bytes);
  console.log(`  ${target.replace(process.cwd() + "/", "")} (${bytes.length} bytes)`);
}

async function main() {
  const locale = process.argv[2] ?? "en-us";

  await mkdir(join(BADGES_DIR, "apple"), { recursive: true });
  await mkdir(join(BADGES_DIR, "google"), { recursive: true });

  console.log(`Apple badges (${locale}):`);
  for (const entry of APPLE_BADGES) {
    await download(
      `${APPLE_ENDPOINT}/${entry.badge}/${entry.color}/${locale}`,
      join(BADGES_DIR, "apple", entry.file),
    );
  }

  console.log(`Google Play badges (${locale}):`);
  for (const entry of GOOGLE_BADGES) {
    await download(entry.url(locale), join(BADGES_DIR, "google", entry.file));
  }

  console.log(
    "\nThese are trademarked assets. Use them per their owners' guidelines:\n" +
      "  https://developer.apple.com/app-store/marketing/guidelines/\n" +
      "  https://play.google.com/intl/en_us/badges/",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
