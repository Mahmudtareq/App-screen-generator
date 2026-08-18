# Task log

What has been built, in the order it was built, and what remains. One entry per
task, newest last.

Each entry says what was asked for, what shipped, and how it was checked — because
"done" for this project means `pnpm lint && pnpm type-check && pnpm build` pass *and*
the change was driven in a real browser. [FEATURES.md](FEATURES.md) explains how each
feature works; this file is the record of when and why it arrived.

**Keeping this file current:** add an entry when a task starts, tick its steps as they
land, and move it to Done with the date and the commit. A task that changed the
document shape names its `EDITOR_DOC_VERSION` bump, because that is the thing a future
reader will need to find.

---

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Done and verified |
| 🟡 | Partly done — the gap is named in the entry |
| ◻ | Not started |

---

## Done

### 1. Project setup ✅
**16 Aug 2026** · `af51e57`, `66b66ff`

1. Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4.
2. Auth.js with the MongoDB adapter sharing its `users` collection with Mongoose.
3. Cloudinary signed browser uploads; zod-validated environment in `config/env.ts`.
4. Konva canvas confined to `components/canvas/`, reached only through `canvas-host.tsx`.

### 2. Multiple screens ✅
**17 Aug 2026** · `446c2c2`

1. The document became a **set of screens** rather than one artboard — five store
   frames sharing a device, orientation and canvas size.
2. Within a screen, content became an **ordered layer array** (`layers[0]` paints
   first) instead of named slots.
3. Horizontally scrolling filmstrip, with each screen's inspector inserted inline
   after its own card.
4. `screen.pinned` opts one frame out of every bulk write.
5. **Doc shape:** `EDITOR_DOC_VERSION` 1 → 2, with the v1 single-artboard migration.

### 3. Rich text for titles and subtitles ✅
**17 Aug 2026** · `529da78`

1. A caption's copy became an ordered array of styled **runs**, so one word can be
   coloured or highlighted.
2. `lib/canvas/rich-text.ts` owns every wrap point and fragment position; preview and
   export share it, because Konva cannot lay out mixed runs.
3. tiptap editor in the inspector, coalescing and truncating to the schema's caps.
4. **Doc shape:** `EDITOR_DOC_VERSION` 2 → 3 (`text` string → `runs[]`).

### 4. Globals: global fonts ✅
**18 Aug 2026** · `522b6fe`

1. **Globals** popover in the toolbar, next to Setup — project-level type, because a
   listing whose typeface changes halfway through is not a set.
2. Title font and subtitle font, each written across every unpinned screen at once.
3. No `globalFont` field: the current value is read back off the layers, so a set
   styled apart reads "Mixed" and a single layer's inspector stays a real override.
4. Font browser dialog — a comparison, not a dropdown: every family renders in itself,
   with Recent and search.
5. Google Fonts fetched on demand by injecting a css2 stylesheet, tracked per family
   so export re-awaits exactly what the document uses. A failed request retries
   without the weight list, then degrades to the fallback face.
6. Family names reach `ctx.font` quoted the way Konva quotes them — `Open Sans`
   measured by hand and `"Open Sans"` painted by Konva are two different font strings,
   and the divergence moves a wrap point between preview and export.
7. **Doc shape:** `EDITOR_DOC_VERSION` 3 → 4 (`fontId` enum → any id, incl.
   `google:<Family>`).

**Checked:** picked Lobster + Space Mono across five screens; exported PNG matched the
preview's wrap points exactly.

### 5. Globals: colour replacer ✅
**18 Aug 2026** · `522b6fe`

1. Second tab in the Globals popover: every colour the set paints, with a use count.
2. Replacing one repaints every element using it, across all unpinned screens.
3. Listing and rewriting share **one traversal**, so a swatch offered is always a
   swatch that can move.
4. Each swatch says what paints it — `Background · Title` — and the footer names the
   damage ("Repaints 6 uses — title · shadow"). That cannot be derived afterwards:
   once a colour is only a hex, the elements holding it are indistinguishable.
5. Hexes compared normalised, because the document genuinely holds `#FFF`, `#ffffff`
   and `#ffffffff` for one colour.

**Checked:** replaced a gradient stop across five screens; undo and redo both
round-trip it as one step.

### 6. Image layer: fit, picker, library and tint ✅
**18 Aug 2026** · `5dcecad`

1. **The layer became a box with a bitmap fitted inside it** — a Group holding a
   transparent Rect plus the image, the shape a text layer already had. `placeImage`
   is the single answer to where the pixels go, read by the one node that preview and
   export both render.
2. **Fit** (contain / cover / stretch) and **vertical position**. `contain` is the
   default because it is the only fit that cannot distort artwork.
3. **Images resize freely** on canvas; only a device keeps its ratio. Without this the
   box could never differ from the bitmap and Fit had nothing to do.
4. **Image picker dialog** whose tabs are a registry — adding a source is a component
   and one line in `IMAGE_SOURCES`; the dialog knows nothing about any of them.
5. **Upload** source: drops, clicks and pastes.
6. **Your images** source: what the document already draws, walked from the document
   rather than an uploads table.
7. **Library** source: 35 original SVGs (scribbles, icons, gradient backdrops)
   declared in `config/image-library.ts`. Recolourable art is drawn with
   `currentColor` and tinted before rasterising, so one file serves a dark backdrop
   and a light one.
8. **Store badges**: Apple's and Google's *own* files, fetched by
   `pnpm fetch-store-badges` rather than redrawn — both licences require the owner's
   unmodified artwork. Sub-tabs by owner, because the licence differs by owner.
9. A library pick is **rasterised to a PNG** at a resolution the category chooses, then
   behaves like any upload. Konva draws bitmaps, so an SVG handed straight to the
   canvas is soft in a 3× export.
10. **Tint**: colour plus strength, painted onto a copy of the source with
    `source-atop` rather than applied as a Konva filter — a filtered node must be
    cached, and a cached node rasterises at the resolution it was cached at.
11. Typed fields for size, opacity, rotation and corner radius, replacing sliders.
12. `Remove image` (clears the artwork, keeps the layer) as a real button, distinct
    from the layer's own delete.
13. **Doc shape:** `EDITOR_DOC_VERSION` 4 → 5 (`fit`, `align`) and 5 → 6 (`tint`).

**Checked:** reframed a box and confirmed contain/cover/align render differently; drag
moves the box by exactly the pointer distance with no creep from the fit offset;
exported PNG contains the tint colour (7301 amber pixels sampled); library ink and
tint both survive rasterisation.

---

## Open

### 7. Device spec fidelity 🟡
Every device in `lib/devices/catalog.ts` is `fidelity: "draft"` — estimated bezel
geometry. Tuning them against real product photos is the main gap before shipping.
See [PLAN.md](PLAN.md).

### 8. Batch export ◻
Export runs one screen at a time on purpose: each screen is its own Stage, and a
browser holding five 32MP canvases is how this runs out of memory on an iPad.
Exporting the whole set needs server-side compositing (`sharp` + a zip).

### 9. Asset records ◻
There is no account-wide image library — "Your images" is scoped to the open project.
That needs the `Asset` model wired up (FEATURES.md H2).

### 10. Smaller gaps ◻
Named in each feature's **Backlog** in [FEATURES.md](FEATURES.md). The ones most likely
to be asked for next:

- Image layers: no flip, no border, no blend modes; tint is a flat colour only.
- Library: ink is baked at pick time, so changing it means picking again.
- The picker is only wired to image layers — the background panel and the device
  screenshot still have their own dropzone.
- Globals: no global shadow; recent fonts are per browser, not per account.
