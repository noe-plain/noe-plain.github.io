# MKW Studio changes

- Preserve static GitHub Pages operation: no runtime server/account/install requirement.
- Read ARCHITECTURE.md before modifying persistence, rendering, exports or the module manifest.
- Edit source modules, not `static/editor.bundle.*` or vendor bundles. Run `npm run format`, `npm run build`, `npm test` and relevant portable browser suites before publishing.
- New settings are tool preferences. Changing a default must not mutate existing objects (including locked ones) or inject preferences into MKW files.
- New asset-bearing object types must update reference traversal, validation and compaction tests. Deleting objects must release persisted assets while hidden objects, undo and clipboard remain functional.
- Preserve per-project identity/version checks; never reintroduce a global autosave slot. Never download from automatic saving or overwrite a file after an external-change/conflict warning.
- Keep parsing/model/persistence services independent from DOM/editor globals. Add new responsibilities in their owning module; avoid new global state or compressed one-line source.
- Reuse render buffers, coalesce pointer bursts and cancel stale work. Verify visible/export appearance when altering paint or typography.
- State export limits accurately. Do not label raster content as fully editable vector content.
