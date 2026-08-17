# Implementation Plan

Device mockup generator (Shotsnapp / Previewed / AppMockUp class): upload a phone
screenshot, drop it into a device frame, set a background, add a logo and
title/body text, drag things with live preview, export PNG/JPG/WebP at App Store
resolutions.

Status legend: **✅ built and verified** · **◻ not started**

---

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Storage | Cloudinary | Free tier, URL transforms, no infra to own |
| Device frames | SVG/Konva primitives, drawn from data | No asset licensing, crisp at any export scale |
| Auth | Auth.js v5 — credentials (bcrypt) + optional Google | Real password verification, OAuth optional |
| Package manager | pnpm | Matches sibling `../textnest-frontend` |
| Editor document | A set of screens, each an ordered layer array | See "Reversed decisions" |
| Device catalog | Static TypeScript, not MongoDB | Coupled to render code; needed synchronously on first paint |

### Conventions inherited from `../textnest-frontend`

- `actions/<domain>/<domain>Actions.ts`, `"use server"` on line 1
- Every catch re-throws Next control-flow errors (`NEXT_REDIRECT`) first
- `config/routes.ts` — centralised routes, dynamic ones as functions
- Root-level `app/`, `@/*` → project root, Tailwind v4 CSS-first, shadcn + `cn()`
- Next 16: `proxy.ts` (not `middleware.ts`), `updateTag` (not `revalidateTag`)

### Conventions deliberately *not* inherited

The sibling project has these problems; they are fixed here rather than copied:
mixed action envelopes (`{ok}` / `{status}` / `{success}`), zod only on the
client, raw `process.env` with hardcoded fallbacks, `secret` set to a literal
string, and an `authorize()` that returns credentials unconditionally.

### Reversed decisions

**Editor document: explicit slots → a set of screens, each an ordered layer array.**

The original decision was one artboard per project with named slots (one device,
one screenshot, one logo, captions) and a hardcoded z-order, on the grounds that
"z-order is fixed" and a normalised node graph was more than the product needed.

Both halves turned out to be wrong about the product:

- **One artboard is not the unit of work.** Nobody ships one store screenshot;
  they ship five. With a single-artboard document, making a matching set meant five
  projects and re-doing the background and type five times, and retargeting to
  another store size meant doing it again.
- **Z-order is not fixed.** The commonest thing anyone wants is decoration behind
  the device *and* something in front of it. Fixed slots cannot express that at
  all, and adding "logo2" slots is how a slot model dies.

So `doc` became `{ deviceId, orientation, artboard, screens[] }`, and each screen
became `{ background, layers[] }` where `layers` is bottom-first. Device model,
orientation and artboard stayed document-level: five frames of one listing that
disagree about which phone they are aren't a set, and mixed export dimensions are
never what anyone wanted.

What the original reasoning got right, and is kept: layers are a discriminated
union of three concrete kinds, not a generic node graph with arbitrary nesting.
There are no groups, no nested transforms and no parent-child chains — the flat
array is the whole model.

Cost of the reversal: `EDITOR_DOC_VERSION` 1 → 2 with a migration
(`lib/editor/persistence.ts`), which reproduces the old fixed z-order literally so
a project saved under v1 opens looking identical.

Note the sibling is **not** a Mongoose reference — `mongoose` is in its
dependencies with zero connection code and no models. The whole data layer here
is new work.

---

## Architecture

```
Konva Stage (artboard px)  →  Zustand `doc` slice  →  Project.doc (Mongo)
      │                                                       ▲
      └─ screenshots/logos ─→ signed direct upload ─→ Cloudinary ─┘
```

Three rules everything else follows from:

1. **The editor's `doc` slice is the persisted document** — saving is
   `updateProject(id, doc)` with no field mapping.
2. **Devices are static TypeScript** — read-only reference data coupled to the
   renderer, needed on first paint with no loading state.
3. **One image path for anything on canvas** — `fetch → Blob → blob:` URL. This
   is the structural fix for canvas tainting; see Risks.

---

## Phase 1 — MVP ✅ complete

