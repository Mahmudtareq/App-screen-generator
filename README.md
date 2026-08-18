# Mockup Studio

Pick a template, get five App Store screens side by side, drop a screenshot into
each device frame, and export at store resolution.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · shadcn/ui ·
Konva · Zustand · Mongoose · Auth.js v5 · Cloudinary.

## Running it

```bash
pnpm install

cp .env.example .env.local          # then fill in the values below
pnpm dev:db                         # disposable local MongoDB (leave running)
pnpm sync-indexes                   # build the indexes once
pnpm dev
```

`pnpm dev:db` runs an in-memory MongoDB so you do not need a local install or
Docker. Its data is discarded on exit — point `MONGODB_URI` at Atlas when you
want it to persist.

### Environment

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | Connection string |
| `MONGODB_DB_NAME` | no | Defaults to `mockup-studio` |
| `AUTH_SECRET` | yes | 32+ chars — `openssl rand -base64 32` |
| `AUTH_URL` | no | Leave unset in development; a wrong port here breaks every redirect |
| `AUTH_TRUST_HOST` | dev | Set `true` locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | no | The Google button is hidden when unset |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | yes | Uploads fail without real values; the editor and export still work |

`config/env.ts` validates all of this with zod at import, so a missing value is a
startup error rather than a confusing failure later.

## How it fits together

A project is a **set of screens**: five frames sharing one device, orientation and
canvas size, differing in artwork and copy. They sit in a horizontally scrolling
filmstrip, and clicking one opens its inspector inline beside it.

```text
5 Konva Stages (artboard px)  →  Zustand `doc.screens[]`  →  Project.doc (Mongo)
      │                                                            ▲
      └─ screenshots/images ─→ signed direct upload ─→ Cloudinary ──┘
```

Four decisions everything else follows from:

1. **The editor's `doc` slice is the persisted document.** Saving is
   `updateProject(id, doc)` with no field mapping in between.
2. **A screen's content is an ordered layer array**, not named slots.
   `layers[0]` paints first and sits at the back. This is what lets an image go
   *behind* the device and another one in front of it — the same component twice,
   differing only in where it sits in the array.
3. **Device frames are drawn from data, not composited from PNGs.**
   `config`-style specs in `lib/devices/catalog.ts` drive Konva primitives, so
   frames stay crisp at any export scale and carry no asset licensing.
4. **Everything drawn on the canvas loads through `lib/canvas/image-cache.ts`**
   — fetched as a Blob and rendered from a `blob:` URL. This is what keeps the
   canvas origin-clean; see the comment in that file for why `crossOrigin`
   alone is not enough.

### Layout

| Path | What lives there |
|---|---|
| `app/` | Routes. `editor/` and `templates/` are public; `dashboard/` and `editor/[projectId]/` are not |
| `actions/<domain>/` | Server actions, `"use server"` on line 1 — thin wrappers over the api-client |
| `app/api/` | The REST API routes, each wrapped in `asyncHandler` |
| `lib/api-client.ts` | The one server-side fetch wrapper actions call the API through |
| `lib/async-handler.ts`, `lib/server.utils.ts` | Route wrapper (auth, zod, error mapping) and the `apiResponse` envelope |
| `lib/canvas/`, `lib/export/` | Konva helpers, fit maths, export pipeline |
| `lib/devices/` | Frame geometry, catalog, orientation transform |
| `lib/editor/` | Zustand store, slices, persistence |
| `config/templates.ts` | The starter templates, as static data |
| `models/`, `schemas/` | Mongoose models, zod contracts |
| `components/canvas/` | The only place `react-konva` is imported |
| `components/editor/screens/` | The filmstrip, cards and per-screen actions |
| `components/editor/panels/` | The inspector and its per-layer panels |

## Conventions

- **Ownership is a filter clause, never a post-fetch comparison.**
  `Project.findOne({ _id, userId })`, and failures return 404 so ids
  cannot be enumerated. No route reads a userId from the query or body.
- **Backend calls flow UI → server action → `apiClient` → API route → database.**
  Every route is wrapped in `asyncHandler` (auth guard, zod parsing, DB connect,
  error mapping) and answers with the one `{ status, message, data }` envelope
  from `apiResponse`.
- **Every catch re-throws Next control-flow errors first.** `redirect()` works by
  throwing; swallowing it turns an auth redirect into a silent no-op.
- **Routes live in `config/routes.ts`.** Never hardcode a path.
- **`react-konva` is imported only under `components/canvas/`.** The whole subtree
  is reached through the `ssr: false` dynamic import in `canvas-host.tsx`. A stray
  import elsewhere pulls Konva into the server bundle and fails `pnpm build` —
  which is what makes the build a useful canary.
- **One Stage per screen**, registered by screen id in `lib/canvas/stage-registry.ts`.
  Export is then handed a Stage holding exactly one artboard, instead of having to
  rasterise a sub-region of a five-artboard-wide one.
- **`screen.pinned` opts a screen out of bulk writes** — apply-to-all, template
  restyle, artboard retarget. Anything new that writes across the set must honour it.
- **Document image URLs are nullable, never `""`.** An empty string fails
  `assetUrlSchema`, which means a document holding one fails its own schema and the
  whole draft is dropped on reload.

## Verifying changes

```bash
pnpm lint && pnpm type-check && pnpm build
```

The build doubles as the check that Konva has not leaked server-side. Beyond
that, the things worth exercising by hand:

- Export a screen at the highest enabled scale and confirm `toBlob` resolves (the
  canvas-tainting canary). At App Store 6.9" that is 2×: 1290×2796 at 3× is 32MP
  and the dimension guard disables it on purpose.
- Hard-refresh with the cache disabled and compare the preview's line breaks
  against the exported image — they must match, or a font loaded late.
- Add and delete screens, and confirm the last one cannot be deleted.
- Restack a layer and re-export; the new order must survive.
- Sign in as a second user and open the first user's project id; expect a 404.

## Known gaps

- **Every device spec is `fidelity: "draft"`.** Bezel widths, corner radii and
  notch geometry come from published screen resolutions with estimated bezels.
  Each device needs a pass against a real product photo before it ships.
- Thumbnails are not generated yet, so dashboard cards show an empty frame.
- **Two templates.** Adding a third is a data-only change in `config/templates.ts`.
- Export is one screen at a time. Exporting a whole set needs server-side
  compositing — five 32MP canvases in one browser is how this runs out of memory.
- Screens reorder with arrow buttons, not drag-and-drop.
