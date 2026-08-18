# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
pnpm install
pnpm dev:db          # disposable in-memory MongoDB on :27017 — leave running in its own shell
pnpm sync-indexes    # build indexes (incl. the unique users.email index Auth.js does not create)
pnpm dev

pnpm lint && pnpm type-check && pnpm build   # the full check before calling anything done
```

`pnpm build` is not just a build — it is the canary for Konva leaking into the
server bundle (see below). Never report a canvas or editor change as verified
without running it.

There is no test runner in this project. Verification is the three commands
above plus the manual checks listed in [README.md](README.md) ("Verifying
changes") — export at 3×, font line-break parity, cross-user 404.

`config/env.ts` validates the environment with zod at import, so a missing
variable is a startup crash, not a later mystery. Copy `.env.example` to
`.env.local` first; `pnpm dev:db` supplies `MONGODB_URI`'s target.

## Architecture

Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, `@/*` → repo
root. Root-level `app/`, `actions/`, `lib/`, `models/`, `schemas/`, `config/`.

A project is a **set of screens** — five store frames that share a device model,
orientation and canvas size, and differ in artwork and copy. That shape drives
everything below.

```
5 Konva Stages (artboard px)  →  Zustand `doc.screens[]`  →  Project.doc (Mongo)
      │                                                            ▲
      └─ screenshots/images ─→ signed direct upload ─→ Cloudinary ──┘
```

Five structural rules; most bugs in this codebase come from breaking one.

**1. The editor `doc` slice is the persisted document.** `lib/editor/store.ts`
composes four slices ([document](lib/editor/slices/document.ts),
[selection](lib/editor/slices/selection.ts),
[viewport](lib/editor/slices/viewport.ts), [ui](lib/editor/slices/ui.ts)) and only
`doc` is serialised, autosaved and undo-tracked (`partialize` in the `zundo`
config). Saving is `updateProject(id, doc)` with no field mapping.
[schemas/editor.ts](schemas/editor.ts) is the authority on its shape;
`Project.doc` is `Schema.Types.Mixed` on purpose. Any change to that shape needs
a bump of `EDITOR_DOC_VERSION` plus an entry in `MIGRATIONS` in
[lib/editor/persistence.ts](lib/editor/persistence.ts) — v1 (single artboard,
named slots) → v2 (screens, ordered layers) is the worked example.

**2. Within a screen, content is an ordered layer array.** `screen.layers[0]`
paints first and sits at the back; the last entry is on top. Device, image and
text layers are a discriminated union on `kind`, narrowed with `isDeviceLayer` /
`isImageLayer` / `isTextLayer` from the schema — never hand-written `kind ===`
chains. The background is *not* a layer: it is always behind everything and is
the one thing the export pipeline hides on its own. Device model, orientation and
artboard are document-level, because five frames of one listing have to agree.
A text layer's copy is an ordered array of styled *runs* for the same reason, and
Konva cannot lay that out — [lib/canvas/rich-text.ts](lib/canvas/rich-text.ts) owns
every wrap point and fragment position, and preview and export share it. Read
FEATURES.md C6 before touching text rendering.

**3. One image path onto the canvas.** [lib/canvas/image-cache.ts](lib/canvas/image-cache.ts)
fetches every image as a Blob and renders it from a same-origin `blob:` URL.
This is the structural fix for canvas tainting — `crossOrigin="anonymous"` is
not sufficient, and the failure only shows up intermittently at export time.
Do not introduce a second path (`use-image`, a raw `<img>` src, a Cloudinary URL
handed straight to a Konva node). Bitmaps live in that module-level map, never in
the store — they are not serialisable and would be cloned into undo history.
The capture route ([app/api/capture/route.ts](app/api/capture/route.ts)) returns
image *bytes* rather than a URL for exactly this reason.
Session images are keyed `screenId/layerId` (or `screenId/background`) by the
helpers in [lib/editor/types.ts](lib/editor/types.ts); the *upload folder* kind is
a separate, coarser thing (`screenshot` / `image` / `background`) — never pass an
asset key where a kind is wanted, it has a slash in it.

**4. `react-konva` is confined to [components/canvas/](components/canvas/).**
The whole subtree is reached only through
[canvas-host.tsx](components/canvas/canvas-host.tsx), which is a Client Component
that `dynamic(..., { ssr: false })`-imports the Stage *once at module scope* so all
screens share one lazy chunk. An import anywhere outside that directory pulls
Konva into the server bundle and fails `pnpm build`.
There is one Stage **per screen**, registered in
[lib/canvas/stage-registry.ts](lib/canvas/stage-registry.ts) by screen id — that
is how the export pipeline gets handed a Stage containing exactly one artboard.
A layer id is only unique within its screen, which is fine because a Stage is the
scope `findOne("#id")` searches; that is why the layer id doubles as the node id.
Konva bakes text metrics at construction, so the first Stage render is gated on
`ensureFontsLoaded()` (once, from the strip) and a late-arriving face bumps
`fontsVersion` to force a redraw; fonts are re-awaited inside the export pipeline.
Konva's Transformer mutates `scaleX`/`scaleY` — always route `onTransformEnd`
through `normalizeTransform` in [lib/canvas/transform.ts](lib/canvas/transform.ts),
never inline in a component.

**5. Every server action goes through `withAction`.** [lib/action.ts](lib/action.ts)
(`server-only`, no `"use server"` — action files carry the directive) wraps auth
guard, zod parse, `connectDB()` and error mapping into one `ActionResult<T>`
envelope. Client Components narrow it via
[lib/action-client.ts](lib/action-client.ts). Throw `raise(code, msg)` from a
handler rather than returning ad-hoc shapes.
Ownership is always a filter clause — `Project.findOne({ _id, userId })`, never
fetch-then-compare — and missing/foreign ids return `NOT_FOUND` so ids cannot be
enumerated. `ctx.userId` comes from the session only; no action takes a `userId`
parameter and no schema has a field for one.
Every catch must re-throw Next control-flow errors first
(`isNextControlFlowError`) — `redirect()` works by throwing.

### Auth and data layer

- [auth.config.ts](auth.config.ts) holds the dependency-free half; [proxy.ts](proxy.ts)
  (Next 16's renamed middleware) imports *that*, not `auth.ts`, so route
  protection does not open a DB pool per request. Matcher uses `/editor/:id+`
  — `:id*` would capture bare `/editor`, which is deliberately public.
- [auth.ts](auth.ts) shares the `users` collection between the Auth.js MongoDB
  adapter and Mongoose. Read the header comments in [models/User.ts](models/User.ts)
  and `auth.ts` before touching either: the adapter bypasses Mongoose defaults
  and `select: false`, so callbacks must pick fields explicitly and never spread
  the user object; under the JWT strategy the `session` callback gets no `user`
  argument.
- [lib/db.ts](lib/db.ts) caches the connection *and* the promise on `globalThis`;
  `autoIndex` is off in production, hence `pnpm sync-indexes`. That script needs
  `--conditions=react-server` (already in the npm script) or `server-only`
  resolves to its throwing client entry.
- Devices are static TypeScript in [lib/devices/catalog.ts](lib/devices/catalog.ts),
  not database rows — they are coupled to the renderer and needed synchronously on
  first paint. Rotated specs must stay memoised
  ([lib/devices/orientation.ts](lib/devices/orientation.ts)): returning a fresh
  object per call causes an infinite render loop under Zustand v5's `Object.is`.
- Templates are static TypeScript too, in [config/templates.ts](config/templates.ts),
  and that file must only ever `import type` from `schemas/editor.ts` — the schema
  imports `TEMPLATE_IDS` from it, so a value import would close a module cycle.

### Editor UI

- [screen-strip.tsx](components/editor/screens/screen-strip.tsx) is the horizontally
  scrolling row of screens. Cards are sized from the strip's **height** only, since
  every screen shares one artboard; fitting to width too would shrink the set to
  thumbnails as screens were added.
- The selected screen's [inspector-panel.tsx](components/editor/panels/inspector-panel.tsx)
  is inserted *inline in the strip* after its own card, not docked to the window
  edge, so the frame and the controls editing it stay paired while scrolling.
- Scope decides where a control lives: one screen → its inspector; the whole
  project → the toolbar (`Setup` popover, size selector, template picker). That is
  what makes it obvious whether a control changes one frame or five.
- `screen.pinned` opts a screen out of every bulk write — apply-background-to-all,
  template restyle, artboard retarget. Honour it in anything new that writes across
  the set.
- Panel expansion state is local React state, never the store: putting it in `doc`
  would make opening a section an undo step.

### Conventions

- Routes live in [config/routes.ts](config/routes.ts); never hardcode a path.
- Server actions: `actions/<domain>/<domain>Actions.ts`, `"use server"` on line 1.
- Read from `env` in [config/env.ts](config/env.ts), never `process.env` directly.
- shadcn/ui in [components/ui/](components/ui/) with `cn()`; Tailwind v4 CSS-first
  config in [app/globals.css](app/globals.css).
- Uploads are signed browser→Cloudinary via [app/api/cloudinary/sign/route.ts](app/api/cloudinary/sign/route.ts);
  `assetUrlSchema` accepts only https, so a save with an un-uploaded asset fails
  validation rather than persisting a dead URL. Image URLs in the document are
  *nullable* rather than `""` — an empty string is not a valid URL, so a document
  holding one fails its own schema and silently drops the whole draft on reload.

### Current state

[TASK.md](TASK.md) is the running task log — what has been built, in order, with the
doc-version bump each task needed. **Keep it current**: add an entry when a task
starts, and move it to Done with the date and the commit when it lands. It is the
answer to "what changed and why" that neither the git log nor FEATURES.md gives on
its own.

[PLAN.md](PLAN.md) tracks phases and known risks. Two things to know:

- **Every device spec is `fidelity: "draft"`** — estimated bezel geometry. Tuning
  them against real product photos is the main gap before shipping.
- **Batch export is not built.** Export runs one screen at a time on purpose: each
  screen is its own Stage, and a browser holding five 32MP canvases is how this
  runs out of memory on an iPad. Exporting the whole set needs server-side
  compositing (`sharp` + a zip), which is Phase 3.

Note that 1290×2796 at 3× is 32MP and exceeds what browsers will rasterise, so the
3× option is *correctly* disabled at App Store 6.9". That is the dimension guard
working, not a bug.