| # | Step | Status |
|---|---|---|
| 1 | Scaffold: Next 16.3.1, React 19.2.8, TS strict, Tailwind v4, shadcn, deps, `canvas` alias | ✅ |
| 2 | Device types + catalog + zod doc contract + artboard presets | ✅ |
| 3 | Zustand store, four slices | ✅ |
| 4 | Canvas host (`ssr:false`) + Stage; `pnpm build` as the Konva-leak canary | ✅ |
| 5 | Device frame — body, screen, buttons, notch | ✅ |
| 6 | Blob-URL image cache + cover crop + clipped screen | ✅ |
| 7 | Dropzone, local object URL, render before upload | ✅ |
| 8 | Canvas font registry + `@font-face` + load gate | ✅ |
| 9 | Selection Transformer + shared `normalizeTransform` | ✅ |
| 10 | Background and artboard panels | ✅ |
| 11 | Export — PNG/JPG/WebP, 1×/2×/3×, transparency, dimension guard | ✅ |
| 12 | `lib/db.ts`, models, typed env, action envelope, Auth.js, proxy, index sync | ✅ |
| 13 | Signed Cloudinary upload with XHR progress | ✅ |
| 14 | Save/load, dashboard, draft→account claim, undo/redo, autosave | ✅ |

Undo/redo (zundo) was pulled forward from step 13 into the store's initial
construction — the slice boundary made it a few lines, and the toolbar needed it.

### Verified end to end

Against a real browser and a real MongoDB:

- Upload → select → export PNG: 2580×5592, no selection handles baked in
- JPG export takes the opaque-backdrop path (not black)
- iPhone 15 Pro / Pixel 8 / iPhone SE / landscape all render, zero console errors
- Anonymous `/dashboard` → `/login`; `/editor` stays public
- Register → `session.user.id` reaches the server action
- Duplicate email → `CONFLICT` with a real message, not a 500
- Un-uploaded asset blocks the save (the `blob:` guard holds)
- Save → reload → round trip; a second user gets 404 on the first user's project
- `pnpm lint`, `pnpm type-check`, `pnpm build` clean

### Bugs found by running it, not by planning

1. **Infinite render loop in landscape.** `selectOrientedSpec` returned a new
   object per call and Zustand v5 compares with `Object.is`. Portrait hid it
   completely — it returns the catalog object unchanged. Rotated specs are now
   memoised in `lib/devices/orientation.ts`, which is a correctness requirement
   rather than an optimisation.
2. **Landscape devices overflowed the artboard.** The fit was height-only, so a
   rotated device scaled to roughly three artboard widths. Now fits both axes.
3. **Side buttons detached when rotated.** The model only had left/right edges,
   so a rotated left-edge button drew vertically off the body. Extended to four
   edges with an explicit edge-rotation mapping.
4. **`/editor/:id*` would have forced auth on the anonymous editor** — `*`
   matches zero segments. Now `:id+`.

---

## Phase 2 — Multi-screen editor ✅ complete

Rebuilt around a set of screens and an ordered layer stack, following the
Shotsnapp/AppScreens filmstrip model.

| # | Step | Status |
|---|---|---|
| 1 | Doc v2: screens, layer union, migration from v1 | ✅ |
| 2 | Two templates in `config/templates.ts`, five screens each | ✅ |
| 3 | Filmstrip of one Konva Stage per screen; stage registry keyed by screen id | ✅ |
| 4 | Add / duplicate / delete / reorder / pin screens | ✅ |
| 5 | Inline inspector: layer list, add/delete/restack, visibility and lock | ✅ |
| 6 | Per-layer panels — device, image, text — plus per-screen background | ✅ |
| 7 | Assets rekeyed `screenId/layerId`; upload walk over all screens | ✅ |
| 8 | Per-screen export; `/templates` gallery; template restyle vs. start over | ✅ |

Image layers replaced the single logo slot outright, which closed the "logo layer
wired into the UI" item as a side effect. URL-based screenshot import already
existed and was rewired per device layer.

### Verified end to end

Against a real browser (Playwright, dev server):

- `/templates` → Aurora → five screens render, 15 canvases (3 layers × 5), zero
  console errors
- Clicking a card opens its inspector inline beside it; layer rows read Device
  (layer 1, bottom) → Title → Subtitle, top-first
- Add screen → 6, delete → 5; the last screen cannot be deleted
- Screenshot dropped into a device layer renders clipped to the screen rect;
  a separate image layer renders above it at layer 4 (top)
- Export at 2× produced 2580 × 5592 with no `SecurityError` — the blob pipeline
  holds with two independent image sources in one screen
- 3× is correctly disabled at 6.9" (32MP), with the reason in the tooltip
- `pnpm lint`, `pnpm type-check`, `pnpm build` clean

### Still open from the original Phase 2

