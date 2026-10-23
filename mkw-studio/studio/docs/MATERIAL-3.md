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

Shared colour/control/menu foundations and the23October start/Bento pilot are implemented. The complete migration is not yet finished:

1. Continue workspace typography/spacing and hierarchy in both inspectors, FD cards/options and Designer layers/folders/FX. Keep the implemented tab/jump-navigation distinction and all specialist tools.
2. Apply the same component rules to remaining start/setup, templates/library, save/export, paint picker and handbook details. Keep lazy loading, all formats and the native file/persistence contracts.
3. Remove superseded rules at each component owner rather than accumulating another final override layer.
4. Repeat same-engine export fidelity, Firefox/Chrome, keyboard/theme/narrow and50-image/native-saving checks for each subsequent release. Keep the white montage and restrained artwork shadow explicitly requested by the user.

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

## Workflow feedback and action menus: third milestone

`ui-menus.js` owns only transient action-menu interaction. The existing layer and FX commands remain in their original owners. Arrow keys, Home/End and letter search move focus; Escape returns to the invoking control and Tab leaves the menu. Closed menu triggers open with Enter, Space or Up/Down. Native disabled actions are exposed as `aria-disabled` so that keyboard users can discover them, as recommended by [M3 menu accessibility](https://m3.material.io/components/menus/accessibility). A capture-phase guard prevents activation by mouse, keyboard or a bubbled click. Protected brand-logo actions remain protected. Menus fit the viewport, reposition on resize, and close when their invoking sidebar becomes hidden. Resize listeners and queued frames are released on close. There is no global DOM observer.

The Designer's existing window-capture shortcut handler previously consumed menu arrow keys, Space and Escape before the menu received them. It now defers while an interactive popover is open, and leaves a closed menu trigger's opening keys alone. Artwork shortcuts continue outside these UI contexts. This is focus isolation, not a new document or keyboard-map format.

[Material lists](https://m3.material.io/components/lists/guidelines) inform the consistent leading icons, aligned labels, grouped warning rows and full-row option targets. FD options retain native multi-selection, all three text roles, angle direction, family and sponsor options. The angle's required checkbox/direction combination remains a settings row rather than being incorrectly assigned a single-action menu role. Checkboxes preserve native checked/indeterminate semantics, labels and Space-key operation, with shared visual states. Switches retain their separate behaviour.

[Material progress indicators](https://m3.material.io/components/progress-indicators/guidelines) distinguish known from unknown work. Existing import/export values remain the source of truth, with one native linear indicator per process and a visible end marker for low-contrast tracks. The decorative repeating download arrow was removed; the displayed percentage and native progress value still reflect actual completed work and remain visible at rest as requested. No artificial percentage or idle animation was added.

[Material snackbar guidance](https://m3.material.io/components/snackbar/guidelines) warns against auto-dismissing the only accessible copy of important information on the web. Save failures therefore remain persistent alerts with inline status, readable semantic error colours in both themes and the existing reduced-motion-aware attention feedback. They are not converted into disappearing success toasts. Warning access stays left of Export; warnings retain navigation to affected objects. Duplicate light-only warning/progress rules and the displaced save-error style owner were removed as the owning components migrated.

`material-workflow` exercises actual layer and FX commands through keyboard menus, focus return, discoverable disabled entries, protected-logo click guards, duplicate/undo, checkbox-driven export settings, real progress values, persistent error contrast and viewport adaptation. Existing artwork/hash, 50-image, warning navigation, storage, layer/effect and export checks remain enabled. Full Material migration still requires the workspace typography/hierarchy, remaining cards/list variants, and start/setup/library/export/Wiki detail passes.


### Web implementation references

The user-provided [Material for web entry](https://m3.material.io/develop/web) links to Material Web's [components](https://github.com/material-components/material-web/tree/main/docs/components), [theming](https://github.com/material-components/material-web/tree/main/docs/theming) and [roadmap](https://github.com/material-components/material-web/blob/main/docs/roadmap.md). Reviewed on 22 October 2026: the library is in maintenance mode, without planned new features. Its component behaviour and token definitions remain useful references; neither Material Web nor Angular is added to Studio. The existing native DOM, locally bundled symbols/fonts and static Pages operation remain in place.

The [web menu documentation](https://github.com/material-components/material-web/blob/main/docs/components/menu.md) informs anchoring and keyboard/typeahead interaction; actual Firefox/Chrome regression checks determine browser support rather than stale compatibility notes in examples. The [progress documentation](https://github.com/material-components/material-web/blob/main/docs/components/progress.md) distinguishes determinate and indeterminate work. The [typography reference](https://github.com/material-components/material-web/blob/main/docs/theming/typography.md) will guide UI brand/plain roles in the next workspace pass; document typography is explicitly excluded.

Visual QA also found legacy pale export filename/loading-total colours against light surfaces. Their owning rules now use the shared readable semantic text role; both themes have contrast assertions. No encoded image or preview computation changed. The new keyboard workflow test waits for undo's asynchronous font/render completion before opening FX: checking only the immediate model state could wrongly race that pending render and dismiss the popup. The real interaction assertions remain unchanged.


### Third-milestone verification

- All 111 model tests and source formatting pass; the production build is reproducible, including HTML, JS/CSS, source map, theme tokens and lazy handbook.
- The complete Firefox run passed 47/47 browser suites, including the original pre-Material image reference. The final export-status colour and undo-wait changes were then verified in four focused suites in both Firefox and Chrome: workflow, UI/reference, shared controls and workspace.
- The complete Chrome run initially passed 44/47: the new test raced asynchronous undo; two existing tests still expected intentionally superseded row dimensions/backgrounds. These were corrected with exact new expectations, without removing feature assertions. The affected suites all pass; the keyboard/FX workflow additionally passed three consecutive Chrome runs. All 47 unique browser areas are covered across that full run and its corrections.
- 50-image project import/save/reopen, large-photo exports, PDF/PSD, original-resolution rendering, project retention/compaction, typography, paths, sponsor handling and both editor workspaces remain covered.
- Generated JS: 644,059 bytes (gzip 186,536), CSS: 198,279 bytes (gzip 35,107). Compared with milestone two this is +782 gzip JS and +248 gzip CSS. These are local asset measurements, not a promise about network or task duration. There is no added runtime dependency or continuous UI animation loop.

Remaining phases 5–6: complete shared workspace typography/spacing and hierarchy (including the weak character/paragraph navigation cue), FD cards and Designer layers/FX, then start/setup/templates/library/save/export/picker/Wiki detail passes. Use the official web references per component and retire replaced owner rules. Preserve every tool, existing editing gestures, artwork layout and encoded export computation.


## Expressive visual direction and start actions (22 October archive)

The user's six reference images refine the approved direction: soft tonal surfaces, coherent rounded control groups, distinct selected shapes and clear primary/secondary hierarchy. Use the existing seed-derived semantic light/dark roles, never hardcoded purple/pink. Keep the creative workspace restrained for accurate artwork assessment. This direction applies to upcoming component passes; it does not imply that the entire interface has already migrated, or permit changes to artwork fonts, masks, layout or exports.

The start actions now share a3:2grid row: New Project has more width and remains primary, Templates uses a tonal primary-container treatment. Resume/Open retain their separate row. The top two remain side by side at narrow widths with wrapping labels; no startup JS, template asset loading or command handlers changed. [M3 buttons](https://m3.material.io/components/buttons/guidelines) inform the primary/tonal distinction and [colour roles](https://m3.material.io/styles/color/roles) inform readable seed-adapted pairs. No library, image, font or animation dependency was added.


### Planned follow-up (22 October archive; implemented by the following milestone)

The next user-requested design pass is planning-only: bottom start actions40:60 (Resume/Open), a lightly seed-tinted Bento surface structure, access to the same settings dialog directly on the start screen, and an optional device/tool-owned start background image with MKW-Setup portability. It must not enter artwork/projects/exports, nor be stored in localStorage or project-owned assets. Keep the creative workspace large, typography/pixels unchanged, both editor tool-pill positions and all current functions. Use one optimised local image with proper replace/remove cleanup and accessible foreground surfaces. No implementation of these follow-up items is included in the current start-row release.


## Start and Bento milestone – 23 October 2026

User resumed implementation on23October, superseding the planning-only hold. The current milestone implements the two mirrored3:2/2:3start rows, the same native settings dialog on the start screen, an optional optimised start background, and the sketched shared shell: header over the montage, full-height right inspector, one full-width footer, rounded28px surfaces and12px gutters (8pxon narrow windows). Simple and advanced tool positions remain; no renderer/layout/persistence code for artworks changed. Latest user steering makes the montage white in BOTH themes and updates the welcome text to address both modes. The surrounding shell remains subtly seed-tinted.

The new start-screen.js owns only device personalisation and fixed-dialog lifecycle. setup-store keeps one bounded Blob under a separate tool key, outside project assets/GC/localStorage; replacement/removal overwrites/deletes that key. One URL is shared by backdrop/settings preview while needed, revoked on replacement and when both dialogs close. A generation cancels stale async loads. Normal imports optimise once to2560px/max2MiB, cap source input/decoded dimensions and release bitmap/canvas. Invalid/quota operations leave the old stored image intact. Startup does not await the image, and no observer watches artwork or pointer/style attributes.

Setup v1 optionally carries backgrounds (zero/one). Current capture includes the array; explicit empty clears, old omitted field preserves local personalisation. Strict model checks restrict local raster payloads and size; decoding/dimensions are validated before setup journal/apply. The existing rollback snapshot includes the start image. Settings imports temporarily block image mutations and await any in-progress edit; it never enters project/MKW/template content. This is separate from project reference traversal because it is not a new document object type.

Material reference: official [colour roles](https://github.com/material-components/material-web/blob/main/docs/theming/color.md), [shape tokens](https://github.com/material-components/material-web/blob/main/docs/theming/shape.md), [buttons](https://github.com/material-components/material-web/blob/main/docs/components/button.md) and [tabs](https://m3.material.io/components/tabs/guidelines). Retain brand fonts and existing accessible DOM. Surfaces, rounded containers, tonal secondary actions, state layers and tab indicators implement the relevant patterns without claiming an exact copy of Google's HCT palette or adding a framework. Real character/paragraph tabs gain a visible selected indicator; the simple navigation remains a jump group, not mislabelled tabs.


The new start tonal actions use secondary-container/on-secondary-container as prescribed by the Material Web button tokens. These seed-derived low-chroma roles are additive; existing artwork and primary/control roles remain unchanged. The palette contrast check includes both themes and extreme/arbitrary seeds. The no-image start backdrop uses the same seed-tinted shell role, rather than an unrelated neutral fallback.


Verification:112/112model tests, formatting and reproducible build; complete48/48browser suites in Firefox AND Chrome, then final5/5in each after the last seed/tonal refinements. Original Firefox pre-Material export hashes match. New material-start covers native settings focus/Escape before project creation, two mirrored action rows down to320px, actual backdrop paint, bounded image import/reload/removal, setup stream portability, legacy preservation, rollback, corrupt input/quota protection, unchanged document/undo and white montage in both themes/editors. workspace-ui checks exact Bento edges/radii, sidebar/zoom preservation and all prior controls, with updated exact planned geometry rather than reduced assertions. Existing50-image/native-incremental/asset/typography/path/PDF/PSD checks pass. Screenshots reviewed in light/dark/narrow. Bundle sizes:JS651089bytes/gzip188361;CSS201857bytes/gzip35683. These are local asset sizes, not measured network-speed claims. No runtime dependency added.

This is the start/Bento pilot milestone. Remaining rollout includes the broader inspector/card/layer hierarchy and remaining setup/library/export/Wiki component details; do not claim the entire Material migration finished.


Latest user steering: both FD artboards and Designer artwork use one restrained view-only shadow (3%/5% opacity), replacing the previous dark20–50% shadows and removing the duplicate FD override. The common shadow is never read by a renderer and cannot enter an export.

Final follow-up verification: lighter artwork shadows retain identical export hashes (workspace-ui/material-ui2/2 in each engine). Start/settings share the already decoded background while either is open; image mutations/setup explicitly invalidate it, and closing both releases it. Actual URL-reuse, import/legacy/rollback/removal cases pass material-start/setup-file2/2 in each engine after this final cache refinement.
