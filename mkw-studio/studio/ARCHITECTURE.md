# MKW Studio engineering boundaries

The application runs on static GitHub Pages. Runtime assets are bundled and committed; users install nothing and no project content is sent to a server. The optional Python server only adds image conversion (including TIFF/EXIF).

## Source and release

`build/editor-manifest.json` defines first-party module and stylesheet order. `npm run build` creates `static/editor.bundle.js`, its source map and `static/editor.bundle.css`, then versions runtime URLs by content. Vendor libraries are separate local files. Do not edit generated bundles. Source files are formatted with Prettier; the legacy editor globals remain a compatibility boundary inside the browser, rather than pretending these are independent ES modules.

## Ownership

| Module | Responsibility |
| --- | --- |
| `project-assets.js` | Pure portable-file compaction, reference traversal and hydration. No UI, disk access or editor mutation. |
| `project-store.js` | IndexedDB transactions, project versions, conflict forks, shared binary assets, garbage collection, persistent file handles. No editor globals/UI. |
| `project-session.js` | Session identity, queued saves, file permission and external-change checks, project library. |
| `file-io.js` | Native file chooser and atomic stream writes. Never download from autosave. |
| `state.js` | Single-post model, history, bounded decoded-image cache, font-face reuse, image import. |
| `image-preview.js` | Bounded screen-only rasters for large photos; reference pruning. Never used by exports or persisted. |
| `bezier.js` | Pure analytical curve extrema and tight path bounds; no handles in selection boxes. |
| `carousel.js` | Carousel document defaults, validation, creation and selection model. |
| `carousel-render.js` | Viewport/canvas and overlays. One async paint at a time, reusable buffer, generation cancellation. |
| `carousel-input.js` | Pointer movement, resizing and shared snapping. |
| `carousel-transform.js` | Origin-based rotation, tight local/world bounds, rotation handles and constrained Shift snapping. |
| `carousel-folder-order.js` | Pure root-block ordering, empty-folder anchors and folder drag/drop binding. |
| `carousel-refinements.js` | Folder metadata, inherited locks/visibility, effect inspector and custom carousel logos. |
| `carousel-layer-effects.js`, `carousel-layer-actions.js` | Layer tree, FX chooser and pop-up editor, per-effect visibility, action menus and explicit folder deletion choices. |
| `carousel-effects.js` | Bounded, non-persistent local effect rasters; deterministic monochrome noise and Gaussian blur. |
| `carousel-typography.js`, `carousel-curvature.js` | Non-destructive case/script runs, source character offsets and view-only curvature comb. |
| `carousel-text.js` | Text layout, paragraphs, leading, direct editing and typography UI. |
| `carousel-geometry.js` | Angle bleed, image masks/crops, frame points. |
| `carousel-sidebar.js` | Properties and layer-list UI. |
| `carousel-slides.js` | Slide creation/removal/reordering. |
| `carousel-bootstrap.js` | Carousel event registration and setup integration. |
| `carousel-vectors.js`, `carousel-curves.js`, `carousel-constructor.js` | Bézier model and drawing, curve editing and boolean construction. |
| `paint-model.js`, `paint-picker.js` | Paint interpretation/validation and picker UI. |
| `appearance.js`, `settings-ui.js`, `user-fonts.js` | Device/tool preferences and user font library. Existing design objects must not change when a default changes. |
| `export.js`, `carousel-pdf.js`, `carousel-psd*.js` | Export sessions, image encoding, PDF and PSD. Export options are not project defaults. |

## Persistence contract

A document has a stable `projectId`. A browser record has a monotonically increasing `version`. Saves compare the loaded version inside the same read/write transaction. A stale writer gets a new conflict-copy identity and no disk-file link. New projects do not replace previous records. Opening a project and its referenced blobs uses one read transaction, so garbage collection cannot race with reads.

IndexedDB stores image/font/logo bytes once by SHA-256; project records contain references. Saving/deleting a project collects assets unused across **all** records. Undo history and clipboard are session-only and do not enter portable files. Deleting a live object prunes unused live images; undo/clipboard retain what they need separately. Hidden objects still own their assets. MKW JSON remains version 1 with `assetFormat: 2`; old files remain readable. Only one full-resolution normalized lossless PNG is written per used image, not an additional raw input copy. Used fonts are portable; the device font library stays outside the document.

