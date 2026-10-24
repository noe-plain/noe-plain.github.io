# Material 3 motion audit – 24 October 2026

This inventory covers the interactive component families used throughout both editors, setup, settings, project library, save/export and the lazy handbook. It preserves the current document model, renderers and immediate design manipulation.

## Shared rules

Effects (colour, opacity and borders) use the shared 150/200ms effect tokens; small spatial changes use the existing 350ms spatial easing. Press feedback uses a shared 450ms token and cleans up its transient layer. Remaining fixed timing in legacy card actions/copyright fields/chevrons now uses these same tokens. Native focus, selection, disabled states and keyboard behaviour remain. Reduced motion sets these durations to zero and removes indeterminate movement; status text and actual progress stay available. Theme changes retain the short transition guard to avoid temporary low contrast.

| Component / entry points | Animation decision and owner |
| --- | --- |
| Filled, tonal, outlined and icon actions; header, footer and floating tools | Existing state colours, transient clipped press feedback and rounded selection transitions; controls.css/ui-controls.js. No movement of click targets. |
| Mode choices, theme/density buttons and typography tabs | Shared state/shape effects; preserve native focus and selected states. No animation of actual text/artwork. |
| Checkboxes and switches in all panels | Native semantics, short checkmark effect and bounded switch-thumb movement. |
| Native text/number fields, selects, sliders and colour-plane controls | Field/focus feedback; direct value changes. Keep keyboard/drag immediate; native select popup remains OS-owned. |
| Tooltips | Existing short opacity entrance; timer and focus/outside cleanup retained. |
| Dialogs: start, setup, settings, Wiki, library, save, export, import and confirmation | Shared 200ms opacity entrance; native close/focus restoration remains immediate. No artificial wait or blocked dismissal. |
| Paint picker, layer action/FX menus and effect editors | Shared opacity entrance, native top-layer placement/focus/keyboard unchanged. Geometry is not animated during direct editing. |
| FD option disclosure and angle direction | Token-based chevron feedback; native disclosure. Angle now matches row typography, inset and selection surface, with only an added Google chevron. Native select appearance is suppressed; the older broad Light rule no longer wins. |
| Setup format/safe-zone reveal | Existing grid/opacity spatial transition with inert-aware hidden fields; reduced-motion fallback retained. |
| Template/gallery/library/export cards | Existing quiet hover/selection colour and outline effects. Preserve lazy bounded previews; no new stagger or entry animation on every redraw. |
| Sidebar properties, layer/folder rows and FX | Existing selection effects. Keep list rebuilds, disclosure and reorder immediate; avoid restarting entrance motion on repeated property edits. |
| Saving and short unknown-duration loads | Shared rotating and morphing seven-shape sequence; footer reuses its small status indicator. The import dialog has one contained shape instead of an additional orbit and duplicated small spinner. |
| Measured image import, image/PDF export | Wavy active line, quiet remaining track, terminal stop marker and gap. Native progress values and actual percentages remain authoritative. Completed progress settles to a straight line; cancellation/closed dialogs stop movement. |
| Warnings and errors | Existing finite attention feedback for failed saves; no persistent shaking. Toolbar warning and Export share exact width/height in both editors, narrow/icon-only layouts and Advanced. |
| Artwork handles, paths, snapping, crop, direct text input, pan and zoom | Immediate user-driven updates; no smoothing, added waits or decorative animation. Original painting/export remains untouched. |
| Wiki navigation | Existing native navigation and short role-colour effects, including theme guard; still loads only on demand. |

## Loading and progress implementation

Official Material distinguishes short unspecified waits from measured progress. The seven lightweight web shapes follow the expressive burst/cookie/pentagon/pill/sunny/cookie/oval sequence; build/ui-motion.mjs samples our own mathematical shapes into matching CSS polygons. The browser interpolates them using the established spatial easing and rotates them. This is a web adaptation, not a claim to reproduce Android's rounded-polygon matching or physical spring engine exactly. The 650ms shape cadence is retained; sampling happens only during the build. No runtime geometry generation or extra dependency.

MKWUIControls.loading retains its existing reference-counted lifecycle. MKWUIControls.progress updates the existing native progress element and its decorative CSS variable from the same measured values. No fake percentage, polling, background loop, observer, layout read or requestAnimationFrame loop is added. Tiny CSS masks/polygons animate only while their user operation is active/visible; completion and reduced motion stop them. System colours provide a high-contrast fallback. The UI-only shapes never enter files or export canvases.

## Official references

- [Loading indicator guidance](https://github.com/material-components/material-components-android/blob/master/docs/components/LoadingIndicator.md): unspecified short waits, contained/uncontained and accessibility.
- [Loading indicator shape sequence](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/loadingindicator/LoadingIndicatorDrawingDelegate.java) and [timing](https://github.com/material-components/material-components-android/blob/master/lib/java/com/google/android/material/loadingindicator/LoadingIndicatorAnimatorDelegate.java).
- [Expressive progress guidance](https://github.com/material-components/material-components-android/blob/master/docs/components/ProgressIndicator.md): wavy determinate/indeterminate variants, track and stop anatomy.
- [Motion system](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md): shared semantic effect/spatial timing; [Material Web progress](https://github.com/material-components/material-web/blob/main/docs/components/progress.md): native-accessible progress semantics.

The M3 design pages themselves require JavaScript in the text retrieval tool; the official public component documentation and source above were readable. No Material framework, copied Android implementation or new runtime network service is installed.

## Verification

material-motion exercises actual shape changes and rotation, measured import/export values and widths, completed/hidden/reduced-motion/forced-colour states, actual warning/Export geometry at 1500/780/390px and Advanced, matching native FD select anatomy, keyboard access, and document/history isolation. Existing suites retain real import/export/save, all options, direct editing, lazy Wiki and original pre-Material artwork hashes. Release results are recorded in the continuation checkpoint.


Final local release gate: 113/113 model tests, formatting and reproducible build pass. Full Firefox 56/56 with original pre-Material export references passes; after the final small-indicator centering refinement, affected Firefox 4/4 and Chrome 3/3 pass again. The 12/12 Chrome operation suites also pass, including real 50-image imports/native incremental saving/PDF. Light/dark option rows, contained loading, wavy export and reduced-motion/system-colour screenshots reviewed. Against 40e4527, the runtime JS adds 158 gzip bytes and CSS adds 3457 gzip bytes, mostly build-sampled shapes. These are asset sizes, not claims about measured network speed. Publication/live results belong in the continuation checkpoint.


## Contained indicator follow-up

On user preference, all small morphing indicators now sit in a stationary tonal circle, including footer saving and button/status loading. Only the inner shape morphs and rotates; the circle stays still. The existing larger import indicator already uses this configuration. Shared primary-container/on-primary-container roles follow light/dark and the chosen seed; forced colours use a Canvas circle and Highlight foreground. Hidden duplicate status indicators remain suppressed; lifecycle, measured wavy progress, document data and rendering are unchanged. No extra DOM or JavaScript is added.
