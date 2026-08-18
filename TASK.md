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

### 7. Account menu in the header, and a redesigned auth pair ✅
**18 Aug 2026** · `e811bc4`

1. **The header now knows who is signed in.** `AppBar` took a `signedIn: boolean`,
   which is all it could show — a "Sign in" pair or nothing. It now takes
   `user: SessionUser | null` and renders `UserMenu`: an avatar (Cloudinary/Google
   image, initials from name or email as the fallback), the display name beside it
   from `lg` up, and a dropdown carrying name, email, links to Projects and a new
   mockup, and **Sign out**.
2. **The dashboard had no header at all.** That was the actual reported bug — signing
   in landed on the one page in the app that never rendered the bar. It now wraps the
   same `AppBar` with `active="projects"`.
3. **`getSessionUser()`** in `lib/session-user.ts` is the single reduction of the
   session to the three fields the chrome renders, guarded on `session.user.id`
   rather than on `session` — a session object without an id is the JWT-callback
   failure `auth.ts` warns about, and treating it as signed in renders an avatar for
   a user every server action will then reject.
4. **Sign-out** is `signOut({ callbackUrl: "/" })` from `next-auth/react`, held in a
   transition so the item shows a spinner. No local router push: the cookie is
   cleared server-side and the navigation follows it, so a redirect of our own would
   race it onto a stale page.
5. **Login and register redesigned** as a split shell — a dark pitch panel (product
   claims, three feature rows, subtle radial and grid washes drawn from the theme's
   own tokens, since the palette is monochrome) beside the form, with the panel
   dropped below `lg` in favour of a centred logo. Fields grew to 44px with
   placeholders and `aria-invalid`, the password gained a show/hide toggle, the error
   became a real alert, and Google's mark is inlined on its button.
6. **Submit logic is untouched** — same `registerAction` → `signIn("credentials")`
   sequence, same field-error mapping, same `callbackUrl` handling.
7. **Doc shape:** unchanged. Nothing here touches the editor document.

**Checked:** registered through the form in a real browser — landed on the dashboard
with the avatar and name in the bar; the dropdown showed name, email and both links;
Sign out returned to `/` and `/dashboard` then bounced to `/login?callbackUrl=…`. Same
bar verified on the editor and templates. `pnpm lint && pnpm type-check && pnpm build`
all clean, with `/login` and `/register` still prerendered static.

---

### 8. Dashboard: shadcn sidebar shell and a real project grid ✅
**18 Aug 2026** · `e811bc4`

1. **`app/(app)/layout.tsx`** is the signed-in shell — `SidebarProvider` +
   `AppSidebar` + `SidebarInset`. `sidebar_state` is read from the cookie on the
   server so the rail renders at its remembered width in the first paint; restoring
   it in an effect is a visible jump on every navigation.
2. **`AppSidebar`** collapses to an icon rail: brand, a `New mockup` button, and
   Projects / Templates / Editor with `isActive` from `usePathname`. The button is
   hidden while collapsed rather than shrunk — the rail already has an Editor entry,
   and two doors to the same room read worse at 3rem than one.
3. **`NavUser`** is the footer identity row. `UserMenu` was split into
   `UserMenuItems` + `UserAvatar` so the app bar's round avatar and the sidebar's
   full-width row share one menu instead of two copies drifting apart.
4. **`DashboardHeader`** derives its breadcrumbs from the pathname, so a page added
   to the route group gets a correct header without the layout having to thread
   anything down to it.
5. **`ProjectCard`** replaced the flat thumbnail tile: the artwork is *contained*
   over a gradient well rather than cropped — a store screenshot is a tall portrait
   frame and `cover` cut the copy off the top of every card — with a hover overlay,
   a real "No preview yet" placeholder, and a relative timestamp, which is the only
   thing anyone reads that date for on this screen.
6. **Pagination now exists.** `listProjectsAction` has always been paginated at 24;
   the page only ever asked for page 1, so a 25th project was invisible rather than
   merely off-screen. `?page=` is read from `searchParams` and normalised, since a
   hand-edited URL is a bad URL rather than an error worth a red message.
7. **Grid is 2 / 3 / 4 / 5 columns** by breakpoint; below `md` the rail becomes a
   sheet behind the trigger.
8. `hooks/use-mobile.ts` came from the shadcn CLI seeding its first value inside an
   effect, which this project's `react-hooks/set-state-in-effect` rule rejects. It
   is a `useSyncExternalStore` now — same media query, no effect, and a server
   snapshot that matches the old hook's `undefined`-reads-as-false behaviour.
9. `TooltipProvider` is mounted in this layout, not the root: the collapsed rail's
   tooltips are the only tooltips in the app.
10. **Doc shape:** unchanged.

**Checked:** seeded 27 projects against the dev database and walked the result at
1440 / 1024 / 390 — grid reflows, the rail collapses to icons and reopens, and on
mobile it is a sheet. Page 2 returns the remaining 3 with `Next` correctly disabled.
Signed out from the sidebar footer and landed on `/`, with `/dashboard` then
bouncing to `/login?callbackUrl=…`. The editor and templates still render the
unchanged app bar. `pnpm lint && pnpm type-check && pnpm build` all clean.

