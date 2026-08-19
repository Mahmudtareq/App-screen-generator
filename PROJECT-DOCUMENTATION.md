# Mockup Studio — Project Documentation

> **The single source of truth for what this application does today.**
> Every feature below exists in the current codebase. Nothing here is planned-but-unbuilt;
> where a feature is partially done, its status says so.
>
> **Maintenance rule:** whenever a feature is added, changed, or removed, update this file
> in the same piece of work — the affected feature section, the Feature Index, the workflows,
> the API/database sections, and the Change History. See [Keeping This Document Alive](#keeping-this-document-alive).

**Companion documents**
- [FEATURES.md](FEATURES.md) — deep per-feature engineering notes (for developers)
- [TASK.md](TASK.md) — chronological task log with dates and doc-version bumps
- [CLAUDE.md](CLAUDE.md) — architecture rules for AI-assisted development
- [PLAN.md](PLAN.md) — phases and known risks

---

## Project Overview

**Mockup Studio** is a web application for designing **app-store screenshots** — the marketing
images shown on an App Store or Play Store listing. A user builds a *set of screens* (typically
five), each showing a phone frame with their app screenshot inside, a headline, supporting copy,
and a styled background — then downloads the finished images ready to upload to the stores.

**Main purpose:** let anyone produce polished, consistent store screenshots in the browser,
without a design tool.

**User types**

| User | What they can do |
|---|---|
| **Guest (not signed in)** | Use the full editor, browse/use all templates, capture website screenshots, export images. Work autosaves to the browser. Cannot save projects or publish templates. |
| **Signed-in user** | Everything a guest can, plus: save projects to their account, rename/delete them, publish and update their own templates. |
| **Admin** (email allow-listed) | Everything above, plus manage the custom device catalog at `/admin/devices`. |

**Main workflows** (detailed in [Main Workflows](#main-workflows))
1. Pick a template → edit the five screens → save as a project.
2. Open a saved project → edit → save; optionally publish it as a reusable template.
3. Export one screen as an image, or the whole set as a ZIP.

**Major modules:** Authentication · Project dashboard · Editor (screens, layers, devices, text,
images, backgrounds) · Template system (built-in + user-published) · Export · Admin device manager.

**Technology:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui,
Zustand (editor state), Konva (canvas), MongoDB + Mongoose, Auth.js, Cloudinary (images),
Microlink (website capture).

---

## Feature Index

| # | Feature | Work Type | Status | Description |
|---|---|---|---|---|
| 1 | [Authentication](#feature-authentication) | Backend + Frontend + Database | ✅ Completed | Register, login, logout, sessions, protected routes |
| 2 | [Project Dashboard](#feature-project-dashboard) | Full Stack + DataTable | ✅ Completed | Paginated grid of saved projects with previews and delete |
| 3 | [Project Management](#feature-project-management) | Full Stack | 🟠 Partially Completed | Create, open, save, rename, delete projects (duplicate API exists, no UI) |
| 4 | [Editor Core](#feature-editor-core) | Frontend + State Management | ✅ Completed | Versioned document, undo/redo, guest draft autosave |
| 5 | [Screens (Filmstrip)](#feature-screens-filmstrip) | Frontend | ✅ Completed | Add/duplicate/delete/reorder screens, pinning, reset |
| 6 | [Screen Frame](#feature-screen-frame) | Frontend + Validation | ✅ Completed | Per-screen corner rounding and per-screen canvas size |
| 7 | [Layers](#feature-layers) | Frontend + State Management | ✅ Completed | Ordered device/text/image layers with on-canvas transforms |
| 8 | [Device System](#feature-device-system) | Full Stack | 🟡 In Progress | Built-in + admin-authored phone frames, orientation, frame modes (geometry is estimated, not final) |
| 9 | [Screenshot Capture](#feature-screenshot-capture) | Frontend + API + Third-Party | ✅ Completed | Upload a screenshot or capture any website URL into the device |
| 10 | [Text System](#feature-text-system) | Frontend | ✅ Completed | Rich styled text runs, Google Fonts, global fonts, effects |
| 11 | [Image Layers & Picker](#feature-image-layers--picker) | Frontend + File Management | ✅ Completed | Free image layers; tabbed picker (upload / library / project images) |
| 12 | [Backgrounds](#feature-backgrounds) | Frontend + Validation | ✅ Completed | Solid, linear & radial gradients, presets, images with fit/align/rotation |
| 13 | [Color Replacer](#feature-color-replacer) | Frontend | ✅ Completed | Swap one color everywhere it appears across the set |
| 14 | [Templates (Built-in & User-Saved)](#feature-templates) | Full Stack | ✅ Completed | Start from templates; publish your own; update or fork them |
| 15 | [Export & Download](#feature-export--download) | Frontend + File Management | ✅ Completed | Preview all screens; download one image or the set as a ZIP |
| 16 | [Save-Time Thumbnails](#feature-save-time-thumbnails) | Frontend + Integration | ✅ Completed | Project & template preview images generated on save |
| 17 | [Admin Device Manager](#feature-admin-device-manager) | Full Stack + DataTable | ✅ Completed | Admin CRUD for custom device frames |
| 18 | [Cloudinary Uploads](#feature-cloudinary-uploads) | API + Integration + File Management | ✅ Completed | Signed direct browser→Cloudinary uploads |

Legend: ✅ Completed · 🟡 In Progress · 🟠 Partially Completed · 🔵 Planned · 🔴 Needs Fix/Review

---

# Feature Documentation

## Feature: Authentication

### Short Description
Email/password accounts with registration, login, logout, and JWT sessions. Saving anything
requires an account; the editor itself does not.

### User Flow
1. Guest clicks **Save · sign up** in the editor (or visits `/login` / `/register`).
2. They register (name, email, password) or log in.
3. They are returned to where they were (`callbackUrl`) — an unsaved draft survives the round trip.
4. Signed-in users see their avatar menu (dashboard link, sign out).

### What This Feature Does
- Registration with bcrypt-hashed passwords and a unique email constraint.
- Login via Auth.js Credentials provider; sessions are JWTs (no DB read per request).
- Route protection: `/dashboard`, `/admin/*` and `/editor/<id>` require a session; `/`, `/login`, `/register`, `/editor` (blank), `/templates` are public.
- Admin access is an email allow-list (`ADMIN_EMAILS` env var), not a database role.
- Every API route that mutates data derives the user from the session — never from the request body.

**Work Type:** `Authentication` `Backend` `API` `Database` `Frontend` `Validation`

### Frontend Work
- `/login` and `/register` pages sharing one form component (`components/auth/auth-form.tsx`), with `callbackUrl` return.
- `components/auth/user-menu.tsx` avatar dropdown; sign-out.

### Backend/API Work
- `POST /api/auth/register` (public) — zod-validated, 409 on duplicate email.
- `/api/auth/[...nextauth]` — Auth.js handlers.
- `proxy.ts` (Next 16 middleware) guards protected paths using a DB-free config split (`auth.config.ts`), so route checks never open a database connection.
- `asyncHandler` attaches `req.user = { _id, email }` from the session on every guarded route; `"admin"` level additionally checks `isAdminEmail`.

### Database Work
- `users` collection is **shared** between the Auth.js MongoDB adapter and Mongoose (`models/User.ts`); unique index on `email` (built by `pnpm sync-indexes`).

### Important Files
`auth.ts`, `auth.config.ts`, `proxy.ts`, `models/User.ts`, `app/(auth)/`, `components/auth/`, `lib/admin.ts`, `lib/async-handler.ts`

### Current Status
`Completed`

---

## Feature: Project Dashboard

### Short Description
The signed-in home page: a paginated grid of the user's saved projects with live preview images,
relative timestamps, and delete.

### User Flow
1. User signs in → `/dashboard`.
2. Cards show each project's preview thumbnail, name, and "Updated X ago".
3. Clicking a card opens it in the editor; hovering reveals a delete (trash) button.
4. Delete opens a confirmation modal (shows the project's thumbnail, name, last edit, and what deletion means) before permanently deleting.
5. Pagination appears past 24 projects.

### What This Feature Does
- Server-rendered, paginated (24/page) list scoped to the logged-in user.
- Real preview images (generated at save time — see [Save-Time Thumbnails](#feature-save-time-thumbnails)); a placeholder until the first save after the feature landed.
- Confirmation-guarded permanent delete with success/error toasts and instant list refresh.
- Empty state pointing to the editor and template gallery.

**Work Type:** `Frontend` `Backend` `API` `Database` `DataTable` `UI/UX`

### Frontend Work
`app/(app)/dashboard/page.tsx` (server component, `?page=` pagination), `components/dashboard/project-card.tsx`, `components/dashboard/delete-project-button.tsx` (client island: hover trash + confirmation dialog).

### Backend/API Work
`GET /api/projects` (pagination + name search support), `DELETE /api/projects/[id]` — both ownership-filtered. List responses use the shared `docs + pagination` envelope.

### Database Work
Reads `Project` with `.select()` that excludes the heavy editor document; compound index `{ userId, updatedAt }` serves the list.

### Important Files
`app/(app)/dashboard/page.tsx`, `components/dashboard/`, `app/api/projects/route.ts`

### Current Status
`Completed` — note: the API supports name search but the dashboard has no search box yet.

---

## Feature: Project Management

### Short Description
A project is one saved screenshot set: a name, a preview image, and the full editor document,
owned by one user.

### User Flow
1. User edits in the editor (from a template or a blank start).
2. Clicks **Save** → project is created (first time) or updated; a preview thumbnail is generated automatically.
3. The project name is edited inline in the top bar, before or after saving.
4. Reopening from the dashboard restores the exact document.

### What This Feature Does
- Create, open, update, rename (inline title), delete (dashboard modal).
- Ownership enforced as a database filter — someone else's project id returns 404, indistinguishable from "not found".
- The saved document records which template it came from (`doc.templateId`), which powers "Update template" later.
- A duplicate endpoint exists (`POST /api/projects/[id]/duplicate`) and works, but **no UI calls it yet**.

**Work Type:** `Frontend` `Backend` `API` `Database` `Validation` `State Management`

### Frontend Work
`components/editor/save-button.tsx` (split button: one-click save + template menu), `components/editor/project-title.tsx` (inline rename), editor pages `app/editor/page.tsx` (blank/guest) and `app/editor/[projectId]/page.tsx` (saved, protected).

### Backend/API Work
`actions/projects/projectActions.ts` → `app/api/projects` + `app/api/projects/[id]` (GET/PATCH/DELETE) + `/duplicate`. PATCH rejects empty bodies; all writes `$set` atomically.

### Database Work
`models/Project.ts`: `userId` (ref User), `name` (≤120), `thumbnailUrl`, `doc` (the whole editor document as one nested object), timestamps. Index `{ userId: 1, updatedAt: -1 }`.

### Important Files
`models/Project.ts`, `app/api/projects/`, `actions/projects/projectActions.ts`, `components/editor/save-button.tsx`

### Current Status
`Partially Completed` — core lifecycle complete; duplicate has an API but no UI; there is no server-side autosave for saved projects (unsaved edits in a closed tab are lost — Save is explicit).

---

## Feature: Editor Core

### Short Description
The heart of the app: a versioned document model driving five (or more) live canvas previews,
with undo/redo and automatic draft protection for guests.

### What This Feature Does
- **One document, one schema**: everything the editor edits is a single validated document (currently version 10). Old saved projects migrate forward automatically on open (a chain of migrations covers v1 → v10).
- **Undo/redo** (Ctrl/Cmd+Z, Shift+Z) tracks only document changes — clicking around, selections, and panel toggles are never undo steps.
- **Guest draft autosave**: while not attached to a saved project, every change is debounced (1.5s) into browser localStorage; closing the tab loses nothing. The draft (and the typed project name) survives registration and returns with the user.
- A corrupt/unreadable draft is dropped whole rather than half-restored.

**Work Type:** `Frontend` `State Management` `Validation`

### Frontend Work
Zustand store split into four slices (`lib/editor/slices/`): only the `document` slice is persisted/undoable. `hooks/use-project-bootstrap.ts` decides guest-vs-saved on mount and wires draft autosave.

### Important Files
`schemas/editor.ts` (the document schema — the authority on shape), `lib/editor/store.ts`, `lib/editor/persistence.ts` (drafts + migrations), `lib/editor/slices/`

### Current Status
`Completed`

---

## Feature: Screens (Filmstrip)

### Short Description
The horizontally scrolling row of screen cards — the set being designed.

### User Flow
1. All screens render live, side by side; the strip scrolls horizontally.
2. Clicking a card selects it and opens its inspector *inline, right next to it*.
3. Hover controls reorder screens; the inspector header offers rename, pin, duplicate, delete, reset, and export.
4. "+ Add screen" appends a new screen (up to 12).

### What This Feature Does
- Add (blank, styled like the current template), duplicate (copy sits next to the original; uploaded images carry over on saved URLs), delete, reorder left/right, rename.
- **Pinning**: a pinned screen is skipped by every bulk operation — apply-background-to-all, template restyle, project-wide size changes, global fonts, color replace. The opt-out for the one hand-tuned frame.
- **Reset**: puts a screen's layout back to template defaults while keeping its text and images.
- Cards are sized from the strip's height; each card carries a gutter so selection handles are never cut off at the edge.

**Work Type:** `Frontend` `UI/UX` `State Management`

### Important Files
`components/editor/screens/` (strip, card, actions), `components/editor/panels/inspector-panel.tsx`, `lib/editor/slices/document.ts`

### Current Status
`Completed` — reordering is arrow-button based (no drag-and-drop).

---

## Feature: Screen Frame

### Short Description
Per-screen styling of the exported frame itself: rounded corners (each corner independently)
and an optional per-screen canvas size.

### User Flow
1. Select a screen → open **Screen frame** in its inspector.
2. Pick a rounding preset (0/32/64/120) or set each corner (top-left, top-right, bottom-left, bottom-right) individually.
3. Optionally give this screen its own width/height — the layout rescales to follow; **Use project size** folds it back into the set.

### What This Feature Does
- Corner rounding is per screen, previewed live, and **baked into the export as transparency** (PNG/WebP; JPEG stays square since it cannot store transparency — the panel says so).
- Per-screen size breaks one frame out of the set's shared canvas. The strip then shows mixed card widths; export produces mixed dimensions; project-wide size changes skip broken-out screens (like pinned ones).

**Work Type:** `Frontend` `Validation` `State Management`

### Important Files
`components/editor/panels/screen-shape-panel.tsx`, `lib/canvas/artboard-clip.ts` (one clip shared by preview & export), `schemas/editor.ts` (`corners`, `size`)

### Current Status
`Completed`

---

## Feature: Layers

### Short Description
Each screen's content is an ordered stack of layers — device frames, text, and images — edited
directly on the canvas and through per-layer panels.

### What This Feature Does
- **Ordered stack**: bottom paints first; restack with up/down controls in the layer list.
- Shared controls on every layer: rename, show/hide, lock, opacity, delete, restack.
- **On-canvas editing**: drag to move; resize/rotate with selection handles (small dots with a large invisible grab target, dashed selection border, rotation handle). Devices keep their aspect ratio; images can be freely reframed; degenerate sizes are refused.
- Add Image/Text layers from the inspector's "+" menu; devices via the device picker.

**Work Type:** `Frontend` `State Management` `UI/UX`

### Important Files
`components/canvas/` (the only Konva territory — stage, layers, nodes, transformer), `components/editor/panels/layer-row.tsx`, `lib/canvas/transform.ts`

### Current Status
`Completed` — restacking is button-based (no drag-and-drop list).

---

## Feature: Device System

### Short Description
The phone/tablet frames: five built-in models plus custom devices authored by admins, with
orientation, colorways, and frame display modes.

### What This Feature Does
- Built-in catalog (generic Android, iPhone 15 Pro, iPhone SE 3, Pixel 8, Galaxy S24) merged at runtime with **admin-authored devices** from the database (enabled ones only).
- Per-document device model & orientation (portrait/landscape) — the whole set switches together, per-screen layers refit automatically.
- Per-layer **frame modes**: full device frame, screenshot-only, or full-bleed (edge-to-edge on the frame), plus a subtle perspective tilt option and toggleable shadow.
- Colorway (body finish) selection per device layer.

**Work Type:** `Frontend` `Backend` `Database` `Configuration`

### Important Files
`lib/devices/` (catalog, registry, orientation, geometry, custom), `components/editor/devices/device-picker-dialog.tsx`, `components/canvas/nodes/device-*.tsx`

### Current Status
`In Progress` — fully functional, but every built-in device's bezel geometry is an estimate
(`fidelity: "draft"`); tuning against real product photos is the main known gap before shipping.

---

## Feature: Screenshot Capture

### Short Description
Two ways to get an app screenshot into the device frame: upload a file, or type a website URL
and have the app screenshot it at the device's exact resolution.

### User Flow (URL capture)
1. In the device panel, enter a URL and click capture.
2. The server screenshots the site at the device's screen size (via Microlink) and streams the image back.
3. It appears in the frame immediately; it is uploaded to Cloudinary only when the project is saved.

### What This Feature Does
- File upload with client-side type/size validation; zoom & pan the screenshot inside the frame; cover/contain fit.
- URL capture works for guests (trying the tool is the point) behind a simple per-instance rate limit (6/minute).
- Captured bytes enter the same rendering pipeline as uploads — no third-party URL is ever drawn onto the canvas (prevents export-breaking canvas tainting).

**Work Type:** `Frontend` `API` `Third-Party` `File Management` `Validation`

### Important Files
`app/api/capture/route.ts`, `lib/capture/` (Microlink provider), `components/editor/panels/device-layer-panel.tsx`, `lib/canvas/image-cache.ts`

### Current Status
`Completed` — the free Microlink tier is rate-limited (~50/day per IP); a `MICROLINK_API_KEY` switches to the Pro endpoint. The in-memory rate limit is per server instance.

---

## Feature: Text System

### Short Description
Headline and supporting copy on every screen, with per-selection rich styling and
project-wide font control.

### What This Feature Does
- Two text roles (title / body) with independent styling; more text layers can be added.
- **Rich runs**: styling (color, weight, italic, underline, highlight) can apply to a *selection within* a caption, not just the whole block — with custom text layout shared exactly between preview and export.
- Font picker with self-hosted faces plus **Google Fonts** search (loaded on demand, re-awaited at export so metrics never drift); emoji picker; text shadow and background pill effects; alignment, line height, letter spacing, uppercase.
- **Global fonts** (toolbar → Globals): set the title/body font for every unpinned screen at once.

**Work Type:** `Frontend` `UI/UX` `Third-Party`

### Important Files
`components/editor/panels/text-layer-panel.tsx`, `rich-text-editor.tsx`, `components/editor/fonts/`, `lib/canvas/rich-text.ts` (all wrap/layout math), `lib/canvas/fonts.ts`, `config/fonts.ts`

### Current Status
`Completed`

---

## Feature: Image Layers & Picker

### Short Description
Free-floating images (logos, badges, doodles) placed anywhere on a screen, chosen through a
tabbed picker dialog.

### What This Feature Does
- Image layers with position/size/rotation, corner radius, opacity, fit (contain/cover/fill), vertical alignment, and a flat color tint.
- **Picker tabs**: *Upload* (drag & drop / browse / paste), *Library* (built-in doodles, arrows, badges — SVGs recolored to a chosen ink at pick time), *Your images* (every image already used in this project, offered for reuse).
- One pick pipeline for every source: local files render instantly from a local URL and upload only on save; already-uploaded URLs are reused without re-uploading.

**Work Type:** `Frontend` `File Management` `UI/UX`

### Important Files
`components/editor/images/` (picker dialog, sources, tiles), `components/editor/panels/image-layer-panel.tsx`, `hooks/use-image-pick.ts`

### Current Status
`Completed` — "Your images" is project-scoped; there is no account-wide image library.

---

## Feature: Backgrounds

### Short Description
Each screen's backdrop: none, solid color, linear gradient, radial gradient, or an image —
with one-click presets.

### User Flow
1. Select a screen → **Background** section.
2. Pick a style from the icon row (each button shows the live style, with tooltips), or open **Presets** for twelve ready-made gradient looks.
3. Tune it: colors with hex fields, gradient angle + direction flip, radial center/outer colors with from/to stop positions, or image fit/vertical position/rotation/opacity.
4. **Apply to all screens** copies it across the set (pinned screens skipped).

### What This Feature Does
- Five background types; gradients support 2+ stops; radial paints center→corners.
- Background images are chosen through the same picker as image layers (upload / library / project), and support cover/contain, top/center/bottom alignment, 90° rotations, and opacity.
- The background is *not* a layer — always behind everything, and the one thing export can hide for transparent output.

**Work Type:** `Frontend` `Validation` `UI/UX`

### Important Files
`components/editor/panels/background-panel.tsx`, `components/canvas/layers/background-layer.tsx`, `schemas/editor.ts` (background union)

### Current Status
`Completed` — the schema's image-background `blur` field exists but is not yet rendered.

---

## Feature: Color Replacer

### Short Description
Lists every color used across the set and swaps one for another everywhere in a single step.

### What This Feature Does
- Collects each distinct color with a usage count and where it appears (background, title, subtitle, highlight, shadow, pill).
- Replacing rewrites the color in every unpinned screen — including inside gradient stops and text runs. One undo step reverses the whole swap.

**Work Type:** `Frontend` `State Management`

### Important Files
`components/editor/panels/color-replacer-panel.tsx`, `lib/editor/colors.ts`

### Current Status
`Completed`

---

## Feature: Templates

*(Dedicated deep-dive: [Template System](#template-system).)*

### Short Description
Ready-made starting points. Two **built-in** templates ship with the app; any signed-in user can
**publish their own** — a full snapshot of their screens that everyone can browse and reuse.

### User Flow (publishing)
1. Edit a project → open the Save button's dropdown → **Save as new template…**
2. Fill in name, description, category, tags → **Save template**.
3. A preview thumbnail is generated automatically; the template appears immediately on `/templates` for everyone.
4. Later edits can **Update template…** (same template, new content) or save another new one.

### What This Feature Does
- Public template gallery (`/templates`) with search and pagination: built-ins + community templates (thumbnail, name, category, tags, creator, date).
- "Use this template" — guests included — opens a fresh copy in the editor.
- In-editor picker: built-ins offer *Restyle my screens* (repaint look, keep content) or *Start over*; community templates offer *Start over from this template* (they are content snapshots, not styling recipes).
- Ownership: anyone can use a template; only its creator can update or delete it (delete API exists; no UI yet).
- Content updates bump an internal `version` counter and `updatedAt`.

**Work Type:** `Frontend` `Backend` `API` `Database` `Validation` `File Management` `DataTable`

### Frontend Work
`components/editor/templates/save-template-dialog.tsx`, `save-button.tsx` (split menu), `template-gallery.tsx`, `template-picker.tsx`, `app/templates/page.tsx`.

### Backend/API Work
`actions/templates/templateActions.ts` → `app/api/templates` (public GET list / authed POST) and `/api/templates/[id]` (public GET / owner PATCH / owner DELETE). The stored document's `templateId` is rewritten server-side to the template's own `custom:<id>`.

### Database Work
`models/Template.ts` — full document snapshot + metadata; see [Database Documentation](#database-documentation).

### Current Status
`Completed` — no "my templates" management page yet (update/delete happen from the editor / API); built-in templates still use a CSS preview rather than a real image.

---

## Feature: Export & Download

### Short Description
The **Preview & Export** dialog: see every screen exactly as it will export, then download one
image or the whole set as a ZIP.

### User Flow
1. Click **Preview & Export** in the toolbar (pre-selects all screens) or a screen card's export action (pre-selects just that screen).
2. **Preview** section: every screen rendered from the real canvas, at true aspect ratio.
3. **Download** section: tick screens, choose format (PNG/JPG/WebP), scale (1×/2×/3×), quality, transparent background.
4. One selected screen → downloads a single image. Several → downloads `<project>-screenshots.zip` with files numbered in strip order.

### What This Feature Does
- Full-resolution re-render (not an upscaled preview); fonts and images are awaited before rasterizing.
- Screens export **one at a time** — a five-screen batch never holds more than one huge canvas in memory (the tablet-crash safeguard).
- Scale options that would exceed browser canvas limits are disabled with an explanation (e.g. 3× at App Store 6.9" = 32MP — correctly blocked). With mixed per-screen sizes, the guard checks every selected screen.
- Per-screen corner rounding is honored (transparent corners in PNG/WebP).
- The ZIP is built in the browser with a dependency-free writer (store-only — the images are already compressed).
- WebP is offered only when the browser can actually encode it.

**Work Type:** `Frontend` `File Management` `Performance` `UI/UX`

### Important Files
`components/editor/export/export-dialog.tsx`, `lib/export/export-stage.ts`, `lib/export/zip.ts`, `lib/export/formats.ts`, `lib/canvas/stage-registry.ts`

### Current Status
`Completed`

---

## Feature: Save-Time Thumbnails

### Short Description
Every project save and template publish renders the first screen at card size and uploads it as
the preview image shown on dashboard and template cards.

### What This Feature Does
- ~400px JPEG rendered through the same export pipeline (accurate fonts/images), uploaded to Cloudinary under a dedicated `thumbnail` folder.
- Failure never blocks the save: the record keeps (or falls back to) no thumbnail, updates never erase an existing preview, and the user gets a soft notice.

**Work Type:** `Frontend` `Integration` `File Management`

### Important Files
`lib/editor/thumbnail.ts`, `components/editor/save-button.tsx`, `components/editor/templates/save-template-dialog.tsx`

### Current Status
`Completed` — thumbnails are client-generated, so pre-existing projects gain one on their next save (no server backfill).

---

## Feature: Admin Device Manager

### Short Description
An admin-only page for authoring custom device frames that instantly join every user's device picker.

### User Flow
1. Admin (allow-listed email) opens `/admin/devices` (others get a 404).
2. A table lists custom devices alongside the read-only built-ins.
3. Create/edit via a form dialog (name, brand, category, screen resolution, bezel geometry, notch, colorways, landscape support); toggle **enabled**; delete.
4. Enabled devices appear in the editor's device picker as `custom:<id>` for all users.

**Work Type:** `Frontend` `Backend` `API` `Database` `DataTable` `Authentication` `Validation`

### Backend/API Work
`/api/admin/devices` + `/[id]` — all handlers admin-gated; list supports pagination + search; invalid rows are dropped on read rather than crashing the picker. Editor pages fetch enabled devices server-side and register them before first paint.

### Important Files
`app/(app)/admin/devices/`, `components/admin/`, `models/Device.ts`, `lib/devices/custom.ts`, `lib/devices/registry.ts`, `schemas/device.ts`

### Current Status
`Completed`

---

## Feature: Cloudinary Uploads

### Short Description
All persistent images (screenshots, image layers, backgrounds, thumbnails) are stored in
Cloudinary via signed, direct browser uploads.

### What This Feature Does
- The browser asks `POST /api/cloudinary/sign` for a signature (auth required), then uploads the file **directly** to Cloudinary with real progress — big screenshots never pass through the app server.
- Files land in per-user folders by kind: `screenshot`, `image`, `background`, `thumbnail` (a legacy `logo` kind is still readable).
- Nothing is persisted until save: the editor renders from local object URLs, and the save step uploads whatever is still local, sequentially, with per-file progress. A document cannot be saved with a non-https image URL — validation refuses it.

**Work Type:** `API` `Integration` `File Management` `Validation`

### Important Files
`app/api/cloudinary/sign/route.ts`, `lib/cloudinary.ts`, `lib/cloudinary-upload.ts`, `lib/editor/persistence.ts` (`prepareDocForSave`)

### Current Status
`Completed` — an `Asset` model + register/delete APIs exist for tracking uploads, but nothing calls them yet, so Cloudinary usage is not yet inventoried per account.

---

# Main Workflows

## Template → Project Workflow
1. User (guest or signed in) opens **/templates**.
2. Picks a built-in or community template → **Use this template**.
3. The template's document is copied into the editor as a local draft.
4. User edits screens; a guest's work autosaves to the browser.
5. User clicks **Save** (guests are routed through sign-up first; the draft survives).
6. First save creates the project under the user's account, generates a thumbnail, and navigates to `/editor/<projectId>`. Later saves update it.

## Project → New Template Workflow
1. User opens/edits any project (saved or still a draft).
2. Save button dropdown → **Save as new template…**
3. Dialog collects name, description, category, tags.
4. Local images are uploaded, a thumbnail is captured, and the template is created with a **new id**; the document now records that template as its origin.
5. The template appears immediately in `/templates` for everyone. The project itself is untouched.

## Existing Template Update Workflow
1. The open document came from a user-saved template (its origin id is a `custom:` template).
2. Save button dropdown shows **Update template…** (only then).
3. The dialog prefills the template's current details; user adjusts and confirms.
4. The **same template id** is updated — content, metadata, thumbnail, `updatedAt`, and an internal version counter. Everyone using the list sees the new version.
5. If the template was deleted or belongs to someone else, the server answers 404 and the dialog offers saving as a new template instead.

## Save Project vs. Save as New Template vs. Update Existing Template
| Action | What it writes | Id | Visible to |
|---|---|---|---|
| **Save project** | The user's own project row | Project id (new on first save) | Only the owner |
| **Save as new template** | A brand-new public template (full snapshot) | New template id | Everyone |
| **Update existing template** | The original template, in place | Same template id | Everyone |

These are independent: saving a project never touches templates, and publishing a template never
modifies the project.

## Export Workflow
1. **Preview & Export** (toolbar → whole set preselected; screen action → that screen only).
2. Review previews → switch to Download → pick screens/format/scale/quality/transparency.
3. One screen → single image file; several → ZIP. Screens render sequentially with progress.

---

# Template System

**Two kinds of template exist:**

| | Built-in templates | User-saved templates |
|---|---|---|
| Source | Shipped in code (`config/templates.ts`): *Aurora*, *Spotlight* | Database rows created by users |
| Contents | A styling **recipe** (colors, fonts, background, copy) that builds five fresh screens | A full **snapshot** of the creator's document (every screen, layer, setting) |
| "Use" behavior | Build five new screens from the recipe | Open a copy of the snapshot |
| "Restyle my screens" | ✅ Repaints look, keeps your content/uploads | ❌ Not offered (a snapshot has no recipe) |
| Preview | CSS approximation | Real generated thumbnail |
| Editable by | Developers only | Their creator (update/delete) |

**Capabilities (all implemented):** public list with server-side search + pagination · public
detail/use (guests included) · create from the editor with metadata (name, description, category
from a fixed list, up to 10 tags) · update-in-place by the owner · delete API (owner-only; no UI
button yet) · automatic thumbnail · `enabled` flag hides a template from all public reads ·
`sourceProjectId` records which project a template came from · creator shown by name
(derived from their email at publish time).

**Ownership & permissions:** reads are public; create requires sign-in; update/delete are
filtered on the creator in the database query itself and return 404 for anyone else.

**Relationships:** a document remembers the template it started from (`doc.templateId`).
Built-ins use their static ids (`aurora`, `spotlight`); saved templates use `custom:<id>`.
That marker is what makes "Update template" appear — and if the referenced template no longer
resolves, the editor falls back to default styling for new elements rather than breaking the document.

---

# Project Management

**Lifecycle:** draft (browser-only) → saved project → updated on each explicit Save → deleted
(permanent, confirmation-guarded).

- **Create** — only ever via Save in the editor; there is no empty "new project" record.
- **Open** — `/editor/<id>` (session required; foreign ids 404). The stored document is validated and migrated to the current version on open.
- **Save** — uploads any local images, regenerates the thumbnail, writes the whole document atomically.
- **Rename** — inline title in the editor top bar (saves immediately for existing projects; carried into the first save otherwise).
- **Delete** — dashboard hover control + confirmation modal; permanent.
- **Duplicate** — API implemented, UI not yet.
- **Ownership** — every query filters by the session user's id.
- **Project–template link** — see [Template System](#template-system).
- **Versioning/history** — not implemented (no snapshots or revision history; undo exists only within an open session).

---

# Editor Documentation

**What can be edited:** the screen set (add/remove/reorder/pin/reset), each screen's frame
(corner rounding, per-screen size), background, device layers (model, orientation, colorway,
frame mode, screenshot with zoom/pan, shadow, perspective), text layers (rich runs, fonts,
effects, alignment), image layers (transform, fit, tint, radius), project-wide settings
(name, artboard preset/size, global fonts, color replace, template).

**Layout:** top bar (back, save, project title, account) · toolbar (Preview & Export, template
picker, undo/redo, Globals, Setup) · the filmstrip of live canvases · the selected screen's
inspector inline beside its card (sections: Layouts & Elements, Background, Screen frame).

**Scope rule (how controls are organized):** anything that affects **one screen** lives in that
screen's inspector; anything that affects the **whole project** lives in the toolbar (Setup,
size selector, Globals, template picker).

**Save behavior:** explicit Save button (split control; see Project Management). Guests:
continuous local draft autosave. Saved projects: no background autosave — Save is the commit.

**Preview behavior:** the filmstrip *is* the live preview — the same rendering pipeline produces
the export, so what you see is what downloads (fonts and images are deliberately awaited to keep
line-breaks and bitmaps identical).

**Validation & safety:** the document is schema-validated on save (server re-validates
independently); images must finish uploading before a save can persist; canvas sizes are
range-limited (16–8000px); transform handles refuse degenerate sizes; oversized export scales
are disabled rather than silently producing blank files.

**Error handling:** failed saves/uploads/captures surface as toasts with the server's message;
a failed thumbnail or preview never blocks the underlying action.

---

# Authentication & User Management

- **Register** (`/register`): name, email, password (min 8) → account + immediate sign-in.
- **Login** (`/login`): credentials → JWT session cookie. **Logout**: user menu.
- **Session handling:** stateless JWTs; API routes read the session server-side and attach the user; the browser never supplies a user id.
- **Protected routes:** `/dashboard`, `/admin/*`, `/editor/<id>` (middleware redirect to login with return-url). **Public:** home, login, register, blank `/editor`, `/templates`, template read APIs, website capture.
- **Permission checks:** ownership is always a database filter (`userId` / `createdBy`) returning 404 for foreign ids; admin = env-var email allow-list checked per request.

**When logged in:** dashboard, saving/renaming/deleting projects, publishing/updating own templates, uploads. **When not:** full editor + templates + capture + export; Save routes through sign-up with the draft preserved.

---

# API Documentation

All routes (two deliberate exceptions noted) return one envelope:
`{ status: boolean, message: string, data?: … }` — validation failures include a
`{ field: message }` map in `data`. UI never calls these directly; server actions
(`actions/<domain>/`) wrap a shared API client that forwards the session cookie.

| API | Method | Purpose | Auth | Feature |
|---|---|---|---|---|
| `/api/auth/register` | POST | Create an account | Public | Authentication |
| `/api/auth/[...nextauth]` | * | Login/session (Auth.js) | Public | Authentication |
| `/api/projects` | GET | List own projects (page/limit/search) | User | Dashboard |
| `/api/projects` | POST | Create project | User | Projects |
| `/api/projects/[id]` | GET / PATCH / DELETE | Read / update / delete own project | User | Projects |
| `/api/projects/[id]/duplicate` | POST | Copy own project (no UI yet) | User | Projects |
| `/api/templates` | GET | List enabled templates (page/limit/search/category) | Public | Templates |
| `/api/templates` | POST | Publish a template | User | Templates |
| `/api/templates/[id]` | GET | Template detail incl. document | Public | Templates |
| `/api/templates/[id]` | PATCH / DELETE | Update / delete own template | Owner | Templates |
| `/api/cloudinary/sign` | POST | Signed upload ticket (browser-direct upload) | User | Uploads |
| `/api/capture` | POST | Screenshot a website URL (returns image bytes) | Public (rate-limited) | Capture |
| `/api/admin/devices` (+`/[id]`) | GET/POST/PATCH/DELETE | Custom device CRUD | Admin | Devices |
| `/api/assets` (+`/[id]`) | POST / DELETE | Register/delete upload records | User | *(implemented, currently unused)* |

### Create Template — `POST /api/templates`
**Input:** `name` (1–120), `description` (≤500, optional), `category` (one of general/minimal/bold/colorful/dark/playful), `tags` (≤10 strings), `doc` (a full valid editor document), `thumbnailUrl` (https or null), `sourceProjectId` (optional).
**Output:** `{ id, templateId }` — `templateId` is the `custom:<id>` marker stamped into the stored document.
**Behavior:** creator and display name are taken from the session; the document's origin id is rewritten server-side so clients cannot forge it.

### Update Template — `PATCH /api/templates/[id]`
**Input:** any subset of the create fields. Empty body → 400. If `doc` is included, its origin id is re-stamped and the template's version counter increments.
**Auth:** matches only `{ _id, createdBy: session user }` — anyone else gets 404.

### List Projects — `GET /api/projects?page&limit&search`
Returns `{ docs: [{ id, name, thumbnailUrl, updatedAt }], totalDocs, page, limit, pages, hasNext, hasPrev }`.
Search is a safe (escaped) case-insensitive name match. The editor document is never included in lists.

### Capture — `POST /api/capture`
**Input:** `{ url, deviceId?, orientation? }` → validated, sized to the device's screen.
**Output:** raw image bytes on success (`image/*`); the standard JSON envelope for errors (invalid URL, rate limit, provider failure). One of the two envelope exceptions, by design.

---

# Database Documentation

MongoDB via Mongoose. Indexes are built by `pnpm sync-indexes` (auto-indexing is off in
production). All models use timestamps.

## User (`models/User.ts`)
| Field | Type | Required | Description |
|---|---|---|---|
| name | String | – | Display name |
| email | String | ✅ unique | Login identifier |
| password | String (select: false) | – | bcrypt hash; hidden from queries by default |

Shared with the Auth.js adapter — code must select fields explicitly and never bulk-spread user documents.

## Project (`models/Project.ts`)
| Field | Type | Required | Description |
|---|---|---|---|
| userId | ObjectId → User | ✅ | Owner; every query filters on it |
| name | String ≤120 | ✅ | Project title |
| thumbnailUrl | String \| null | – | Dashboard preview (Cloudinary) |
| doc | Mixed | ✅ | The entire editor document (schema-validated before write; versioned v1–v10 with forward migrations) |

Index: `{ userId: 1, updatedAt: -1 }` (dashboard list).

## Template (`models/Template.ts`)
| Field | Type | Required | Description |
|---|---|---|---|
| name / description / category / tags | String / String / String / [String] | name ✅ | Card metadata |
| thumbnailUrl | String \| null | – | Generated preview |
| doc | Mixed | ✅ | Full document snapshot; its `templateId` = `custom:<own id>` |
| createdBy | ObjectId → User | ✅ | Owner (write filter) |
| creatorName | String | – | Denormalized display label |
| sourceProjectId / sourceTemplateId | ObjectId \| null | – | Provenance |
| enabled | Boolean (default true) | ✅ | Public visibility switch |
| version | Number (default 1) | ✅ | Increments on content updates |

Indexes: `{ enabled: 1, updatedAt: -1 }` (public list), `{ createdBy: 1, updatedAt: -1 }` (ownership).

## Device (`models/Device.ts`)
Admin-authored frame spec: name, brand, category, screenshot resolution, scale factor, bezel,
body/screen corner radii, notch (kind/size/offsets), landscape support, colorways
(label + body fill), `enabled`. Global rows (no owner — admin-gated instead). Index `{ enabled: 1 }`.

## Asset (`models/Asset.ts`)
Cloudinary upload metadata (owner, kind, publicId unique, URL, dimensions, bytes, format).
**Implemented but not yet written to by the app.**

**Editor document versioning:** the nested `doc` carries its own `version` (currently **10**);
opening any older document runs an ordered migration chain, so nothing saved since v1 is lost.

---

# DataTable / List Documentation

| List | Data | API | Mode | Pagination | Search | States |
|---|---|---|---|---|---|---|
| Dashboard projects | Own projects | `GET /api/projects` | **Server-side** | 24/page, prev/next | API supports it; no UI input yet | Loading (server-rendered), empty state, error message |
| Template gallery (`/templates`) | Built-ins + community templates | `GET /api/templates` | **Server-side** | 24/page, prev/next, URL-driven | ✅ search box (`?q=`) | Empty-search message |
| In-editor template picker | Community templates (page 1) | `GET /api/templates` | Server data, fetched on open | First 24 | – | Loading spinner, hidden when empty |
| Admin devices | Custom devices + built-ins | `GET /api/admin/devices` | **Server-side** | Yes (high default limit) | ✅ | Refreshes after each mutation |

No client-side data grids; sorting is fixed (newest first) everywhere.

---

# File & Image Management

- **Upload targets:** device screenshots, image layers, background images, generated thumbnails.
- **Storage:** Cloudinary, per-user folders per kind; signed direct uploads (progress-capable XHR); the app server never proxies file bytes.
- **Local-first:** dropped files render immediately from browser-local URLs; upload happens at save, sequentially, with progress. Replacing an image releases the old local URL (no memory leaks).
- **Validation:** images only, size-capped client-side with clear messages; persisted URLs must be https (enforced by the document schema — a save cannot sneak a dead local URL into the database).
- **Thumbnails:** generated (~400px JPEG) on project save / template publish; failure is non-blocking.
- **Delete behavior:** deleting a project/template deletes the record, **not** the Cloudinary files (no asset inventory yet — see Asset model note). The asset-delete API (which does remove the Cloudinary file) exists but is unused.
- **Export files:** produced entirely in the browser (single image or ZIP); nothing export-related is uploaded.

---

# Third-Party Integrations

| Integration | Purpose | Where | Auth | Status |
|---|---|---|---|---|
| **MongoDB** | All persistent data | `lib/db.ts`, models | `MONGODB_URI` | ✅ In use |
| **Auth.js (NextAuth) + MongoDB adapter** | Accounts & sessions | `auth.ts`, `auth.config.ts`, `proxy.ts` | `AUTH_SECRET` | ✅ In use |
| **Cloudinary** | Image storage (signed direct uploads) | `lib/cloudinary*.ts`, sign route | Cloud name + API key/secret | ✅ In use |
| **Microlink** | Website → screenshot capture | `lib/capture/microlink.ts`, capture route | Optional `MICROLINK_API_KEY` (free tier without) | ✅ In use |
| **Google Fonts** | On-demand font families in the editor & exports | `lib/canvas/google-fonts.ts`, font picker | None | ✅ In use |

Environment configuration is validated at startup (`config/env.ts`) — a missing variable fails
fast with a clear message instead of a runtime mystery.

---

# Validation & Error Handling

- **One request pipeline:** every API route runs through a shared handler that owns DB connection, session guard, zod body validation, and error → response mapping. Handlers contain no try/catch of their own.
- **Error mapping:** validation → 400 with per-field messages · not signed in → 401 (the server-side client then signs out and redirects) · non-admin on admin routes → 403 · missing/foreign records → 404 (never 403, so ids can't be probed) · duplicates → 409 · unexpected → 500 (details hidden in production).
- **Form validation:** shared zod schemas between client forms and API (auth forms, template metadata, device authoring); numeric inputs clamp to ranges and never fight the person typing.
- **Document safety:** the editor document validates against its schema on both save and load; unreadable drafts are dropped whole; version migrations run automatically.
- **UI states:** toasts for every failed/successful mutation; loading spinners on async buttons; empty states on dashboard/gallery/picker; destructive actions (project delete) require a confirmation modal; busy dialogs block closing mid-operation.
- **Canvas guards:** export scale limits, minimum transform sizes, WebP feature detection, capture rate limiting.

---

# Keeping This Document Alive

This file is a **living document**. For any future change:

**When adding a feature:** add a Feature Index row → write its feature section (same structure) →
add/extend workflows → add API rows + detail if applicable → add database changes → set Work Type
and Status → add a Change History entry.

**When modifying a feature:** update its section, workflows, API/database entries, status —
and add a Change History entry.

**When removing a feature:** delete/mark its sections and record the removal in Change History.

Statuses must stay honest: nothing is `Completed` while a visible part of it is missing.
Do not document intentions — only shipped behavior. Keep descriptions readable by
non-developers; keep file paths accurate for developers.

---

# Change History

| Date | Feature | Change | Type | Status |
|---|---|---|---|---|
| 2026-08-16 | Foundation | Project setup: Next.js 16, Auth.js, Cloudinary, Konva canvas | Full Stack | Completed |
| 2026-08-17 | Editor | Multi-screen sets, ordered layers, rich text runs, image layers/picker, exports, fonts | Frontend | Completed |
| 2026-08-18 | Devices | Frame modes, device picker, admin-authored devices (doc v7) | Full Stack | Completed |
| 2026-08-18 | Projects | Project naming (inline title) | Full Stack | Completed |
| 2026-08-18 | Backend | REST API layer: routes + shared API client + thin actions, one response envelope | Backend | Completed |
| 2026-08-19 | Editor | Selection handle restyle + selection-chrome gutter (handles no longer clipped) | Frontend | Completed |
| 2026-08-19 | Templates | **Save as New Template / Update Existing Template**, public template list, doc v8 | Full Stack | Completed |
| 2026-08-19 | Projects | Save-time preview thumbnails for projects & templates | Frontend + Integration | Completed |
| 2026-08-19 | Projects | Project delete with confirmation modal | Full Stack | Completed |
| 2026-08-19 | Export | Preview & Export dialog: all-screen preview + batch ZIP download | Frontend | Completed |
| 2026-08-19 | Backgrounds | Radial gradients, presets, picker-backed background images, image align/rotation (doc v9) | Frontend | Completed |
| 2026-08-19 | Screens | Per-screen frame: corner rounding + per-screen size (doc v10) | Frontend | Completed |
| 2026-08-19 | Documentation | Created `PROJECT-DOCUMENTATION.md` as the living project documentation | Documentation | Completed |
