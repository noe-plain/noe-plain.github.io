# Material 3 migration – compatibility inventory

Two milestones now establish UI-only colour roles, adjustable tool colour, shared control/motion tokens, native switches/sliders, non-blocking plain tooltips, press feedback and an optional compact input density. This is not a completed component-by-component redesign. Keep the established renderer and document model unchanged through the remaining milestones.

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

## Shared controls: second milestone

`controls.css` owns base buttons, icon-button alignment, native setting switches, native slider tracks, keyboard focus, plain tooltips and transient press feedback. Superseded global light/dark button rules were removed from `style.css` and `light-theme.css`; component-owned specialised geometry stays in its component. `ui-controls.js` delegates feedback without taking over click, drag, keyboard or selection handlers. It has no renderer/document imports and does not use a continuously running frame loop. The short-lived ripple uses two non-interactive custom elements; completed/cancelled animations release them. It never adds press effects to canvas nodes, transform handles, gradient stop handles or actual paint wells.

`density` is a validated tool preference (`comfortable` / `compact`), defaulting to comfortable for old setups. It changes inspector/settings input dimensions through shared tokens; it never resizes the artwork, task window, footer or tool rail. It is stored in browser preferences and MKW-Setup only. Settings → General → Bedienelemente is the existing Appearance card's opt-in compact choice. Native checkbox-based switches retain labels, focus, Space-key behaviour and immediate setting application. Related multi-selection options remain checkboxes.

Range decoration preserves native HTML range semantics and existing input handlers. A small child-list observer watches fixed UI containers only; Designer sidebar replacement explicitly disconnects the previous observer and attaches the new one via `MKWUIControls.designer`. No observer watches artwork, selection overlays, style attributes or pointer coordinates. Range percentages are updated on insertion, number/range edits, preset clicks and opening popovers. The colour picker's vertical alpha gradient is excluded because that track represents actual artwork colour/alpha rather than a generic numeric scale.

A single lazy plain tooltip describes icon-only actions, preserves existing `aria-describedby` IDs, fits the viewport and disappears on pointer exit, keypress, scroll or focus loss. It is hosted inside its modal/popover owner, without becoming a modal or popover itself; tooltip visibility must never prevent editor shortcuts. The handbook remains entirely lazy.

### Material reference decisions (reviewed 22 October 2026)

| Element | Official guidance | Studio application |
|---|---|---|
| [Buttons](https://m3.material.io/components/buttons/guidelines) | Prioritise actions with filled/tonal/outlined styles; lead horizontal labels with icons. | Primary actions retain their emphasis. Setup file actions and light/dark choices use horizontal icon/label groups. |
| [Icon buttons](https://m3.material.io/components/icon-buttons/guidelines) | Small default size 40; describe icon-only actions; give selection a cue beyond colour. | Centred 24px base icons, accessible tooltips, rounded/squarer selected shapes. Dense footer/canvas controls keep their purpose-specific dimensions. |
| [Text fields](https://m3.material.io/components/text-fields/guidelines) | Keep labels visible; do not force dense fields on everyone. | Existing labels and units remain. Comfortable 48px inspector/settings inputs and an explicit compact choice replace fixed small fields in migrated owners. Inline artwork typography is excluded. |
| [Switches](https://m3.material.io/components/switch/guidelines) | Standalone immediate settings, inline label, larger selected thumb. | Advanced mode and linked-file autosave use native accessible 52×32 switches. |
| [Sliders](https://m3.material.io/components/sliders/guidelines) | Active/inactive track, immediate values, keyboard operation; XS track 16px. | Native ranges retain their measured values and handlers; track/vertical thumb updated. Existing numeric readouts replace redundant floating value labels. |
| [Button groups](https://m3.material.io/components/button-groups/guidelines) | Connected choices can change selected shape without shifting neighbouring widths. | Appearance/density choices keep equal widths and use both shape and colour. Creative tool pills keep their positions and add a selected shape cue. |
| [Plain tooltips](https://m3.material.io/components/tooltips/guidelines) | Concise labels, one at a time, 4px separation, viewport repositioning. | One lazy tooltip above the action, below header actions, with retained native accessible labels and delayed pointer dismissal. Essential information remains visible elsewhere. |
| [Dialogs](https://m3.material.io/components/dialogs/guidelines) and [menus](https://m3.material.io/components/menus/guidelines) | Focused tasks and short, purposeful transitions. | Existing modal/native focus and dismissal remain. Opening fades do not transform or resize the dialog/picker. Full menu/list redesign remains a subsequent component pass. |
| [Motion](https://m3.material.io/styles/motion/overview/specs) | Separate spatial movement and non-overshooting colour/opacity effects. Standard scheme suits utility workflows. | Official web conversions: fast standard spatial `(.27,1.06,.18,1)` / 350ms; fast effects `(.31,.94,.34,1)` / 150ms, default dialog effects `(.34,.8,.34,1)` / 200ms. This is CSS/web feedback, not a claim to implement a gesture-driven spring engine. |

New effects respect `prefers-reduced-motion`, including cancellation of an in-flight press animation. Nothing delays drawing, typing, selection or a click handler. Native close/Escape is immediate. No framework, network asset, account or runtime dependency was added.

`material-controls` checks actual input sizes, keyboard switches, selected shape, accessible tooltip relationships, reduced motion, press cleanup, native range/model synchronization, narrow light/dark dialogs, persistence, lazy help and unchanged document/revision/undo/export pixels. `setup-file` now round-trips non-default compact density. The previous Firefox export hashes remain the comparison reference.

### Next component group

The new shared control foundation is implemented, not the entire Material migration. Remaining phase 4 work includes option checkbox/list rows, complete menu grouping/navigation, notices/progress and component-specific field variants. Phases 5–6 still require the full typography/spacing and list/card pass across both inspectors, FD cards/options, Designer layers/FX, start/setup/templates/library/save/export and the handbook. Do not add another global override layer or modify artwork layout to obtain a UI appearance.


Second-milestone verification covers all 46 browser areas in Firefox and Chrome, with a final eight-suite pass in each engine for controls, both editors, modal navigation, typography, direct text, picker placement and setup portability. All 111 model tests and formatting pass. Firefox's exported-image hashes match the original pre-Material reference. The source change adds no runtime dependency; generated JS is 641,211 bytes and CSS 195,985 bytes (gzip comparison only: +2,100 and +883 bytes against milestone one). These are local asset sizes, not a measured claim about network latency. Existing large-photo/50-image, cached preview, compaction, storage retention and original-resolution export checks remain enabled.