A linked local file is updated only after a successful browser save and version check. File handles are not exported. Permission is requested only during a user action; autosave only checks existing permission. External size/mtime changes block disk writes. `navigator.locks` serializes participating tabs. Browsers without file access use browser autosave plus explicitly initiated downloads; silent overwrites are impossible there.

## Path transform geometry

Stored path frames still define the coordinate system for control points and paints. Selection, sizing fields, snapping and group transforms derive tight geometric bounds with exact cubic extrema. Keeping these separate preserves existing paths and image/gradient fills when opening old projects. Do not replace the stored frame with control-handle extents or re-normalize it on selection.

## Text alignment

Carousel text has a `textAlign` default (`left`, `center`, `right`) and optional per-paragraph `textStyles[].align` overrides. Old documents omit both and remain left aligned. The text layout owns each line's measured width and left origin; canvas, inline editing, PDF selection text and PSD use that same origin. New paragraphs inherit size and alignment, not custom leading. Justification is deliberately not accepted yet: it will need word-space distribution in this shared layout, including correct paragraph-final-line behaviour, rather than a fourth alignment offset.

## Export fidelity

All image, PDF and PSD export canvases are created with `exportContext` (sRGB, `willReadFrequently: true`) before their first drawing operation. Firefox's accelerated canvas readback can silently omit large photos even when the editor renders them correctly; the export context uses the CPU readback path. Photo loading validates successful load and nonzero intrinsic dimensions, and per-slide rendering skips photo frames outside that slide (including custom frame vertices). Original image data and resolution stay unchanged. Temporary image/PDF canvases are released even on encoding or decoding failure.

Canvas previews and image downloads share encoded bytes. PDFs use pdf-lib/fontkit: the rendered page preserves the artwork and an invisible embedded-font text layer enables search/selection. This is not an editable vector PDF. PSD preserves editable text, slide slices and native solid-fill/stroke Bézier paths. Complex image/gradient path paints retain exact raster appearance plus a disabled editable vector mask, labelled in the layer name. Photoshop behaviour and font substitution cannot be validated by the ag-psd round trip alone.

## Validation

`npm test` checks naming, calendar dates, layout, palette, asset references. `npm run test:browser` serves the committed production build on an ephemeral port and runs isolated Chromium suites. `CHROME_PATH` optionally selects a browser; macOS can use installed Chrome, CI installs Playwright Chromium. `MKW_TEST_OUTPUT` selects screenshot/export output. CI runs unit, formatting, reproducible-build and browser checks on pushes/PRs touching the app. Existing legacy Python/Photoshop scripts remain separate manual checks.

## Interactive performance

Single-post previews paint only visible boards plus a 200 px scroll-ahead margin. Their cache keys include document revision, board geometry, view resolution, edit state and loaded fonts; scrolling schedules newly visible work. Exports always render full resolution independently. Carousel pointer bursts are coalesced per animation frame, with the final queued position flushed before release and discarded on cancellation.

The start screen reads only the last project record, not its image blobs. Full assets are loaded when continuing. Linked-file version checks also read metadata only. Autosave captures a model snapshot with shared immutable asset objects; the persistence boundary compacts it and reuses unchanged asset hashes through weak references. Neither original input duplicates nor undo history are persisted.

Large photos have a separate 128 MiB LRU of screen-only rasters with a maximum 2048 px edge. Both editor renderers, including image paints on vectors and gradients, use this loader. Geometry and image patterns still use original image coordinates. Export entry points retain the full-resolution loader. Deleted assets and project switches prune preview references, without resetting canvases still used by an in-flight paint. The warnings UI is rebuilt only when its content or its host button changes; text measurement reuses a dedicated context.

## Carousel rotations, folders and effects