---

### 9. Naming a project ✅
**18 Aug 2026** · `772c615`

There was no way to do either. `createProjectAction` was always called with
`projectName ?? "Untitled mockup"` and `projectName` is only ever set for an
*existing* project, so every new project was literally named "Untitled mockup";
`updateProjectSchema` has always accepted a `name`, but nothing in the UI ever
sent one.

1. **One control for both cases** — `ProjectTitle`, edited in place in the app bar.
   Before a project exists, typing there is simply what the eventual
   `createProjectAction` will be given; afterwards, committing writes the row
   immediately. A "name this" dialog in front of Save would ask the question at the
   worst moment and still leave renaming unsolved.
2. **The name lives in the ui slice**, not in `doc`. It is a `Project` column, so
   putting it in the document would need a version bump, would serialise it into
   `doc`, and would make typing a title something Cmd+Z walks back through.
3. **Drafts keep it too**, under `editor:draft-name:v1` — a sibling key rather than
   a field inside the draft, because the draft is read back through
   `editorDocSchema` and a name folded into it would no longer parse. A title typed
   before signing up survives registration exactly as the screens do.
4. Seeded from `useProjectBootstrap` alongside the document, through the store
   rather than React state: reading localStorage during render would not match the
   server, and seeding from an effect is what `set-state-in-effect` exists to stop.
5. **`AppBar`'s `projectName: string` became `title: React.ReactNode`.** The bar has
   no business knowing how renaming works, and `EditorToolbar`/`SaveButton` no
   longer take the name as a prop at all — the store is the one source.
6. A failed rename **puts the old name back** rather than leaving the bar showing a
   title the database does not have. Enter and blur commit, Escape cancels.
7. **Doc shape:** unchanged. EDITOR_DOC_VERSION stays at 6.

**Checked:** typed a name in the anonymous editor, reloaded, and it came back;
carried it through registration and hit Save — the created row, the dashboard card
and the tab title all carried it. Renamed a saved project and saw the dashboard
follow. Escape discarded an edit. `pnpm lint && pnpm type-check && pnpm build` clean.

---

### 10. The device layer grows up: modes, a picker, and admin-authored devices ✅
**2026-08-18 · a9d099b**

"Add device type modes like appscreens, a Change device picker with all devices,
and make devices dynamic from an admin panel."

1. **Doc v7.** `deviceId` widened from the built-in enum to any string (a document
   may now name an admin-authored device; `resolveDevice` falls back to the default
   frame rather than dropping the doc). A device layer gained `frameMode`
   (`device` / `screenshot` / `full`) and `perspective` (`none` / `left` / `right`),
   a screenshot gained `fit` (`cover` / `contain`). All defaults reproduce v6
   behaviour exactly, so the migration only stamps the version.
2. **One "Device type" dropdown, two stored fields.** What is drawn and how it
   leans vary independently, so they are stored orthogonally and mapped to the
   seven-option select in `lib/devices/frame-modes.ts`. The 3D lean is an affine
   skew on an *inner* Konva group pivoting on the body centre — the outer group's
   scale belongs to the Transformer, and `normalizeDeviceTransform` assumes it
   stays uniform. Konva has no perspective projection; true 3D is a WebGL job.
3. **Full-screen mode** bleeds the screenshot across the artboard, pinned at the
   origin: not draggable, skipped by the Transformer, still click-selectable so
   the panel stays reachable.
4. **The registry** (`lib/devices/registry.ts`) is now the one id→spec lookup:
   built-ins stay static TypeScript (unchanged rule — geometry is renderer-coupled
   and needed synchronously on first paint), admin devices are fetched by the
   editor's server pages and registered before the first Stage renders. The
   rotation cache moved from id-keyed Map to a spec-keyed WeakMap so an edited
   custom device cannot serve its old geometry rotated.
5. **Catalog grew to 14 devices** — iPhone 6.9″/6.3″ (island & no-island), iPad
   13″, both Apple Watches, Galaxy S26, Pixel 10 Pro, Nothing Phone 3, a 16:9
   monitor — behind new `watch`/`desktop` categories and a `nothing` brand. All
   still `fidelity: "draft"`.
6. **The picker dialog** (`components/editor/devices/`) lists everything the
   registry knows, filtered by form factor (Apple / Android / Tablets / Watches /
   Desktop & TV), each card an SVG silhouette derived from the spec plus
   resolution and a friendly aspect ratio ("19.5:9", not "110:239"). It replaces
   the flat select in both the device panel and the Setup popover; selection is
   still document-level.
7. **Admin devices** are *authoring rows*, not specs: an admin enters datasheet
   numbers (screenshot size, bezel, radii, notch, finishes) and `buildDeviceSpec`
   derives body/screen/viewport — the same function powers the form's live
   preview, the admin list, and the editor, so they cannot disagree. Stored in a
   global `Device` collection (no `userId` — the one un-scoped collection, guarded
   by `withAction({ admin: true })` instead).
