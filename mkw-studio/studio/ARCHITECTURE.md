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
| `bezier.js` | Pure analytical curve extrema and tight path bounds; no handles in selection boxes. |
| `carousel.js` | Carousel document defaults, validation, creation and selection model. |
| `carousel-render.js` | Viewport/canvas and overlays. One async paint at a time, reusable buffer, generation cancellation. |
| `carousel-input.js` | Pointer movement, resizing and shared snapping. |
| `carousel-text.js` | Text layout, paragraphs, leading, direct editing and typography UI. |
| `carousel-geometry.js` | Angle bleed, image masks/crops, frame points. |
| `carousel-sidebar.js` | Properties and layer-list UI. |
| `carousel-slides.js` | Slide creation/removal/reordering. |
| `carousel-bootstrap.js` | Carousel event registration and setup integration. |
| `carousel-vectors.js`, `carousel-curves.js`, `carousel-constructor.js` | Bézier model and drawing, curve editing and boolean construction. |
| `paint-model.js`, `paint-picker.js` | Paint interpretation/validation and picker UI. |
| `batch-data.js` | Pure CSV/JSON parsing, field mapping and template expansion. |
| `batch-import.js` | Preview, image matching, independent series projects and ZIP production. |
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

Canvas previews and image downloads share encoded bytes. PDFs use pdf-lib/fontkit: the rendered page preserves the artwork and an invisible embedded-font text layer enables search/selection. This is not an editable vector PDF. PSD preserves editable text, slide slices and native solid-fill/stroke Bézier paths. Complex image/gradient path paints retain exact raster appearance plus a disabled editable vector mask, labelled in the layer name. Photoshop behaviour and font substitution cannot be validated by the ag-psd round trip alone.

## Validation

`npm test` checks naming, calendar dates, layout, palette, asset references and CSV/template expansion. `npm run test:browser` serves the committed production build on an ephemeral port and runs isolated Chromium suites. `CHROME_PATH` optionally selects a browser; macOS can use installed Chrome, CI installs Playwright Chromium. `MKW_TEST_OUTPUT` selects screenshot/export output. CI runs unit, formatting, reproducible-build and browser checks on pushes/PRs touching the app. Existing legacy Python/Photoshop scripts remain separate manual checks.