`angle` rotates an object around its stored local origin; the rotation handle compensates its origin to rotate around the visible selection centre. Exact cubic extrema determine world bounds, while the single-object frame follows tight local bounds and rotates with the object. Geometry caches use weak object keys and exclude translations. Shift move snapping adjusts distance on the constrained 45-degree ray; Ctrl/Command temporarily bypass snapping. Rotation snapping uses 15-degree steps.

Folders are optional document metadata in `carousel.folders`; members refer to a `folderId` and remain ordinary asset-bearing objects in the flat paint order. Folder members stay contiguous. Folder visibility/locking is inherited rather than rewriting each member. Protected logos stay at the top and outside folders. PSD emits matching groups. A custom carousel logo uses the existing `logos` collection and reference traversal; unused replacements are removed from browser/MKW saves. New brand logos are 600 px wide, constrained only if the available safe area is narrower. Existing dimensions remain intact.

`effects` stores only blur/noise parameters. Local raster caching excludes position, rotation and opacity; a 64 MiB LRU is pruned on deletion and project switches. Large one-off rasters are not retained. Preview raster resolution follows view scale; exports use original resolution. Monochrome noise uses a deterministic object-ID seed, preserves alpha and applies the same luminance delta to RGB. PNG/JPG/WebP/PDF and PSD composites use the shared renderer. PSD effect layers preserve exact raster appearance; text without effects remains editable, and effect text keeps an additional hidden editable copy.

`uppercase` affects display only. Optional `script` and source-indexed `characterStyles` support superscript without rewriting `text`. Wrapping, canvas, inline editing, PDF selection text and PSD share measured runs. Text edits shift style ranges; undo retains them. Curvature-comb visibility is a device preference, not document content; its SVG overlay never reaches an export. Removed device-library fonts stay embedded in documents that still use them, under a separate project-font option group.

Typography layout is weakly cached per source object, keyed by text, font metrics, wrap width, paragraph/character settings and loaded font status. Position/opacity changes reuse it. Plain text and whole-frame superscript measure one run directly; mixed script splits at style boundaries, never loops over every character for every width query.

The FX button adds effects to selected, unlocked layers. Effect rows live inside the layer card; `blurEnabled` / `noiseEnabled` default to true for old documents, and disabling them preserves strengths without changing layer visibility. Source parameters, not generated rasters, are saved. Superscript shifts a measured font baseline by 30% of the original size; the smaller glyph is 65% of that size. Baseline and text-layout caches account for font readiness.

Layer cards keep the selection, visibility and lock controls immediately available, with additional actions in a menu. Folders offer cancel / retain content / delete content; deletion remains undoable and follows asset pruning. The curvature toggle stays available throughout advanced carousel editing, while its comb/band is limited to selected paths. Analytical curvature includes segment endpoints and a shared display scale, so tangent-continuous curvature jumps remain visible. This is a diagnostic display, not automatic G2 handle snapping. Reference behaviour: https://www.affinity.studio/blog/blend-tool-mask-tool-3d-model-support .

Folder `colour` is optional hexadecimal document metadata, assigned automatically from the least-used palette colours. Existing folders without a label receive one when their layer tree is first shown; opening old files remains supported. Colours are stored on folders, so member moves and deletion cannot shift the labels of other folders. Folder headers, member cards and effect branches share the colour; artwork rendering never uses it.

Shift+W shares the footer grid/safe-zone toggle in both editors. The shared capture listener precedes the carousel plain-W angle shortcut, ignores repeats, text entry, open dialogs/popovers and command modifiers, and never changes document content.

Folder drag/drop reorders whole root blocks; children retain their internal paint order and coordinates. Empty folders store an optional `before` root key, resolved without recursion or invalid-anchor loops, so their visual position can survive MKW saves even without paint objects. Receiving the first member restores the empty folder position. Protected logos remain above all blocks; locked folders or locked members cannot be reordered.

Photo-frame effects process the unmasked image, then reapply the original crop polygon (including angle frames). Gaussian blur clamps source edge samples and final output remains inside the real image footprint; it cannot manufacture coverage for an undersized or displaced photo. Angle glow is composited separately from photo effects. Coverage warnings compare frame vertices against the image footprint in local coordinates, without pixel readbacks; intentional PNG transparency is not treated as missing coverage. These warnings remain editor-only.