8. **Who is an admin** is `ADMIN_EMAILS` in the environment, not a role column:
   the users collection is shared with the Auth.js adapter and that interplay is
   delicate enough that not adding a second field to it is a feature. `/admin`
   pages 404 for non-admins the way foreign project ids do.
9. **Capture route** resolves built-ins from the catalog and `custom:` ids from
   the database, and 400s unknown ids — its schema no longer imports the enum.

**Checked (Playwright against dev):** all five new controls render in the device
panel; the picker filters and switches the whole set; 3D right/left, screenshot
only and full screen each paint correctly (scale/rotation/shadow correctly hidden
for full screen); an admin created "Galaxy Tab S10" through the form and it
appeared in the editor's picker with a Custom badge and rendered on all five
canvases; a non-admin gets no sidebar entry and a 404 from `/admin/devices`;
anonymous is redirected to login. `pnpm lint && pnpm type-check && pnpm build`
clean — the silhouette and admin components live outside `components/canvas/`,
so the build canary mattered here.

---

### 15. Backend refactor: REST API layer in the xoom-api-pannel architecture ✅
**18 Aug 2026**

Asked for: rework the backend/API implementation to follow the sibling
`xoom-api-pannel` project's architecture — API routes + shared api-client +
thin server actions + one response envelope — without touching the UI.

1. **Flow is now UI → server action → `apiClient` → API route → Mongoose.**
   Actions no longer touch the database; the routes own auth, validation,
   ownership filters and error mapping. `withAction`/`ActionResult`
   (`lib/action.ts`, `lib/action-client.ts`) are gone.
2. **New route layer** under `app/api/`: `projects` (list w/ pagination+search,
   create), `projects/[id]` (get/patch/delete), `projects/[id]/duplicate`,
   `auth/register`, `assets` + `assets/[id]`, `admin/devices` +
   `admin/devices/[id]`. The pre-existing `cloudinary/sign` and `capture`
   routes were folded onto the same wrapper (capture keeps its raw-bytes
   success path and anonymous rate limit).
3. **`lib/async-handler.ts`** wraps every handler — `asyncHandler(handler, auth)`
   or `asyncHandler(schema, handler, auth)` with auth levels
   `false | true | "admin"` — owning `connectDB()`, the session guard
   (attaching `req.user`), awaiting dynamic params, zod body parsing, and
   error → envelope mapping. **`lib/server.utils.ts`** provides the one
   `apiResponse` envelope `{ status, message, data }` (validation failures
   carry a `{ field: message }` map in `data`) plus `escapeRegex`/`makePaginate`.
4. **`lib/api-client.ts`** is the one server-side fetch wrapper: forwards the
   Auth.js session cookie (this project's equivalent of the sibling's Bearer
   token), signs out + redirects to login on 401, base URL from
   `NEXT_PUBLIC_BASE_URL` in `config/env.ts`.
5. **Actions renamed to the sibling's style** (`getProjectList`, `getProject`,
   `createProject`, `updateProject`, `duplicateProject`, `deleteProject`,
   `handleRegister`, `getDeviceList`, `createDevice`, `updateDevice`,
   `deleteDevice`, `registerAsset`, `deleteAsset`) as thin apiClient wrappers.
   Call sites updated to check `result?.status` / `result?.message`; no visual
   or behavioural UI change. List responses use the one
   `PaginatedResult` contract (`docs`/`totalDocs`/`pages`/`hasNext`/`hasPrev`)
   the dashboard already expected; project list gained server-side `search`.
6. **Invariants preserved:** `updateProject(id, { doc })` stays field-mapping
   free; ownership stays a filter clause with 404 for foreign ids;
   `EDITOR_DOC_VERSION` untouched (no doc shape change).

**Checked:** `pnpm lint && pnpm type-check && pnpm build` clean. Live smoke test
against the in-memory Mongo: register (validation map, success, 409 duplicate),
401/403 guards, credentials sign-in, full projects CRUD over HTTP (create with a
real v7 doc, list+search, get, rename, empty-PATCH 400, duplicate, foreign-id
404, delete), dashboard page rendering through the full
action → apiClient → route chain, and the enveloped Cloudinary signature.

---

## Open

### 11. Device spec fidelity 🟡
Every device in `lib/devices/catalog.ts` is `fidelity: "draft"` — estimated bezel
geometry. Tuning them against real product photos is the main gap before shipping.
See [PLAN.md](PLAN.md).

### 12. Batch export ◻
Export runs one screen at a time on purpose: each screen is its own Stage, and a
browser holding five 32MP canvases is how this runs out of memory on an iPad.
Exporting the whole set needs server-side compositing (`sharp` + a zip).

### 13. Asset records ◻
There is no account-wide image library — "Your images" is scoped to the open project.
That needs the `Asset` model wired up (FEATURES.md H2).

### 14. Smaller gaps ◻
Named in each feature's **Backlog** in [FEATURES.md](FEATURES.md). The ones most likely
to be asked for next:

- Image layers: no flip, no border, no blend modes; tint is a flat colour only.
- Library: ink is baked at pick time, so changing it means picking again.
- The picker is only wired to image layers — the background panel and the device
  screenshot still have their own dropzone.
- Globals: no global shadow; recent fonts are per browser, not per account.
