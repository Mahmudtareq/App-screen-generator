# Feature breakdown

A per-feature map of Mockup Studio, written to be worked through one feature at a
time. Each entry says what the feature *is*, which files own it, how it actually
works, and what is left to do.

- [PLAN.md](PLAN.md) — phases, locked decisions, risks
- [README.md](README.md) — setup and conventions
- [CLAUDE.md](CLAUDE.md) — the rules that must not be broken

**Status legend**

| | Meaning |
|---|---|
| ✅ | Built and verified in a browser |
| 🟡 | Built but incomplete — usable, with named gaps |
| 🔌 | Code exists but nothing calls it |
| ◻ | Not started |

**Before touching any feature**, verify with `pnpm lint && pnpm type-check && pnpm build`.
The build is the canary that Konva has not leaked into the server bundle.

---

## Index

| # | Feature | Status | Area |
|---|---|---|---|
| [A1](#a1-editor-document-model) | Editor document model | ✅ | Document |
| [A2](#a2-schema-versioning--migrations) | Schema versioning & migrations | ✅ | Document |
| [A3](#a3-local-draft--autosave) | Local draft & autosave | ✅ | Document |
| [A4](#a4-save--load-projects) | Save & load projects | 🟡 | Document |
| [A5](#a5-undo--redo) | Undo & redo | ✅ | Document |
| [B1](#b1-filmstrip--viewport) | Filmstrip & viewport | ✅ | Screens |
| [B2](#b2-screen-crud) | Screen add/duplicate/delete/reorder | 🟡 | Screens |
| [B3](#b3-screen-pinning) | Screen pinning | ✅ | Screens |
| [B4](#b4-screen-reset) | Screen reset | ✅ | Screens |
| [C1](#c1-layer-stack--ordering) | Layer stack & ordering | 🟡 | Layers |
| [C2](#c2-shared-layer-controls) | Shared layer controls | ✅ | Layers |
| [C3](#c3-device-layer) | Device layer | 🟡 | Layers |
| [C4](#c4-screenshot-upload) | Screenshot upload | ✅ | Layers |
| [C5](#c5-website-url-capture) | Website URL capture | 🟡 | Layers |
| [C6](#c6-title--subtitle-text-layer) | Title & subtitle (text layer) | 🟡 | Layers |
| [C7](#c7-image-layer) | Image layer | ✅ | Layers |
| [C8](#c8-image-picker) | Image picker | ✅ | Layers |
| [D1](#d1-background) | Background | 🟡 | Appearance |
| [E1](#e1-templates) | Templates | 🟡 | Project |
| [E2](#e2-device-catalog--orientation) | Device catalog & orientation | 🟡 | Project |
| [E3](#e3-artboard-size--presets) | Artboard size & presets | ✅ | Project |
| [E4](#e4-global-fonts) | Global fonts | ✅ | Project |
| [E5](#e5-colour-replacer) | Colour replacer | ✅ | Project |
| [F1](#f1-konva-stage-pipeline) | Konva stage pipeline | ✅ | Engine |
| [F2](#f2-origin-clean-image-cache) | Origin-clean image cache | ✅ | Engine |
| [F3](#f3-canvas-fonts) | Canvas fonts | ✅ | Engine |
| [F4](#f4-selection--transformer) | Selection & transformer | 🟡 | Engine |
| [F5](#f5-keyboard-shortcuts) | Keyboard shortcuts | 🟡 | Engine |
| [G1](#g1-per-screen-export) | Per-screen export | ✅ | Export |
| [G2](#g2-batch-export) | Batch export | ◻ | Export |
| [H1](#h1-signed-direct-upload) | Signed direct upload | ✅ | Assets |
| [H2](#h2-asset-records) | Asset records | 🔌 | Assets |
| [I1](#i1-authentication) | Authentication | ✅ | Accounts |
| [I2](#i2-project-dashboard) | Project dashboard | 🟡 | Accounts |
| [I3](#i3-route-protection) | Route protection | ✅ | Accounts |
| [J](#j-not-started) | Not started — candidate features | ◻ | — |

### Suggested order to work in

1. **[H2](#h2-asset-records)** — asset records. Nothing writes the `Asset`
   collection, so every upload is an untracked orphan in Cloudinary. This gets worse
   the longer it runs and blocks any storage-quota work.
2. **[E2](#e2-device-catalog--orientation)** — device fidelity tuning. The single
   biggest thing between this and shipping.
3. **[I2](#i2-project-dashboard)** + **[A4](#a4-save--load-projects)** — thumbnails,
   duplicate/delete UI. Two actions are already written and unwired.
4. **[C1](#c1-layer-stack--ordering)** / **[B2](#b2-screen-crud)** — drag-and-drop
   reordering, once the data model has settled.
5. **[G2](#g2-batch-export)** — batch export. Needs a server, so schedule it as
   its own piece of work.

---

## A. Document & persistence

### A1. Editor document model

**What it is.** The single shape shared by the store, the server actions and Mongo.
A project is a set of screens; a screen is a background plus an ordered layer array.

```text
doc    = { version, templateId, deviceId, orientation, artboard, screens[1..12] }
screen = { id, name, pinned, background, layers[0..24] }
layer  = device | image | text        // discriminated on `kind`
```

**Files**

- [schemas/editor.ts](schemas/editor.ts) — the authority on shape; zod contracts,
  narrowing helpers (`isDeviceLayer` / `isImageLayer` / `isTextLayer`), label helpers
- [lib/editor/state.ts](lib/editor/state.ts) — the slice contract
- [lib/editor/slices/document.ts](lib/editor/slices/document.ts) — every mutation
- [lib/editor/defaults.ts](lib/editor/defaults.ts) — constructors and fit maths
- [models/Project.ts](models/Project.ts) — `doc` is `Schema.Types.Mixed` on purpose

**How it works.** `layers[0]` paints first and sits at the back; the last entry is on
top. Device model, orientation and artboard are document-level, because five frames
of one store listing that disagree about which phone they are aren't a set. The
background is deliberately *not* a layer — it is always behind everything, and it is
the one thing the export pipeline hides on its own.

Mutations go through `patchDoc` / `patchScreen` / `patchLayer`, which keep untouched
screens and layers referentially identical. That identity is load-bearing: it is what
lets each card subscribe to its own screen and not re-render when a sibling changes.

**Status: ✅**

**Backlog**

- No groups, no nested transforms, no parent/child chains — the flat array is the
  whole model. Keep it that way unless a feature genuinely cannot be built without
  them; see the reversed-decision note in [PLAN.md](PLAN.md).
- `layers` has a max of 24 and `screens` a max of 12. Both are arbitrary; revisit if
  anyone hits them.

---

### A2. Schema versioning & migrations

**What it is.** `Project.doc` is an opaque blob, so a shape change needs an explicit
upgrade path for rows already in the database.

**Files**

- `EDITOR_DOC_VERSION` in [schemas/editor.ts](schemas/editor.ts)
- `MIGRATIONS` and `migrateDoc` in [lib/editor/persistence.ts](lib/editor/persistence.ts)
- Applied on load by [hooks/use-project-bootstrap.ts](hooks/use-project-bootstrap.ts)

**How it works.** Migrations are keyed by the version they upgrade *from* and applied
in sequence, then the result is parsed by `editorDocSchema`. A document that fails to
parse returns `null` rather than something half-restored — a corrupt draft should drop
the user into a clean editor, not a broken one.

v1 → v2 is the worked example: a single artboard with named slots (device, logo,
captions) becomes one screen whose layer array reproduces the old fixed z-order
literally, so a project saved under v1 opens looking identical.

**Status: ✅**

**Backlog**

- **Any change to the document shape needs a version bump and a migration entry.**
  This is the easiest rule in the codebase to forget.
- There is no test that a v1 fixture survives the migration. Worth adding before v3.

---

### A3. Local draft & autosave

**What it is.** Anonymous work survives a reload, so someone can build a whole set
before they have an account.

**Files**

- `saveDraft` / `loadDraft` / `clearDraft` in [lib/editor/persistence.ts](lib/editor/persistence.ts)
- [hooks/use-project-bootstrap.ts](hooks/use-project-bootstrap.ts) (1500 ms debounce)

**How it works.** The store is subscribed to, and any change to `doc` writes to
`localStorage` under `editor:draft:v1`. Autosave is deliberately skipped once a
project id exists: a saved project's source of truth is the database, and mirroring it
into localStorage would resurrect stale work the next time the anonymous editor opens.

`/templates` uses this same path — choosing a template writes a draft and navigates to
the editor, rather than passing an id through the URL where the editor would have to
decide whether the id or an existing draft wins.

**Status: ✅**

**Backlog**

- Uploaded images are *not* in the draft — only `blob:` URLs the browser has already
  discarded. So a reload restores the layout but loses un-saved screenshots. Fixing it
  properly means either uploading eagerly or storing bytes in IndexedDB; both are real
  features, not tweaks.
- Only one draft. Multiple in-flight anonymous projects would need keying.

---

### A4. Save & load projects

**What it is.** Persisting a document to Mongo, and the upload walk that has to happen
first.

**Files**

- [components/editor/save-button.tsx](components/editor/save-button.tsx)
- `prepareDocForSave` in [lib/editor/persistence.ts](lib/editor/persistence.ts)
- [actions/projects/projectActions.ts](actions/projects/projectActions.ts)
- [app/editor/[projectId]/page.tsx](app/editor/%5BprojectId%5D/page.tsx)

**How it works.** `prepareDocForSave` walks every screen and layer, uploads anything
still held as an object URL, and patches the real https URLs into the document.
Uploads run sequentially — five screens with a screenshot and a background each is ten
files, and firing them at once on a phone tether turns a save into a spinner that
never resolves.

The step cannot be skipped by accident: `assetUrlSchema` accepts only https, so saving
a document that still points at a `blob:` URL fails validation loudly.

Not signed in? The button routes to registration; the draft is already in localStorage
so nothing is lost.

**Status: 🟡**

**Backlog**

- No progress UI for the sequential upload — a ten-file save looks frozen.
  `prepareDocForSave` already takes an `onProgress` callback that nothing passes.
- No dirty-state tracking, so there is no "unsaved changes" warning and no way to tell
  a saved project from an edited one.
- `duplicateProjectAction` and `deleteProjectAction` exist and have **no callers**
  — see [I2](#i2-project-dashboard).
- Project rename has no UI; `name` is only set at creation.

---

### A5. Undo & redo

**What it is.** History over the document, coalesced so a slider drag is one step.

**Files**

- [lib/editor/store.ts](lib/editor/store.ts) — `temporal` from `zundo`
- Toolbar buttons in [components/editor/editor-toolbar.tsx](components/editor/editor-toolbar.tsx)
- `useEditorHistory` binding, because zundo's temporal store is a separate vanilla store

**How it works.** `partialize` restricts history to `doc`, so selection, viewport and
upload progress are not undoable — tracking them would make every click an undo step.
`handleSet` is debounced 350 ms: without it, dragging a colour slider pushes a few
hundred entries for one gesture and ⌘Z stops meaning anything. Limit is 50 entries.

**Status: ✅**

**Backlog**

- Undoing past a deleted layer restores the layer but not its object URL — `clearAsset`
  revokes it on delete. The image comes back empty. Fixing it means deferring
  revocation, at the cost of leaking until the session ends.
- No visible history panel.

---

## B. Screen set

### B1. Filmstrip & viewport

**What it is.** The horizontally scrolling row of screen cards, with the selected
screen's inspector inserted inline beside its own card.

**Files**

- [components/editor/screens/screen-strip.tsx](components/editor/screens/screen-strip.tsx)
- [components/editor/screens/screen-card.tsx](components/editor/screens/screen-card.tsx)
- `computeCardScale` in [lib/canvas/fit.ts](lib/canvas/fit.ts)
- `stripHeight` in [lib/editor/slices/viewport.ts](lib/editor/slices/viewport.ts)

**How it works.** Cards are sized from the strip's **height** alone. Every screen
shares one artboard, so they are all identical in size; fitting to width as well would
shrink the set to thumbnails the moment a sixth screen was added — that is what the
scrollbar is for. The Stage absorbs the scale, so every node works in artboard px and
nothing in the UI converts between screen and design units.

The inspector is inserted into the row rather than docked to the window edge so the
frame and the controls editing it stay visually paired while scrolling.

**Status: ✅**

**Backlog**

- No zoom control; the fit is whatever the window height gives.
- Selecting a screen does not scroll it into view, so an off-screen selection (from a
  keyboard action) is invisible.
- No horizontal scroll affordance beyond the native scrollbar.

---

### B2. Screen CRUD

**What it is.** Add, duplicate, delete and reorder the screens in a project.

**Files**

- `addScreen` / `duplicateScreen` / `removeScreen` / `moveScreen` / `renameScreen` in
  [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- [components/editor/screens/screen-actions.tsx](components/editor/screens/screen-actions.tsx)
- The "Add screen" tile in [screen-strip.tsx](components/editor/screens/screen-strip.tsx)
- Reorder arrows in [screen-card.tsx](components/editor/screens/screen-card.tsx) (hover-revealed)

**How it works.** A new screen inherits the background of the screen it was added
after, so it arrives already matching the set. A duplicate lands immediately after its
original with **regenerated layer ids** — two layers pointing at one object URL would
have the first delete revoke the second's bitmap. Saved https URLs *are* copied, so
duplicating a saved screen keeps its artwork.

Deleting a screen releases every object URL it owned via `clearScreenAssets`, keyed by
prefix rather than by walking the layers, because the layer list is about to disappear.
The last screen cannot be deleted — a project with no screens has nothing to render
and no way back.

`MAX_SCREENS` is 12, shared by the schema and the add button.

**Status: 🟡**

**Backlog**

- **Reordering is arrow buttons, not drag-and-drop.** The most obvious gap.
- `renameScreen` exists in the store with **no UI**. Screens fall back to
  "Screen N" by position.
- No multi-select, so bulk delete/reorder is one at a time.

---

### B3. Screen pinning

**What it is.** An opt-out marker so bulk writes skip a hand-tuned screen.

**Files**

- `pinned` in [schemas/editor.ts](schemas/editor.ts)
- Honoured by `setArtboard`, `applyTemplate` and `applyBackgroundToAll` in
  [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- Toggle in [screen-actions.tsx](components/editor/screens/screen-actions.tsx); badge on the card

**How it works.** Any operation that writes across the whole set checks `screen.pinned`
and skips. **Anything new that writes across the set must honour it too.**

**Status: ✅**

**Backlog**

- `setDeviceId` and `setOrientation` deliberately ignore pinning, because a mixed
  device set is incoherent rather than customised. Confirm that is the wanted
  behaviour if per-screen devices are ever revisited.

---

### B4. Screen reset

**What it is.** Put a screen's layout back to defaults without discarding content.

**Files**

- `resetScreen` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- Buttons in [screen-actions.tsx](components/editor/screens/screen-actions.tsx) and the toolbar

**How it works.** Only geometry is recomputed — the device is refitted, text returns to
its default position and size, images are recentred. Copy, colours and uploaded images
survive. This is the escape hatch for a screen dragged into an unrecoverable mess, and
losing the words in the process would make it useless.

**Status: ✅**

**Backlog**

- No per-layer reset, only whole-screen.

---

## C. Layers

### C1. Layer stack & ordering

**What it is.** The ordered array behind each screen, and the list UI over it.

**Files**

- `addLayer` / `removeLayer` / `duplicateLayer` / `moveLayer` in
  [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- [components/editor/panels/inspector-panel.tsx](components/editor/panels/inspector-panel.tsx)
- [components/editor/panels/layer-row.tsx](components/editor/panels/layer-row.tsx)
- [components/canvas/layers/content-layer.tsx](components/canvas/layers/content-layer.tsx)

**How it works.** The array is bottom-first because that is the order Konva paints in;
the list renders it **reversed**, because a layer list that puts the backmost item at
the top reads backwards. Position labels (`layer 3 (top)`) come from the array index,
not the row's place on screen.

`ContentLayer` subscribes to `(kind, id)` pairs only, so restacking or adding a layer
re-renders the list while editing one does not. A new layer is pushed onto the end —
the top — because something just added should be visible, not buried behind the device.

`moveLayer` supports `up` / `down` / `top` / `bottom`; only up and down have UI.

Selecting a layer *on the canvas* opens its row and closes whichever was open —
`InspectorPanel` syncs `expandedLayerId` to the store selection during render, and the
row scrolls itself into view. The sync compares against the last seen selection rather
than assigning unconditionally, which is what leaves the chevron free to collapse a row
by hand without it springing back open.

**Status: 🟡**

**Backlog**

- **No drag-and-drop reordering** — arrows only, and no `top`/`bottom` buttons despite
  the store supporting them.
- Only one layer row expands at a time, and only one section (`Layouts & Elements` or
  `Background`). Fine at three layers, cramped at ten.
- A tall panel (device, text) fills the whole scroll area, so the sibling rows are
  scrolled out of sight rather than visible above and below it.
- No layer renaming UI, though `name` exists on every layer and `layerLabel` already
  prefers it.
- Adding a layer offers image and text only. A second device per screen is possible in
  the model (`addLayer(id, "device")` works) but not offered.

---

### C2. Shared layer controls

**What it is.** The controls every layer has, whatever its kind.

**Files**

- `layerBaseFields` in [schemas/editor.ts](schemas/editor.ts) — `id`, `name`,
  `visible`, `locked`, `opacity`
- [layer-row.tsx](components/editor/panels/layer-row.tsx) — the three icon buttons
- `centerLayer` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts)

**How it works.** Per row: visibility toggle, centre-horizontally, lock. Locked layers
still render but set `listening={false}` and `draggable={false}`, and `selectLayer`
refuses to select one — otherwise the Transformer would stay attached to something
that is supposed to be immovable.

The device layer refuses deletion at the store level *and* has its delete button
disabled, so the refusal is visible rather than a silent no-op.

**Status: ✅**

**Backlog**

- No centre-vertically, no align-to-edges, no distribute.
- No numeric x/y inputs — position is drag-only.
- No snapping or alignment guides.

---

### C3. Device layer

**What it is.** The phone: body, screen, notch, buttons, shadow — drawn from data, not
composited from PNGs.

**Files**

- [components/canvas/nodes/device-node.tsx](components/canvas/nodes/device-node.tsx)
  plus `device-frame`, `device-screen`, `device-notch` beside it
- [components/editor/panels/device-layer-panel.tsx](components/editor/panels/device-layer-panel.tsx)
- [lib/devices/](lib/devices/) — catalog, types, geometry, orientation
- `deviceLayerSchema` in [schemas/editor.ts](schemas/editor.ts)

**How it works.** Children are drawn in device px and the Group's `scale` maps them
into artboard px, so the catalog's numbers never have to be re-expressed per artboard.
Frames stay crisp at any export scale and carry no asset licensing.

Per-layer: colourway, scale, rotation, drop shadow, and the screenshot inside it
(zoom + pan). Model and orientation are **document-level** and live in the toolbar's
Setup popover — a per-screen model picker would let five frames disagree about what
phone they are and would make export produce mixed dimensions.

The notch is drawn as an opaque shape on top of the screenshot, never modelled as a
hole, which keeps the screen clip a plain rounded rect.

**Status: 🟡**

**Backlog**

- **Every spec is `fidelity: "draft"`** — bezel widths, corner radii and notch geometry
  come from published resolutions with estimated bezels. Budget roughly half a day per
  device against a real product photo, then flip to `"tuned"`. See Risk 4 in
  [PLAN.md](PLAN.md). **This is the main thing standing between here and shipping.**
- Aspect-ratio mismatch is warned about but there is no crop UI beyond zoom/pan.
- No tablet-specific handling beyond the `category` field.

---

### C4. Screenshot upload

**What it is.** Dropping an image file into a device's screen.

**Files**

- [components/editor/upload/image-dropzone.tsx](components/editor/upload/image-dropzone.tsx)
- `createLocalAsset` / `describeFileError` in [lib/editor/assets.ts](lib/editor/assets.ts)
- Asset keying helpers in [lib/editor/types.ts](lib/editor/types.ts)

**How it works.** The file becomes an object URL and is decoded through the same cache
the canvas reads from, so it appears in the frame in well under a tenth of a second.
The Cloudinary upload happens later, on save. Waiting on a round trip before showing
someone their own image is the single most noticeable way an editor feels slow.

Accepts PNG / JPG / WebP up to 15 MB. Session images are keyed `screenId/layerId`.

**Status: ✅**

**Backlog**

- Single file at a time. Dropping five screenshots across five screens in one gesture
  is an obvious win and is not built.
- No paste-from-clipboard.
- No drop directly onto a canvas card — only into the panel's dropzone.

---

### C5. Website URL capture

**What it is.** Paste a URL, get that site rendered inside the device frame.

**Files**

- [components/editor/upload/url-capture.tsx](components/editor/upload/url-capture.tsx)
- [app/api/capture/route.ts](app/api/capture/route.ts)
- [lib/capture/](lib/capture/) — provider interface, Microlink implementation

**How it works.** The route returns image **bytes**, not a URL, so a capture enters the
exact same pipeline as a dropped file and no third-party URL is ever drawn directly —
capture cannot reintroduce canvas tainting. Rendered at the device's own viewport
(CSS px + scale factor), so the site lays itself out as a phone.

Open to anonymous users on purpose, with a per-instance rate limit of 6 per minute.

**Status: 🟡**

**Backlog**

- **The rate limit is per-instance and in-memory** — it does not hold across a
  multi-instance deployment. Documented as such in the route.
- Without `MICROLINK_API_KEY` the free endpoint is capped around 50/day per IP.
- Provider is swappable by design (`captureProvider` in
  [lib/capture/index.ts](lib/capture/index.ts)); a self-hosted Playwright provider
  would need a Chromium binary and `@sparticuz/chromium` on serverless.
- Some sites block automated browsers; failure is surfaced but not retried.

---

### C6. Title & subtitle (text layer)

**What it is.** Captions on the artboard, optionally on a filled pill. The copy is
rich text: a word can be bolder, a different colour, or sitting on a highlight.

**Files**

- [components/canvas/nodes/text-node.tsx](components/canvas/nodes/text-node.tsx)
- [lib/canvas/rich-text.ts](lib/canvas/rich-text.ts) — the layout pass
- [components/editor/panels/rich-text-editor.tsx](components/editor/panels/rich-text-editor.tsx)
- [lib/editor/rich-text.ts](lib/editor/rich-text.ts) — runs ↔ tiptap
- [lib/editor/uppercase-mark.ts](lib/editor/uppercase-mark.ts) — the one custom mark
- [components/editor/panels/emoji-picker.tsx](components/editor/panels/emoji-picker.tsx)
  and [config/emoji.ts](config/emoji.ts)
- [components/editor/panels/text-layer-panel.tsx](components/editor/panels/text-layer-panel.tsx)
- `textLayerSchema` / `textRunSchema` in [schemas/editor.ts](schemas/editor.ts)

**How it works.** `role` is `title` or `body`, and drives default size and placement
only — it is not a style lock. Controls: copy, font, weight, size, align, colour,
italic/underline/uppercase, line height, letter spacing, opacity, rotation, drop
shadow, and a background pill.

The copy is an array of **runs** rather than a string. Each run is a stretch of text
that shares a style, and only what can vary *within* a line lives on it — bold,
italic, underline, colour, highlight. Font family and size stay on the layer, which
is a deliberate limit: uniform size means one baseline and one line height per line,
which is what keeps the layout below tractable.

Five mechanics worth knowing before editing any of this:

- **Style resolution is additive.** The layer carries the caption's own font, size,
  colour, italic, underline and casing; a run only adds. Bold means *heavier than the
  base weight* (`resolveBoldWeight`), not 700 — bolding a word in a 700 headline has
  to reach 800 to read as emphasis, and Poppins, which stops at 700, correctly has
  nothing to give. Italic, underline and uppercase turn on but never off; colour
  overrides where set and inherits where null. That asymmetry is what keeps the
  caption-wide controls meaning "the whole caption" after a word has been styled by
  hand.
- **Layout is ours, not Konva's.** A Konva `Text` node paints one style, so a styled
  caption is several nodes — which makes wrap points, fragment x and the widest line
  our problem. `layoutRichText` does all of it, using the same measurement formula as
  Konva's `Text._getTextWidth` so a fragment placed at x is where Konva then draws it.
  Preview and export render from that one layout, which is what makes their line
  breaks identical by construction rather than by luck.
- **Fragments are baseline-corrected.** Konva puts a line's baseline at
  `(ascent - descent) / 2` below the node top, measured from the font in use, and two
  weights of one family can disagree — Poppins ships 400 and 700 as separate files.
  Each fragment is shifted by the difference against the caption's own style, so a
  mixed-weight headline sits on one baseline. It costs nothing when the metrics agree.
- **The pill is computed, not measured.** It comes straight out of the layout. This
  replaced a `useLayoutEffect` that sized it from the mounted node's rendered bounds,
  which meant one frame of a fresh string behind a stale pill on every keystroke.
- **Uppercase is applied to the string during layout**, because Konva has no
  `text-transform`. The document keeps the original, so toggling back is lossless —
  and it happens before the wrap pass rather than at paint time, because upper-casing
  changes how wide a word measures and so where the line breaks.

**Editing.** The panel field is tiptap. That document lives only inside
`RichTextEditor` — runs go in, runs come out, and `lib/editor/rich-text.ts` owns both
directions. Persisting the ProseMirror tree instead would put an editor's internal
schema in `Project.doc` and hand every future migration a tree to walk. The
conversion is lossy on purpose: a paste's headings, lists and links arrive as plain
text, which is right for copy with one size and one alignment.

**Where the controls live.** Everything that styles *text* is in the editor's own
toolbar. A divider separates it from alignment, which is the one control with no
per-run meaning at all — a line is aligned as a whole, so a selection has nothing to
scope it to.

Colour and uppercase read their scope from the selection: with words selected they
set a run, with nothing selected they move the caption's own value, which is what the
panel below used to duplicate as separate fields. That is what makes "uppercase this
word" and "uppercase everything" one button instead of two that look identical and
disagree.

Size, line height and letter spacing are typed rather than dragged, because they are
values people arrive knowing; opacity and rotation stay sliders, because they are
values people arrive only knowing they want *less* of.

**Emoji** are a curated static list in [config/emoji.ts](config/emoji.ts), painted as
plain text, rather than a picker library. Every picker worth installing renders its
grid from Apple or Twemoji artwork on a CDN, and what lands in the document is a
*character* the canvas then draws in whatever emoji font the machine has — so picking
from images would mean choosing one glyph and exporting a different one. It also
keeps the editor working with no network, which the rest of an anonymous local draft
already does. Recents live in localStorage, not `doc`: they belong to the person, and
in the document they would make inserting an emoji an undo step.

Emoji are also why the layout counts **graphemes** rather than `String.length`. One
is two UTF-16 units, a ZWJ family is eleven, so the old count over-charged letter
spacing and the mid-word break could slice a surrogate pair in half. `Intl.Segmenter`
does both jobs, and is skipped entirely at zero letter spacing — the default, and the
case where the count cannot change the answer.

Three things about the runs ↔ tiptap boundary:

- **It enforces the schema's caps rather than discovering them.** A document that
  fails its own schema is dropped whole on reload, so `normalizeRuns` coalesces
  adjacent same-style runs first and, past `MAX_TEXT_RUNS`, flattens the tail's
  styling instead of dropping its words.
- **Pasted colours are parsed or discarded.** `rgb(...)` is converted, anything else
  becomes null. One unparseable colour would otherwise fail `hexColorSchema` and take
  the whole draft with it.
- **The editor has no undo of its own.** `undoRedo` is off, because
  `useEditorShortcuts` deliberately routes ⌘Z to the document even while a field has
  focus — two undo stacks would fight over the same keystroke.

**Status: 🟡**

**Backlog**

- **No on-canvas text editing** — copy is edited only in the panel field.
- Four self-hosted fonts (Inter, Poppins, Montserrat, Playfair). A Google Fonts picker
  is Phase 3 and extends the existing registry rather than replacing it.
- **Bold is a visible no-op on Poppins at weight 700**, which is the template default
  for titles. Correct per `resolveBoldWeight` — there is no heavier file — but it
  looks like a broken button. Needs either a heavier Poppins or a disabled control.
- Applying a template restyles the layer's base colour and leaves run colours alone,
  so a hand-coloured word survives a restyle that changes everything around it. The
  conservative choice; the alternative silently discards deliberate work.
- Run styling is bold/italic/underline/uppercase/colour/highlight. Per-run size and
  font are out by design — see the uniform-size note above.
- Uppercase is the one mark with no tiptap extension behind it;
  [lib/editor/uppercase-mark.ts](lib/editor/uppercase-mark.ts) is a nine-line
  `Mark.create`. Lowercase and small-caps would extend it, not replace it.
- The emoji list is a few hundred entries, not the full Unicode set — search covers
  intent, but a specific missing glyph has to be pasted in. Skin-tone and gender
  variants are absent for the same reason.
- Emoji export in colour because the browser has a colour emoji font. A machine
  without one exports the monochrome fallback, and nothing warns about it.
- A highlight spans the full line box, like a CSS background on an inline span. No
  padding or corner radius of its own.
- Vertical alignment and auto-fit-to-box are absent.
- Max 2000 characters per run, 64 runs per caption, 20-ish layers in practice.

---

### C7. Image layer

**What it is.** A free-floating image — logo, badge, decorative shape. Replaced the old
single logo slot.

**Files**

- [components/canvas/nodes/image-node.tsx](components/canvas/nodes/image-node.tsx)
- [components/editor/panels/image-layer-panel.tsx](components/editor/panels/image-layer-panel.tsx)
- [lib/canvas/object-fit.ts](lib/canvas/object-fit.ts) — `placeImage`
- [lib/canvas/tint.ts](lib/canvas/tint.ts) — the tinted-bitmap cache
- `imageLayerSchema` in [schemas/editor.ts](schemas/editor.ts)
- Picker: [components/editor/images/](components/editor/images/) — see [C8](#c8-image-picker)

**How it works.** Any number per screen, anywhere in the stack — a badge behind the
device and a sticker in front of it are the same component twice, differing only in
where they sit in `layers`. Controls: image, fit, vertical position, tint, and typed
fields for size (aspect-locked in the panel, free on canvas), opacity, rotation and
corner radius — every one of those is a value people arrive with a number for, and a
slider makes hitting it an exercise in aim.

The layer is a **box, and a bitmap fitted inside it** — a Group holding a transparent
Rect plus the image, the same shape a text layer has. That separation is what `fit`
needs to exist: the box is what gets dragged, hit-tested and resized, while the artwork
is free to be letterboxed (`contain`), cropped (`cover`) or stretched (`fill`) within
it. `placeImage` is the single answer to "so where do the pixels go", read by the one
node that both preview and export render — the alternative, a node that positions the
image and a second place that reasons about it, is how a logo ends up centred on screen
and off-centre in the PNG.

`contain` is the default because it is the only fit that cannot distort artwork.
That default is load-bearing: images resize *freely* on canvas (only a device keeps its
ratio), so the box routinely stops matching the bitmap, and a stretched logo is the kind
of mistake that ships.

Nothing is drawn until an image is chosen: a placeholder rectangle would end up in an
export the moment someone forgot to fill it in. On accept, the box is re-shaped to the
decoded bitmap's real aspect ratio.

**Tint is applied to the source bitmap, not to the node.** Konva can do it with
`Konva.Filters.RGB`, and that is the wrong tool: a filtered node must be `cache()`d,
and a cached node rasterises at the resolution it was cached at — so the export's 3×
pixel ratio would upscale that cache and land softer than the untinted layer beside it.
`tintedBitmap` paints the colour onto a copy of the source with `source-atop`, which
keeps the natural resolution *and* respects transparency: a logo's cut-outs stay cut
out and its antialiased edges blend instead of turning into a hard silhouette. Colour
and strength are stored separately because the two ends of the range are different
features — 100% makes a transparent logo a flat silhouette in the brand colour, 30%
washes a photo without hiding its subject. The inspector thumbnail reads from the same
cache — passing the same box size, so it shares the node's copy rather than tinting the
bitmap twice — and therefore cannot disagree with the canvas about what colour the layer
is.

The cache is bounded by *pixels*, not by entry count, and each copy is only as large as
the layer needs at 3×. Both matter because a colour wheel writes a new tint on every
pointer move: twenty entries is a meaningless budget when one of them is a 1200×1600
backdrop, and a 26fps drag on a canvas that is quietly holding 180MB of stale copies
looks exactly like a canvas that has stopped updating.

**Status: ✅**

**Backlog**

- No SVG support — `ACCEPTED_IMAGE_TYPES` is PNG/JPG/WebP, so the panel's
  "transparent PNG works best" hint is the whole story. SVG would need rasterising
  before it reaches the canvas.
- Horizontal alignment is fixed to centre; only the vertical axis is exposed.
- No flip, no border, no blend modes.
- Tint is a flat colour. No gradient overlay, and no per-layer duotone.
- No shape primitives (rect, circle, blob) — every decoration has to be an upload.

---

### C8. Image picker

**What it is.** The dialog behind "Select image" — tabbed sources for where an image
comes from.

**Files**

- [components/editor/images/image-picker-dialog.tsx](components/editor/images/image-picker-dialog.tsx) — the frame
- [components/editor/images/image-sources.ts](components/editor/images/image-sources.ts) — the registry
- [components/editor/images/sources/](components/editor/images/sources/) — one file per source
- [config/image-library.ts](config/image-library.ts) — the built-in artwork, and how to add to it
- [public/library/](public/library/) — the artwork itself
- [lib/editor/rasterize.ts](lib/editor/rasterize.ts) — SVG → PNG at pick time
- [hooks/use-image-pick.ts](hooks/use-image-pick.ts), [lib/editor/image-picks.ts](lib/editor/image-picks.ts)

**How it works.** Two pieces, deliberately: the dialog owns the frame (tabs, scrolling,
closing on a pick) and knows nothing about what any tab does, while `IMAGE_SOURCES` is
the list of tabs. Adding a source is one component and one line in that array; removing
one is a deleted line. Nothing else changes, which is the point — the sources worth
adding next (a stock library, a search API behind a key) differ from these only in where
the bytes come from.

Every source hands back the same two-case `ImagePick` — bytes the browser holds, or a
URL that already exists — and `useApplyImagePick` is the only place that turns one into
a registered asset. That is where the rules live that a source could otherwise get
wrong: decode locally first so the canvas paints before any network call; never let two
layers share one object URL, because deleting either revokes the other's bitmap; keep an
already-uploaded https URL rather than pulling the bytes down to push them back up
under a second public id.

**Upload** takes drops, clicks and pastes — paste listens here rather than globally
because this is the surface that is focused when someone has just copied a screenshot,
and a global listener would fight the caption editor for the keystroke. **Your images**
lists what the document already draws, walked from the document rather than from an
uploads table: an asset row can outlive the layer that referenced it, and offering a
picture nothing draws any more is how a picker fills with rubbish.

**Library** is the built-in artwork — scribbles, badges, gradient backdrops — declared
in `config/image-library.ts` and living in `public/library/`. Adding a piece is a file
plus a line; adding a whole category is a folder plus an entry. The panel reads the
config, so neither touches a component.

Two things are load-bearing about how a library pick works:

- **It is rasterised, not linked.** Konva draws bitmaps, so an SVG handed to the canvas
  is decoded once at its intrinsic size and a 400px doodle is visibly soft in a 3×
  export. `rasterizeLibraryImage` draws it to a PNG at a resolution the *category*
  chooses (`rasterSize` — a backdrop needs more than a doodle), and hands back a File.
  From there it is an ordinary upload: local object URL now, Cloudinary on save. Nothing
  downstream knows the library exists, which is what spares it a persistence story of
  its own.
- **Ink is applied before the bitmap exists.** Recolourable artwork is drawn with
  `currentColor`, substituted in the markup at rasterise time. That is what lets one
  file serve a dark backdrop and a light one, and it is why the swatch lives in the
  picker rather than on the layer. Tiles preview it by *inlining* the same SVG so
  `currentColor` resolves from CSS — a mask, the obvious alternative, flattens the alpha
  channel and turns every badge into a silhouette.

**Store badges are the owners' own files, fetched not drawn.** The Store Badges category
splits into sub-tabs by owner — Icons, Apple Badges, Google Badges — because the licence
differs by owner, and one grid mixing Apple's artwork with Google's would make the notice
above it a lie about which terms apply. The badges themselves come from Apple's and
Google's own endpoints via [`scripts/fetch-store-badges.ts`](scripts/fetch-store-badges.ts)
(`pnpm fetch-store-badges [locale]`), because both licences require the owner's
*unmodified* artwork — a redrawn lookalike is a violation rather than a shortcut. Keeping
the fetch in a script rather than hand-committing the binaries is what makes the
provenance of every file in `public/library/badges/` readable.

Neither brand badge is `recolorable`, which is the mechanism that stops the ink swatch
from tinting a trademark. A group can still carry an `empty` state — a first-class case,
not a missing feature — which is what a fresh clone sees before the script is run, and
why sub-tabs and the notice only appear once a category is opened on its own: they say
nothing useful next to a row of doodles.

Two rules the real artwork forced out: a bitmap is **never upscaled** by the rasteriser
(Google's badge is a 646px PNG, and enlarging it to 1024 invents pixels and lands softer
than the file it started from), and a tile that does not `cover` shows the transparency
checkerboard — a white App Store badge on a white tile is invisible, and "is this
transparent or is it broken" is the one question a picker must never leave open.

**Status: ✅**

**Backlog**

- Three sources. A stock-photo search (behind an API key) is the obvious next entry.
- No multi-select — one pick fills one layer.
- The picker is only wired to image layers. The background panel and the device
  screenshot still have their own dropzone, and would each be one `assetKey` away
  from using it.
- "Your images" is scoped to the open project; there is no account-wide library
  (that needs [H2](#h2-asset-records)).
- Library ink is chosen at pick time and baked into the PNG; changing it afterwards
  means picking again.

---

## D. Screen appearance

### D1. Background

**What it is.** The fill behind every layer, per screen.

**Files**

- [components/canvas/layers/background-layer.tsx](components/canvas/layers/background-layer.tsx)
- [components/editor/panels/background-panel.tsx](components/editor/panels/background-panel.tsx)
- `backgroundSchema` in [schemas/editor.ts](schemas/editor.ts)
- `applyBackgroundToAll` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts)

**How it works.** Four kinds: solid, gradient (2-stop, angle), image (cover/contain,
opacity), none. On its own Konva Layer — its own canvas element — because it almost
never repaints, so keeping it off the content layer saves a full-artboard fill on every
drag tick. It is also the layer the export pipeline hides to produce a transparent PNG.

Gradient angles follow the CSS convention: 0° points up, increasing clockwise. Image
fit reuses the same `coverCrop` maths as the device screen.

"Apply to all screens" copies onto every unpinned screen — matching five frames is the
job, and doing it one at a time is the tedium this replaces.

**Status: 🟡**

**Backlog**

- **`blur` is in the schema and has no UI and no renderer.** Either wire it to a Konva
  blur filter (needs `cache()` on the node) or drop the field.
- Gradients are linear and 2-stop in the UI; the schema allows up to 8 stops and the
  renderer handles them. No radial gradients.
- No pattern or noise fills, no preset gradient library.

---

## E. Project-level

### E1. Templates

**What it is.** Starter looks. Each opens as five screens with a device on every frame.

**Files**

- [config/templates.ts](config/templates.ts) — the data
- `createDocFromTemplate` / `createTemplateScreen` in [lib/editor/defaults.ts](lib/editor/defaults.ts)
- `applyTemplate` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- [components/editor/template-picker.tsx](components/editor/template-picker.tsx) — in-editor dialog
- [components/editor/template-gallery.tsx](components/editor/template-gallery.tsx) + [app/templates/](app/templates/)

**How it works.** Two templates today: **Aurora** (lavender wash, dark headline) and
**Spotlight** (violet, white headline). Static TypeScript for the same reason as the
device catalog — the editor needs one synchronously to render its first frame, and it
keeps `TemplateId` a literal union.

Two genuinely different operations, because "use this template" means two things:

- **Restyle** (`applyTemplate`) keeps every screen, its copy and its uploads, and
  repaints the look. Screen and layer ids survive, which matters because assets are
  keyed by them — rebuilding would orphan every screenshot already dropped in.
- **Start over** (`createDocFromTemplate`) discards the screens and rebuilds five from
  the template's own copy.

⚠️ [config/templates.ts](config/templates.ts) must only ever `import type` from
[schemas/editor.ts](schemas/editor.ts) — the schema imports `TEMPLATE_IDS` from it, so
a value import closes a module cycle.

**Status: 🟡**

**Backlog**

- **Only two templates.** Adding a third is a data-only change.
- `titlePill` is in the `Template` type and wired through `createTemplateScreen`, but
  both shipped templates set it to `null`, so that path is unexercised.
- No test that every template's output parses against `editorDocSchema` — today the two
  shipped ones are known-good by inspection, not assertion.
- No template thumbnails; the gallery draws an approximation in CSS.
- No user-saved templates.

---

### E2. Device catalog & orientation

**What it is.** The five built-in device specs and the portrait/landscape transform.

**Files**

- [lib/devices/catalog.ts](lib/devices/catalog.ts) — generic Android, iPhone 15 Pro,
  iPhone SE 3, Pixel 8, Galaxy S24
- [lib/devices/types.ts](lib/devices/types.ts) — the spec shape, thoroughly commented
- [lib/devices/orientation.ts](lib/devices/orientation.ts) — rotation, **memoised**
- [components/editor/panels/setup-panel.tsx](components/editor/panels/setup-panel.tsx)

**How it works.** Static TypeScript, not a collection: the geometry is coupled to the
renderer, the editor needs it synchronously on first paint, and it keeps `DeviceId` a
literal union. Changing model or orientation refits every device layer, because a new
spec has different body dimensions and the old scale would leave it overflowing or
adrift.

⚠️ **Rotated specs must stay memoised.** Returning a fresh object per call causes an
infinite render loop under Zustand v5's `Object.is` comparison. Portrait hides it
completely — it returns the catalog object unchanged.

**Status: 🟡**

**Backlog**

- **All five are `fidelity: "draft"`.** See [C3](#c3-device-layer). Highest-value work
  in the repo.
- No tablets in practice, despite `category: "tablet"` being supported.
- No user-supplied frames. The catalog comment says how: add a `DeviceFrame`
  collection *alongside* and merge — the static path stays.
- `bodyPath` (an SVG escape hatch for foldables and true superellipse corners) is in
  the type and unused.

---

### E3. Artboard size & presets

**What it is.** The canvas dimensions, shared by every screen.

**Files**

- [config/artboards.ts](config/artboards.ts) — 8 presets across App Store, Play Store, Social
- `setArtboard` + `rescaleLayer` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts)
- Selector in the toolbar; numeric inputs in the Setup popover

**How it works.** Retargeting rescales every unpinned screen so a design keeps its
composition instead of collapsing into a corner. Positions scale per axis; anything
meaning "size" scales uniformly by the smaller ratio, because a non-uniformly scaled
device frame is worse than a slightly small one. Text width tracks the horizontal ratio
so side margins stay proportional.

Dimension inputs are held as text while typing, so an intermediate `12` on the way to
`1290` is not clamped up to the minimum under the cursor.

**Status: ✅**

**Backlog**

- Rescaling is lossy over repeated retargets (float drift compounds).
- No per-store export presets — one size at a time, so shipping 6.9" and 6.5" means
  retargeting and re-exporting.

---

### E4. Global fonts

**What it is.** One font for every title and one for every subtitle, set from the
**Global fonts** tab of the toolbar's **Globals** popover, plus the font browser both
it and a single layer's inspector open.

**Files**

- [components/editor/panels/globals-panel.tsx](components/editor/panels/globals-panel.tsx) — the popover
- [components/editor/fonts/font-picker-dialog.tsx](components/editor/fonts/font-picker-dialog.tsx) — the browser
- [components/editor/fonts/font-picker-field.tsx](components/editor/fonts/font-picker-field.tsx) — the shared trigger
- `setRoleFont` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts); `selectRoleFontId` in [lib/editor/selectors.ts](lib/editor/selectors.ts)
- [lib/editor/recent-fonts.ts](lib/editor/recent-fonts.ts) — the picker's Recent list

**How it works.** Project-level for the same reason the artboard is: a set of store
screenshots whose typeface changes halfway through is not a set. Picking writes the
font onto every unpinned screen's layers of that role, snapping `fontWeight` to the
nearest weight the new family actually ships — Poppins stops at 700, so an 800
headline has to land somewhere the dropdown can still show.

There is no `globalFont` field in the document. The popover *reads* the font back off
the layers (`selectRoleFontId`), so a set styled apart reads as "Mixed" rather than
letting one screen speak for the rest, and a single layer's inspector stays a real
override instead of being clobbered by an inherited value.

The browser is a dialog rather than a dropdown because choosing a typeface is a
comparison: every family renders in itself, lazily, as its row nears the viewport.
See [F3](#f3-canvas-fonts) for how the Google faces are fetched.

**Status: ✅**

**Backlog**

- Recent fonts are per browser, not per account.
- No global shadow: a caption's shadow and pill are still per layer.

---

### E5. Colour replacer

**What it is.** Find-and-replace for colour — the **Colour replacer** tab lists every
colour the set paints, and swapping one repaints every element using it.

**Files**

- [lib/editor/colors.ts](lib/editor/colors.ts) — the traversal, `normalizeHex`, `replaceDocColor`
- [components/editor/panels/color-replacer-panel.tsx](components/editor/panels/color-replacer-panel.tsx)
- `replaceColor` in [lib/editor/slices/document.ts](lib/editor/slices/document.ts); `selectColorKey` in [lib/editor/selectors.ts](lib/editor/selectors.ts)

**How it works.** A find-and-replace rather than a palette the layers point at. The
document has no colour indirection and adding one would mean migrating every existing
project into it; walking the fields is the honest version of the same gesture.

Listing and rewriting share **one traversal** (`mapScreenColors`). Two passes over two
hand-written field lists would drift the moment a colour is added anywhere, and the
failure mode is a swatch that Replace quietly does nothing to. It covers background
colour, gradient stops, a caption's colour, its runs' colour and highlight, its shadow
and its pill. Device colourways are not included: a frame's finish is a catalogue
entry, not a hex.

The traversal reports *what kind of element* it is looking at as well as the value, so
each swatch carries a "Background · Title" line and the footer names the exact damage
("Repaints 6 uses — title · shadow"). That cannot be derived after the fact: once a
colour is only a hex, the two elements holding it are indistinguishable.

Hexes are compared normalised, because the document genuinely holds several spellings
of one colour — the schema takes 3, 4, 6 and 8 digits, templates are hand-written, and
react-colorful emits its own case. Raw-string matching would list `#FFF` and `#ffffff`
as two colours and replace only one.

Pinned screens are excluded from the *list* as well as from the write, so every swatch
offered is one that can actually move. Replacing is a button, not live-on-pick: a drag
through the colour wheel would otherwise repaint the set on every intermediate hue and
shift the palette under the cursor.

**Status: ✅**

**Backlog**

- One colour at a time; no "replace these three with this scheme".
- Opacity is a separate field, so replacing a colour does not touch the transparency
  of what paints it.

---

## F. Canvas engine

### F1. Konva stage pipeline

**What it is.** How screens actually get drawn, and the SSR boundary around it.

**Files**

- [components/canvas/canvas-host.tsx](components/canvas/canvas-host.tsx) — the `ssr: false` boundary
- [components/canvas/canvas-stage.tsx](components/canvas/canvas-stage.tsx) — one Stage per screen
- [components/canvas/layers/](components/canvas/layers/) — background / content / overlay
- [lib/canvas/stage-registry.ts](lib/canvas/stage-registry.ts) — Stages by screen id
- [lib/canvas/transform.ts](lib/canvas/transform.ts) — `normalizeTransform`

**How it works.** Three rules, all of which the build enforces or a bug punishes:

1. **`react-konva` is imported only under [components/canvas/](components/canvas/).**
   Konva touches `window` on import; a stray import elsewhere pulls it into the server
   bundle and fails `pnpm build`. That is what makes the build a useful canary.
2. **The dynamic import is at module scope**, so all screens share one lazy chunk
   rather than re-requesting Konva per card.
3. **`normalizeTransform` on every `onTransformEnd`.** Konva's Transformer resizes by
   mutating `scaleX`/`scaleY`. Persisting those raw makes a resized text node store
   `scaleX: 2.4` and render its stroke, shadow and letter spacing at 2.4× forever.
   Never do this inline in a component.

One Stage per screen, not one Stage holding all five: each screen exports on its own,
and asking Konva to rasterise a sub-region of a shared Stage at a pixel ratio with the
right layer hidden is materially harder to get right. A layer id is unique only within
its screen, which is fine — a Stage is the scope `findOne("#id")` searches, which is why
the layer id doubles as the node id.

State is never written on drag *move*, only `onDragEnd`. Konva already moves the node
imperatively at 60 fps; a per-tick `setState` would re-render the scene graph behind it.

**Status: ✅**

**Backlog**

- Five Stages means five canvas elements per Konva layer — 15 at five screens. Fine
  today; worth measuring at the 12-screen ceiling.
- No virtualisation of off-screen cards.

---

### F2. Origin-clean image cache

**What it is.** The single image-loading path for anything drawn on canvas, and the
structural fix for canvas tainting.

**Files**

- [lib/canvas/image-cache.ts](lib/canvas/image-cache.ts)
- [hooks/use-canvas-image.ts](hooks/use-canvas-image.ts)

**How it works.** Every image is fetched as a Blob and rendered from a same-origin
`blob:` URL. `crossOrigin="anonymous"` is the usual advice and it works right up until
the browser has already cached a non-CORS copy of the same URL — fetched by a
thumbnail, a `next/image`, or a CSS background. The cached response has no
`Access-Control-Allow-Origin`, the browser reuses it anyway, and the canvas silently
taints. `toBlob()` then throws `SecurityError` for some users, or only on the *second*
export, and never reproduces on a hard refresh.

Bitmaps live in a module-level map, never in the store — they are not serialisable and
would be deep-cloned into undo history. LRU capped at 24 entries.

⚠️ **Do not introduce a second path.** `use-image` is fine for prototyping and must not
ship. This is Risk 1 in [PLAN.md](PLAN.md).

**Status: ✅**

**Backlog**

- 24-entry cap is arbitrary; a 12-screen project with a screenshot, background and two
  images each would exceed it and start thrashing.
- Cache is not shared with `next/image` — deliberately, but it means a dashboard
  thumbnail and a canvas draw fetch the same bytes twice.

---

### F3. Canvas fonts

**What it is.** Four self-hosted faces plus a curated slice of Google Fonts, loaded
before Konva measures anything.

**Files**

- [config/fonts.ts](config/fonts.ts) — the registry, the Google catalogue, and `resolveFont`
- [lib/canvas/fonts.ts](lib/canvas/fonts.ts) — `ensureFontsLoaded`, `watchFontLoading`
- [lib/canvas/google-fonts.ts](lib/canvas/google-fonts.ts) — on-demand stylesheet injection
- `@font-face` rules in [app/globals.css](app/globals.css); files in [public/fonts/](public/fonts/)

**How it works.** Deliberately separate from the app's UI font. `next/font` generates a
mangled family name it only exposes through a CSS custom property, and `ctx.font` —
which is how Konva measures and paints — cannot resolve CSS variables. Passing
`var(--font-sans)` to a Konva Text node fails *silently* and falls back to
sans-serif. Hence literal names with a `Canvas` suffix.

Both sources share one id space: a built-in id (`inter`), or `google:<Family>`. A
family shipped as both resolves to the built-in id, so picking Inter costs no network
request. `resolveFont` falls back to the default rather than throwing, which is what
lets `fontId` be a free string — a document naming a family the catalogue has since
dropped loses a face, not the whole document.

A Google family is only fetched when something asks for it: the picker asks for
weight 400 to draw a row, selecting it widens the request to the family's full weight
set, and opening a saved project asks for every family its captions name. Requests are
tracked per family, so the export pipeline's bare `ensureFontsLoaded()` re-awaits
exactly what the document uses. A stylesheet that fails is retried without the weight
list — css2 answers an unavailable weight with a 400 for the whole request — and then
given up on, so an unreachable font degrades to the fallback face rather than to a
stalled editor.

Konva bakes text metrics at construction, so a face arriving late bakes wrong line
breaks — the title wraps to two lines in preview and three in the export. Mitigated by
gating first render on `ensureFontsLoaded()` (called once from the strip, not per
card), bumping `fontsVersion` to force a redraw when a face lands late, and re-awaiting
fonts inside the export pipeline. This is Risk 2 in [PLAN.md](PLAN.md).

Family names reach `ctx.font` quoted exactly the way Konva quotes them
(`quoteFontFamily`). `Open Sans` measured by hand and `"Open Sans"` painted by Konva
are two different font strings, and the divergence shows up as a wrap point that moves
between preview and export.

**Status: ✅**

**Backlog**

- The Google catalogue is a hand-curated ~75 families, not the live directory; "Browse
  all Google Fonts" links out for anything else.
- Every weight of a selected family is fetched; no subsetting per document.
- No custom font upload.

---

### F4. Selection & transformer

**What it is.** Click to select, drag handles to move and resize.

**Files**

- [components/canvas/controls/selection-transformer.tsx](components/canvas/controls/selection-transformer.tsx)
- [lib/editor/slices/selection.ts](lib/editor/slices/selection.ts)
- `EditorSelection` in [lib/editor/types.ts](lib/editor/types.ts)

**How it works.** Selection is a `(screenId, layerId)` pair held as two separate fields,
because they change independently — clicking a card opens an inspector without touching
the layer selection, and Escape drops the layer while leaving the panel open. An object
would make every screen click a new reference and re-render both halves' subscribers.

Handle sizes divide out the card scale, or they shrink to nothing on a 2796 px-tall
artboard. Anchors and ratio locking differ by kind, and follow from what each layer's
box *means*: a device is corner-only with `keepRatio`, because its scale is a single
document property and a squashed phone is never what anyone meant; text gets middle
handles so a horizontal drag rewraps; an image gets all eight and resizes freely,
because its box is a frame the artwork is fitted into rather than the artwork itself —
see [C7](#c7-image-layer). `boundBoxFunc` refuses degenerate boxes so a fast drag past
the opposite edge cannot flip a node.

Each kind's transform is normalised by its own function in
[lib/canvas/transform.ts](lib/canvas/transform.ts) rather than by one with a `kind`
switch: text and image layers are Groups, and a Group reports no size of its own, so
the current values have to be passed in from the document.

Each of the five Stages mounts its own Transformer, and each reads only *its* screen's
selection — reading the raw selection would have all five re-attach on every click.

**Status: 🟡**

**Backlog**

- **Single selection only.** No multi-select, so no group move or align.
- Handles are visually heavy relative to the smaller cards the filmstrip produces;
  `ANCHOR_SCREEN_SIZE` in that file is the knob.
- No marquee/rubber-band selection, no click-through to a layer behind another.
- Selecting from the layer list does not scroll the canvas to the layer.

---

### F5. Keyboard shortcuts

**What it is.** ⌘Z / ⇧⌘Z, Escape, Delete.

**Files**

- [hooks/use-editor-shortcuts.ts](hooks/use-editor-shortcuts.ts)

**How it works.** Undo works even while a textarea has focus — the alternative is the
browser undoing text inside the field while the canvas silently disagrees. Every other
shortcut bails out when the target is a text entry. Escape steps out one level at a
time: drop the layer first, close the inspector on a second press, so one stray Escape
does not lose the panel someone was working in.

**Status: 🟡**

**Backlog**

- No duplicate (⌘D), no copy/paste, no nudge with arrow keys, no save (⌘S), no
  export (⌘E), no screen navigation (Tab / ⌥←→).
- No shortcut help overlay.

---

## G. Export

### G1. Per-screen export

**What it is.** Rasterise one screen to PNG / JPG / WebP at 1×, 2× or 3×.

**Files**

- [components/editor/export/export-dialog.tsx](components/editor/export/export-dialog.tsx)
- [lib/export/export-stage.ts](lib/export/export-stage.ts)
- [lib/export/formats.ts](lib/export/formats.ts), [lib/export/download.ts](lib/export/download.ts)

**How it works.** The Stage on screen is `artboard × cardScale` CSS px, so emitting
`artboard × scale` real px means asking Konva for a pixel ratio of `scale / cardScale`.
Konva re-renders the scene into an offscreen canvas at that ratio, genuinely
re-rasterising the vector frame and the text — it does not upscale the preview.

Three things it gets right that are easy to get wrong:

- **The overlay layer is hidden.** Selection handles baked into an export is the most
  obvious way for this app to look broken.
- **JPEG gets an explicit backdrop.** An encoder handed a transparent canvas produces
  black in Chrome and white in Safari; painting a fill makes it the same everywhere.
- **Every image is awaited first**, via `whenAllSettled`, or a frame whose background
  is still decoding silently exports half-empty.

The scale guard disables options past what browsers will rasterise, with the reason in
the tooltip. **1290×2796 at 3× is 32 MP and is correctly disabled** at App Store 6.9" —
that is the guard working, not a bug.

**Status: ✅** — verified: 2× produced 2580×5592 with a device screenshot and a separate
image layer, no `SecurityError`.

**Backlog**

- Filename is `screen-N.png`; no naming template, no project name in it.
- No export presets, no remembering the last-used settings.
- No preview of the exported result before download.

---

### G2. Batch export

**What it is.** Exporting the whole set in one action. **Not built.**

**Why it is deferred.** Each screen is its own Stage. Five 32 MP canvases live in one
browser is how this runs out of memory on an iPad. This is the first feature that
genuinely needs a server: add `sharp`, composite server-side, return a zip — rather
than asking the browser to hold five of them.

**Status: ◻** (Phase 3 in [PLAN.md](PLAN.md))

**Sketch**

- Server route that takes the document, renders each screen, streams a zip.
- Needs the device frames drawn server-side too, which today only exist as
  `react-konva` components — either share geometry via [lib/devices/](lib/devices/) and
  re-implement in `sharp`/`resvg`, or run Konva headless with `canvas` installed (which
  [next.config.ts](next.config.ts) currently aliases away on purpose).
- Sequential browser-side download of N files is a cheap interim step, though popup
  blockers interfere.

---

## H. Assets & storage

### H1. Signed direct upload

**What it is.** Browser-to-Cloudinary upload with a server-issued signature.

**Files**

- [app/api/cloudinary/sign/route.ts](app/api/cloudinary/sign/route.ts)
- [lib/cloudinary-upload.ts](lib/cloudinary-upload.ts) — `UploadKind`, XHR with progress
- [lib/cloudinary.ts](lib/cloudinary.ts) — `userFolder`, `isOwnedBy`, `signUpload`

**How it works.** Not a Server Action: those cap request bodies at 1 MB by default and
serverless adds its own ceiling — App Store screenshots exceed both. Proxying would
also double the bytes on the wire and give no progress. XHR rather than `fetch` purely
because `fetch` still has no upload progress event.

Signed rather than an unsigned preset, because an unsigned preset is a public write
endpoint against the account's quota. Only the signed parameters are covered, so
pinning `folder` and `public_id` server-side is what stops a client uploading anywhere
it likes. Every asset is namespaced under its owner, which is a second independent
ownership check.

⚠️ The upload **kind** (`screenshot` / `image` / `background`) is a coarse folder name
and is *not* the asset key. An asset key is `screenId/layerId` — per-session churn with
a slash in it. Never pass one where a kind is wanted.

**Status: ✅**

**Backlog**

- No cancel for an in-flight upload.
- No retry on transient failure — the error surfaces and the save aborts.
- `"logo"` is still accepted by the sign route and the schemas, for assets uploaded
  before layers were generalised. Removable once no such rows matter.

---

### H2. Asset records

**What it is.** The `Asset` collection, meant to track every upload so it can be listed
and deleted.

**Files**

- [models/Asset.ts](models/Asset.ts)
- [actions/assets/assetActions.ts](actions/assets/assetActions.ts) —
  `registerAssetAction`, `deleteAssetAction`
- [schemas/asset.ts](schemas/asset.ts)

**Status: 🔌 — the code is complete and nothing calls it.**

Confirmed: `registerAssetAction` and `deleteAssetAction` have **zero callers** outside
`actions/`. The consequences are real:

- The `Asset` collection is never written, so `assetId` in every document is always
  `null` despite being in the schema.
- Every uploaded file is an **orphan in Cloudinary** — nothing records it, nothing can
  find it, nothing can delete it. Replacing a screenshot ten times leaves ten files
  billed against the account with no way to reap them.
- There is no per-user storage accounting, so a quota or a plan limit cannot be built.

**Backlog** (in order)

1. Call `registerAssetAction` from `prepareDocForSave` after each successful upload,
   and write the returned id into the layer's `assetId`.
2. Call `deleteAssetAction` when a layer's image is cleared *and* the document has been
   saved — the tricky part is that undo can bring the layer back, so deletion probably
   belongs in a sweep rather than inline.
3. A reaper for existing orphans: list the account's folder, diff against `Asset`, and
   report before deleting anything.
4. Only then, storage limits per plan (`User.plan` already exists, `"free" | "pro"`).

---

## I. Accounts

### I1. Authentication

**What it is.** Credentials (bcrypt) plus optional Google, on Auth.js v5.

**Files**

- [auth.ts](auth.ts) — providers, callbacks, adapter
- [auth.config.ts](auth.config.ts) — the dependency-free half
- [lib/password.ts](lib/password.ts), [actions/auth/authActions.ts](actions/auth/authActions.ts)
- [components/auth/auth-form.tsx](components/auth/auth-form.tsx), [app/(auth)/](app/%28auth%29/)

**How it works.** JWT strategy, forced by the credentials provider. Read the header
comments in [models/User.ts](models/User.ts) and `auth.ts` before changing either —
this is Risk 5 in [PLAN.md](PLAN.md), and it fails *silently* when it fails. The four
traps, all mitigated:

- The Auth.js adapter and Mongoose share the `users` collection. The adapter bypasses
  Mongoose defaults and `timestamps`, so a Google-created user has no `createdAt` and
  no `plan`; those are optional, `plan` is read as `plan ?? "free"`, and
  `_id.getTimestamp()` is the reliable signup date.
- `select: false` only applies to Mongoose reads. The adapter returns raw documents
  including `passwordHash`, so callbacks must pick fields explicitly and **never spread
  the user object**.
- Under the JWT strategy the `session` callback receives no `user` argument — reading
  `user.id` there is the usual cause of an undefined `session.user.id` in actions.
- `authorize()` returns `null` for an OAuth-only account rather than throwing, so the
  form cannot enumerate which emails are registered.

`allowDangerousEmailAccountLinking` is enabled for Google only, because Google verifies
email ownership. **Never enable it for a provider that does not.**

**Status: ✅**

**Backlog**

- No password reset, no email verification, no change-password.
- No other OAuth providers.
- `User.plan` exists and nothing reads or enforces it.

---

### I2. Project dashboard

**What it is.** The list of saved projects.

**Files**

- [app/(app)/dashboard/page.tsx](app/%28app%29/dashboard/page.tsx)
- `listProjectsAction` in [actions/projects/projectActions.ts](actions/projects/projectActions.ts)

**How it works.** Paginated, `userId`-filtered, sorted by `updatedAt`. Projects the
list query projects away `doc` — an editor document with a gradient and twenty text
layers is far larger than the card that displays it.

**Status: 🟡**

**Backlog**

- **Thumbnails are never generated.** The card renders `thumbnailUrl` and
  `createProjectAction` accepts it, but nothing ever produces one, so every card is an
  empty grey frame. Generating one on save from screen 1's Stage at low pixel ratio is
  the obvious fix and pairs with [H2](#h2-asset-records).
- **`duplicateProjectAction` and `deleteProjectAction` have no UI.** Both are written,
  tested by type-check only, and unreachable. A card overflow menu is a small job.
- Pagination exists in the action (`page`, `limit`, `hasNext`) and the page hardcodes
  page 1 with limit 24 — no controls.
- No search, no sort options, no rename.

---

### I3. Route protection

**What it is.** Which pages need a session.

**Files**

- [proxy.ts](proxy.ts) — Next 16's renamed middleware
- `PUBLIC_PATHS` and `routes` in [config/routes.ts](config/routes.ts)

**How it works.** Public: `/`, `/login`, `/register`, `/editor`, `/templates`.
Protected: `/dashboard/*`, `/editor/<id>`. Anyone can build and export without an
account, because export is entirely client-side — signing in is required to *save*, not
to try, which is what makes the editor the product's own advertisement.

Two details that are easy to break:

- The matcher uses `/editor/:id+`, not `:id*`. `*` matches zero or more segments and
  would therefore capture bare `/editor`, forcing auth on the anonymous editor.
- `proxy.ts` imports `auth.config.ts`, **not** `auth.ts`, so route protection does not
  drag Mongoose, the MongoDB adapter and bcrypt — or open a DB pool — on every matched
  request.

**Status: ✅**

**Backlog**

- Nothing outstanding. Add any new public route to both the matcher and `PUBLIC_PATHS`.

---

## J. Not started

Candidate features, roughly by value. None of these exist in any form.

| Feature | Notes |
|---|---|
| **Thumbnail generation** | Highest value for effort. Unblocks the dashboard. See [I2](#i2-project-dashboard) |
| **Drag-and-drop reordering** | Screens and layers. See [B2](#b2-screen-crud), [C1](#c1-layer-stack--ordering) |
| **Batch export** | Needs a server. See [G2](#g2-batch-export) |
| **More templates** | Data-only in [config/templates.ts](config/templates.ts). See [E1](#e1-templates) |
| **Google Fonts picker** | Extends the existing canvas registry and `ensureFontsLoaded`; do not route it through `next/font` — see [F3](#f3-canvas-fonts) |
| **On-canvas text editing** | Double-click to edit in place, instead of the panel textarea |
| **Shape primitives** | Rect/circle/blob decorations, so not every accent has to be an upload |
| **Alignment & snapping** | Guides, snap-to-centre, distribute. Pairs with multi-select |
| **Localisation of copy** | The reference's "Localize" — per-locale text per screen, one export set per language. Would need `text` to become a locale map, so it is a document-version change |
| **Sharing** | Explicit `visibility: "private" \| "unlisted"` plus a separate `getPublicProject` action — **never** by relaxing the ownership filter |
| **Billing / plans** | `User.plan` exists and is unread. Gate on export scale or screen count |
| **PDF export, team accounts** | Phase 4 |

---

## Cross-cutting rules

These are not features; breaking one causes a bug somewhere else entirely.

| Rule | Where | Why |
|---|---|---|
| One image path onto canvas | [F2](#f2-origin-clean-image-cache) | Canvas tainting; fails intermittently at export |
| `normalizeTransform` on every transform end | [F1](#f1-konva-stage-pipeline) | Scale drift compounds forever |
| Memoise oriented device specs | [E2](#e2-device-catalog--orientation) | Infinite render loop under Zustand v5 |
| Gate first paint on fonts | [F3](#f3-canvas-fonts) | Wrong line breaks baked into exports |
| `react-konva` only under `components/canvas/` | [F1](#f1-konva-stage-pipeline) | Breaks `pnpm build` |
| Bump `EDITOR_DOC_VERSION` + add a migration | [A2](#a2-schema-versioning--migrations) | Saved projects fail to parse and drop silently |
| Honour `screen.pinned` in bulk writes | [B3](#b3-screen-pinning) | Silently overwrites hand-tuned work |
| Image URLs nullable, never `""` | [A1](#a1-editor-document-model) | `""` fails the schema; whole draft is discarded |
| Ownership as a filter clause | [CLAUDE.md](CLAUDE.md) | Races, and leaks whether an id exists |
| Re-throw Next control-flow errors first | [lib/action.ts](lib/action.ts) | `redirect()` becomes a silent no-op |
| `config/templates.ts` imports types only | [E1](#e1-templates) | Module cycle with the schema |
