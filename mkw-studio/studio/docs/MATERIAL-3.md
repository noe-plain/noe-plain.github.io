# Material 3 migration – compatibility inventory

The first milestone establishes UI-only colour roles, adjustable tool colour, shared shape/focus/motion tokens and the settings/inspector pilot. It is not a completed component-by-component redesign. Keep the established renderer and document model unchanged through the remaining milestones.

## Ownership

- `ui-colour-model.js`: pure, gamut-mapped OKLab colour derivation and WCAG contrast calculation. These are custom Material-role palettes, not a claim to reproduce Google's HCT implementation. No dependency or runtime network request is introduced.
- `build/ui-theme.mjs`: generates light/dark fallback CSS from that same model before asset URLs are versioned. Do not manually change `ui-theme-tokens.css`.
- `ui-theme.css`: shared UI role aliases and design tokens. It owns colour aliases that were previously repeated in several stylesheets.
- `ui-theme.js`: applies one palette per seed/theme change, synchronizes the settings preview and persists only tool preferences. It never calls `changed`, `checkpoint`, `draw`, `render`, or autosave. A brief transition guard prevents light-mode button colours from fading over newly dark surfaces.
- `appearance.js`: existing appearance/preferences integration, including setup application. `settings-ui.js` creates the new field in the existing Appearance card.
- Component CSS retains its existing geometry and event targets; colour literals are replaced at those owning rules. `appearance.css` and its unused inversion generator have been retired rather than adding another colour override layer.
- `help-popup.js`: copies UI roles into the existing handbook iframe after it is opened. No handbook iframe or resource is requested at startup.

`primaryColour` is optional on incoming settings. Older setups receive `#315bcc`. It travels with MKW-Setup, never with an MKW artwork document. The selected seed stays exact in the picker; the readable action/selection tones are derived separately. Guide and snapping colours remain independent.

## Function/access/test matrix

| Function | Entry and existing owner | Regression suites |
|---|---|---|
| FD-Kampagnen / Designer selection | Setup mode buttons; `start.js`, `carousel-bootstrap.js` | `editor-forms`, `designer-layout`, `carousel-limits` |
| Formats and all four safe zones | Setup/format inspector; `project-formats.js`, `post-safezone.js`, `carousel-slide-format.js` | `post-safezones`, `designer-layout` |
| Templates, layer filling and live slide preview | Designer setup/gallery; `template-*.js` | `templates`, `template-library` |
| Import and 50-image project | Image picker/import flow; `state.js`, project services | `large-project-frames`, `project-open`, `asset-cache` |
| Browser library, five-project retention, conflicts | Open/save; `project-store.js`, `project-session.js` | `project-storage`, `project-migration`, `project-retention` |
| MKW save, incremental linked-file writes, compaction | Save dialog/native session; project/file services | `native-incremental-save`, `large-project-frames` |
| Tool settings/setup portability and rollback | Header settings; `settings-ui.js`, `setup-*.js` | `setup-file`, `designer-layout`, `ui-colour-model.test.js` |
| Light/dark, primary colour, reset, singleton picker | Settings → General; `appearance.js`, `ui-theme.js` | `material-ui`, `appearance-carousel-psd`, `paint-position` |
| Imported fonts and removal | Settings → Fonts; `user-fonts.js` | `user-fonts`, `setup-file` |
| Grid, guides, snap, sidebar, zoom and shortcuts | Existing footer/tool pills; workspace services | `workspace-ui`, `designer-layout`, `carousel-alignment` |
| FD image cards, options, copy/reorder/add | Left image cards; `post-workspace.js`, inspector | `post-workspace`, `sponsors-help`, `post-angle` |
| Photos, custom frame points, crop/flip | Selection/content gestures and inspector | `carousel-frames-text`, `paint-paths`, `large-project-frames` |
| Angles, movement constraints, independent photo | Existing angle tool/options and gestures | `post-angle`, `angle-axis`, `carousel-alignment` |
| Simple/advanced text, paragraph/character scope | Text selection/inspector; typography services | `advanced-typography`, `post-text-size-scope`, `carousel-text-alignment` |
| Justification, Swiss hyphenation, stable direct input | Existing text panels/direct editing | `text-justification`, `text-hyphenation`, `inline-fidelity` |
| Text stack, upper/lower/copyright and family design | FD text/options panels; layout services | `post-text-stack`, `sponsors-help`, `inline-fidelity` |
| Sponsors, groups, order, weighting and polarity | Options/sponsor tool/settings | `sponsors-help`, `sponsor-auto` |
| Paths, nodes, closure/continuation/join | Advanced left pill and node gestures | `advanced-tools`, `path-continuation`, `path-bounds` |
| Shape constructor and path paints | Advanced tools; vector/paint services | `paint-paths`, `paint-rendering`, `advanced-tools` |
| Curvature diagnostics, selected handles and undo | Advanced tool/footer | `carousel-refinements`, `advanced-tools` |
| Layers/folders, order, locks/visibility and FX | Layer tree/actions/popups | `carousel-refinements`, `carousel-photo-effects` |
| Colour/gradient/image paint, alpha/stops/midpoints | Existing singleton picker | `paint-rendering`, `paint-paths`, `paint-position` |
| Export preview and image selection | Existing export dialog | `editor-forms`, `carousel-export-images`, `material-ui` |
| JPG/PNG/PNG-8/WebP, alpha and compression | Existing export settings | `editor-forms`, `carousel-export-images`, `render-export` |
| PDF presets and separate pages | Existing PDF settings/export | `carousel-pdf`, `carousel-limits` |
| PSD, editable layers and slide slices | Save/export | `appearance-carousel-psd`, `render-export` |
| Warnings, progress and save errors | Footer/export/status notices | `workspace-ui`, `large-project-frames`, `carousel-photo-effects` |
| Lazy handbook, navigation and responsive windows | Header help/settings | `dialog-layout`, `sponsors-help`, `material-ui`, `wiki.test.js` |
| Paint/layout caching, coalesced pointer work | Existing renderer/input services | `interactive-performance`, `render-export`, `asset-cache` |

## Appearance and performance evidence

`material-ui` captures representative fixtures in both editors, compares exported pixels through theme/seed changes, checks project values/revision/undo, actual rendered control contrast, the shared modal picker, reset, reload and handbook colours. `MKW_MATERIAL_BASELINE=1` captures the previous build's export hashes; `MKW_MATERIAL_REFERENCE=/absolute/path/material-export-baseline.json` compares a migration against those hashes in the same browser. Do not compare font rasterization across browser engines.

The first milestone's Firefox reference is `/private/tmp/mkw-material-before/material-export-baseline.json` in the development session. The normal suite remains self-contained in CI: it compares before/after preference changes on the same loaded fixture. The 50-image and interaction suites retain their existing checks. Palette changes do not request another artwork paint. Theme roles stay outside source image, sponsor, typography, effects, document serialization and export code.

## Remaining migration

1. Consolidate repeated control definitions into their owning component files, including segmented choices, native sliders, compact menus and states. Remove superseded rules as each component migrates; do not add a final override sheet.
2. Complete a typography/spacing pass for both inspectors, FD options/cards and Designer layers/FX. Preserve compact desktop dimensions, accessible icon labels and simple/advanced placement.
3. Apply the same component rules to start/setup, templates/library, save/export and handbook. Review all selected/hover/focus/error states in light/dark and narrow layouts. Keep lazy loading.
4. Finish the full screenshot/accessibility/performance review and repeat Firefox/Chrome, export fidelity and publication checks. No feature is to be removed to accommodate the new design.
