# GitHub Pages publication

The repository uses GitHub Pages' branch/Jekyll build. `_config.yml` determines which repository paths are excluded from the published website.

`portfolio/kunden/data/` contains encrypted customer-gallery delivery files. Customer images are now delivered separately, so these files stay in Git and on the local Mac but are no longer published by Pages. Existing gallery image/download URLs under that path are no longer served. Re-enabling them requires a separate delivery plan and a size check first.

Development dependencies, Studio tests, build sources, historical backups and the offline Python wheel are excluded too. The Studio runtime is under `mkw-studio/studio/static/`; **do not exclude `static/vendor/`**, its fonts, person detector or WebAssembly libraries.

With the files present on 15 October 2026, the remaining tracked content has an upper bound of approximately 613 MB before Jekyll's additional default exclusions. The actual uploaded size is shown in the Pages deployment log. GitHub's published-site limit is 1 GB.

Changing the deployment exclusions does not remove files from the repository or alter image quality. The Studio uses separate browser storage for users' projects; their MKW files are not part of the Pages deployment.
