# The built-in image library

Everything the image picker's **Library** tab offers lives here. Two things define an
item: the file in this folder, and one line in
[`config/image-library.ts`](../../config/image-library.ts). Nothing else in the app
reads these files, so adding one is those two steps and removing one is deleting them.

```
public/library/
  scribbles/      hand-drawn marks   → recoloured by the Ink swatch
  badges/         icons              → recoloured by the Ink swatch
  badges/apple/   Apple's own badges → never recoloured (trademarks)
  badges/google/  Google's own badge → never recoloured (trademarks)
  backgrounds/    gradients, blooms  → full-colour, fills its tile
```

---

## Adding an icon or a scribble

These are the recolourable ones — one file serves a dark background and a light one.

**1. Draw it with `currentColor`.** That is the whole trick: the colour is substituted
in the markup before the file is rasterised, so the artwork has no colour of its own.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="260"
     viewBox="0 0 320 260" fill="none">
  <path d="M28 216C58 108 130 44 268 44"
        stroke="currentColor" stroke-width="14" stroke-linecap="round"/>
</svg>
```

Rules that matter:

- **Set `width` and `height`, not just `viewBox`.** An SVG without intrinsic
  dimensions decodes as zero-sized in some browsers, and the rasteriser has nothing
  to scale from.
- **Use `currentColor` for every stroke and fill that should follow the Ink swatch.**
  A literal `#111827` will simply stay that colour.
- **Keep genuinely-fixed colours literal.** The tick inside `check-badge.svg` is
  `#fff` on purpose, so it stays a cut-out at any ink.
- **No external references** — no `<image href="…">`, no webfonts. Text in particular
  rasterises against whatever font the browser happens to have.

**2. Save it** as `public/library/scribbles/my-arrow.svg` (or `badges/` for an icon).

**3. Register it** in `config/image-library.ts`. Both folders have a helper, so the
line is short — the helper fills in `src` and `recolorable: true`:

```ts
// in the `scribbles` category's items
scribble("my-arrow", "My arrow", "pointer swoosh curve"),

// or in the badges category's `icons` group
badge("my-icon", "My icon", "synonyms the search box should match"),
```

The third argument is search keywords. Nobody types the name you chose, so put the
words they *will* type there.

---

## Adding a background

Full colour, no `currentColor`, and drawn portrait so it reads as a backdrop:

```ts
backdrop("my-gradient", "My gradient", "blue teal cool"),
```

Save it as `public/library/backgrounds/my-gradient.svg`. The category rasterises at
1600px rather than 1024 and fills its tile edge to edge (`tileFit: "cover"`), because a
backdrop *is* a rectangle.

---

## Adding a store badge

Do not draw one. Apple and Google license their badges on terms that require **their
unmodified artwork**, so a hand-made lookalike is a violation rather than a shortcut:

```bash
pnpm fetch-store-badges          # en-us
pnpm fetch-store-badges fr-fr    # another locale
```

Then add a line per file to the `apple` or `google` group:

```ts
storeBadge("apple", "app-store-black.svg", "Download on the App Store", "ios iphone"),
```

`storeBadge` deliberately does not set `recolorable`, which is the mechanism that keeps
the Ink swatch off a trademark. See the READMEs in `badges/apple/` and `badges/google/`.

---

## Adding a whole category

One folder, one entry in `IMAGE_LIBRARY`:

```ts
{
  id: "shapes",
  label: "Shapes",
  description: "Blobs, rings and cut-outs to sit behind a device.",
  rasterSize: 1024,          // long edge of the PNG a pick becomes
  items: [
    { id: "blob", name: "Blob", src: "/library/shapes/blob.svg", recolorable: true },
  ],
},
```

It appears as a row in the overview, a chip in the filter bar, and a "View all" view —
no component changes. Add `groups: [...]` instead of `items` when a category needs
sub-tabs (the store badges do, because the licence differs by owner), and `notice` to
put a line of terms above them.

---

## Non-SVG files

PNG, JPG and WebP work — just give the real filename in `src`:

```ts
{ id: "my-logo", name: "My logo", src: "/library/badges/my-logo.png" },
```

Two differences from SVG. They cannot be recoloured, so leave `recolorable` off. And
the rasteriser **never enlarges a bitmap** — it is used at its own size at most, so
supply one big enough for a 3× export (roughly 3× the artboard px you expect it to
occupy) rather than relying on `rasterSize` to make up the difference.

---

## What happens when someone picks it

Worth knowing, because it explains the rules above: the file is fetched, `currentColor`
is replaced with the chosen ink, and it is drawn to a PNG at the category's
`rasterSize` — Konva paints bitmaps, so a 400px SVG handed straight to the canvas would
be visibly soft in a 3× export. From there it is an ordinary uploaded image: local
object URL now, Cloudinary on save. See
[`lib/editor/rasterize.ts`](../../lib/editor/rasterize.ts).