- Visual tuning pass on all five device specs (see Risks — this is the real work)
- Project duplicate/delete from the dashboard (actions exist; no UI yet)
- Thumbnail generation on save, so dashboard cards stop being empty frames
- Drag-and-drop reordering, for both screens and layers (arrow buttons today)

## Phase 3 — Polish ◻

- Google Fonts picker — extends the existing canvas font registry, same
  `@font-face` + `ensureFontsLoaded` machinery
- Resolution presets per store listing
- **Batch export across devices** — the first feature that genuinely needs a
  server. Add `sharp` and composite server-side, returning a zip, rather than
  asking the browser to hold five 32MP canvases

## Phase 4 — Nice to have ◻

- More templates — data-only additions to `config/templates.ts`. Promote to a
  collection only when non-engineers need to author them. Worth adding a unit test
  that every template's `createDocFromTemplate` output parses against
  `editorDocSchema`; today only the two shipped ones are known-good, and by
  inspection rather than assertion
- Sharing via an explicit `visibility: "private" | "unlisted"` field plus a
  separate `getPublicProject` action — **never** by relaxing the ownership filter
- PDF export, team accounts

---

## Risks

**1. Canvas tainting on export.** The failure mode is nasty: everything works,
then `stage.toBlob()` throws `SecurityError` for some users, or only on the
*second* export, because the browser cached a non-CORS copy of a Cloudinary URL
that a thumbnail fetched first. Intermittent, environment-dependent, and it never
reproduces on a hard refresh.

*Mitigated structurally:* `lib/canvas/image-cache.ts` is the single path for
anything drawn on canvas — `fetch` → `Blob` → `blob:` object URL. A same-origin
blob URL cannot taint, regardless of cache state. Do not introduce a second path;
`use-image` is fine for prototyping but must not ship.

**2. Konva text metrics vs. webfont load order.** Konva measures glyphs with
`ctx.measureText` at construction, so a font arriving late bakes wrong line
breaks — the title wraps to two lines in preview and three in the export.
Compounded by `next/font`'s mangled family names failing silently, since
`ctx.font` cannot resolve CSS variables.

*Mitigated:* separate canvas font registry with literal family names, self-hosted
`@font-face`, first-render gate, `fontsVersion` redraw on late loads, and fonts
re-awaited inside the export pipeline.

**3. Transformer scale drift.** Konva's Transformer mutates `scaleX`/`scaleY`,
not `width`/`height`. Persisting those raw makes a resized text node store
`scaleX: 2.4` and render its stroke, shadow and letter spacing at 2.4× forever.

*Mitigated:* `normalizeTransform` in `lib/canvas/transform.ts`, called from every
`onTransformEnd`. Never do this inline in a component.

**4. Every device spec is `fidelity: "draft"`.** Bezel widths, corner radii and
notch geometry come from published screen resolutions with estimated bezels. They
read as phones, but the gap between "looks like a phone" and "looks like a cheap
phone" is exactly these numbers. Budget roughly half a day per device against a
real product photo, then flip to `"tuned"`. **This is the main thing standing
between the current state and shipping.**

**5. Auth.js adapter shares the `users` collection with Mongoose.** It fails
silently when it fails: OAuth users missing Mongoose defaults, `passwordHash`
leaking through a spread `user` object, `session.user.id` undefined because the
JWT-strategy `session` callback receives no `user` argument. All four mitigations
are implemented and documented in `models/User.ts` and `auth.ts` — read those
before changing either.

---

## Verifying changes

```bash
pnpm lint && pnpm type-check && pnpm build
```

`pnpm build` doubles as the check that Konva has not leaked into the server
bundle — a stray top-level `react-konva` import anywhere but
`components/canvas/canvas-stage.tsx` fails it.

Beyond that:

1. **Export at 3×** and confirm `toBlob` resolves — the tainting canary.
2. **Hard-refresh with cache disabled**, compare the preview's line breaks
   against the export. They must match, or a font loaded late.
3. **Auth round trip** — register with credentials, then sign in with Google on
   the same email; expect one `users` document and two `accounts` rows.
4. **Ownership** — open another user's project id; expect 404, not 403.
5. **Export dimension guard** — 1290×2796 at 3× is 32MP and fails on some iPads;
   the option must be disabled with an explanation, not produce a blank image.
6. `pnpm sync-indexes` — confirm the unique email index exists.

Setup and conventions are in [README.md](README.md).
