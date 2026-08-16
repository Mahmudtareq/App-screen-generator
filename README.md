# Mockup Studio

Drop a phone screenshot into a device frame, add a background and captions, and
export a polished mockup at App Store resolution.

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

```
Konva Stage (artboard px)  →  Zustand `doc` slice  →  Project.doc (Mongo)
      │                                                      ▲
      └─ screenshots/logos ─→ signed direct upload ─→ Cloudinary ─┘
```

Three decisions everything else follows from:

1. **The editor's `doc` slice is the persisted document.** Saving is
   `updateProject(id, doc)` with no field mapping in between.
2. **Device frames are drawn from data, not composited from PNGs.**
   `config`-style specs in `lib/devices/catalog.ts` drive Konva primitives, so
   frames stay crisp at any export scale and carry no asset licensing.
3. **Everything drawn on the canvas loads through `lib/canvas/image-cache.ts`**
   — fetched as a Blob and rendered from a `blob:` URL. This is what keeps the
   canvas origin-clean; see the comment in that file for why `crossOrigin`
   alone is not enough.

### Layout

| Path | What lives there |
|---|---|
| `app/` | Routes. `editor/` is public; `dashboard/` and `editor/[projectId]/` are not |
| `actions/<domain>/` | Server actions, `"use server"` on line 1 |
| `lib/action.ts` | The one `ActionResult` envelope and the `withAction` wrapper |
| `lib/canvas/`, `lib/export/` | Konva helpers, fit maths, export pipeline |
| `lib/devices/` | Frame geometry, catalog, orientation transform |
| `lib/editor/` | Zustand store, slices, persistence |
| `models/`, `schemas/` | Mongoose models, zod contracts |
| `components/canvas/` | The only place `react-konva` is imported |

## Conventions

- **Ownership is a filter clause, never a post-fetch comparison.**
  `Project.findOne({ _id, userId })`, and failures return `NOT_FOUND` so ids
  cannot be enumerated. No action takes a `userId` parameter.
- **Every server action returns `ActionResult<T>`** — one shape, produced by
  `withAction`, which also runs the auth guard, zod parsing and DB connect.
- **Every catch re-throws Next control-flow errors first.** `redirect()` works by
  throwing; swallowing it turns an auth redirect into a silent no-op.
- **Routes live in `config/routes.ts`.** Never hardcode a path.
- **`components/canvas/canvas-stage.tsx` is the only top-level `react-konva`
  import.** A stray one elsewhere pulls Konva into the server bundle and fails
  `pnpm build` — which is what makes the build a useful canary.

## Verifying changes

```bash
pnpm lint && pnpm type-check && pnpm build
```

The build doubles as the check that Konva has not leaked server-side. Beyond
that, the things worth exercising by hand:

- Export at 3× and confirm `toBlob` resolves (the canvas-tainting canary).
- Hard-refresh with the cache disabled and compare the preview's line breaks
  against the exported image — they must match, or a font loaded late.
- Sign in as a second user and open the first user's project id; expect a 404.

## Known gaps

- **Every device spec is `fidelity: "draft"`.** Bezel widths, corner radii and
  notch geometry come from published screen resolutions with estimated bezels.
  Each device needs a pass against a real product photo before it ships.
- Thumbnails are not generated yet, so dashboard cards show an empty frame.
- Batch export across devices is not built; it is the first feature that
  genuinely needs server-side compositing.
