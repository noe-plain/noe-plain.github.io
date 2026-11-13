# GitHub Pages and encrypted customer delivery

The portfolio remains a static GitHub Pages site. Customer links keep the existing
`kunden.html?veranstaltungsname` syntax, gallery design, password entry and downloads.

## Publication from the local CMS

1. Save the gallery locally. Original JPEGs, keys and processing files stay under
   `portfolio-manager/.client-galleries/`, which is ignored by Git.
2. Open **Änderungen prüfen**. Keep `portfolio/kunden/catalog.json` selected when
   publishing a gallery change.
3. The CMS first transfers encrypted files to the `customer-delivery` branch of
   the existing GitHub remote. Each packet contains at most 128 MiB of new files
   and at most 100 files; individual encrypted files are limited to 95 MiB.
4. Each packet is pushed and the remote ref is checked before continuing. After
   an interruption, retry from the CMS: already confirmed packets are reused.
5. Only after all files are present does the CMS pin the public catalog to the
   confirmed delivery commit, commit the selected website changes and push the
   website branch. A failed website push can be retried without uploading images
   again. The dialog shows separate processing and transfer steps.

The CMS uses the repository's existing Git credentials, author and upstream.
It never force-pushes, switches the working branch or uses the user's staging
area for the delivery branch. GitHub confirms the uploaded commit; the Pages
build runs afterwards and is not reported as already live by the CMS.

The delivery branch is served through `raw.githubusercontent.com`, which supports
cross-origin reads. The website fetches encrypted bytes and decrypts them locally
in the visitor's browser. Passwords and keys are not sent to GitHub. Titles,
dates, counts, salts and release references in the public catalog are public.
The repository must remain publicly readable for these customer links to work.

## Existing galleries and image reuse

Existing `portfolio/kunden/data/` files are retained without rewriting or deleting
them. Initial delivery can reuse Git objects already present in the fetched
website upstream, avoiding another transfer of those objects. Existing galleries
and their named links remain compatible. New encrypted files are stored locally
outside the website tree, then transferred to the delivery branch.

Editing a title, message, order or selection reuses unchanged ciphertext. Only a
small encrypted gallery manifest is regenerated. A password change intentionally
creates a new key and therefore encrypts the selected images again.

Pausing an event removes it from the current catalog. Previously downloaded
files and older Git snapshots cannot be recalled. Existing Git history is not
rewritten by this update.

## Local sources and preview safety

New media-library originals live in `portfolio-manager/.media-sources/` and
recoverable deletions in `.media-trash/`. These folders are ignored by Git and
are never served by the CMS. Legacy `raw/` and `temp/` asset URLs are blocked;
legacy raw directories are also excluded from the Pages build.

HTML previews use a separate loopback port without CMS APIs or private files.
They can render the real site's scripts and styles without gaining the editor's
origin privileges. The CMS continues to bind only to localhost.

## Pages exclusions and validation

`_config.yml` excludes `portfolio/kunden/data/`, the local CMS, development-only
files and unfiltered legacy originals. The small `portfolio/kunden/catalog.json`
is published normally. Encrypted archives are not added to the Pages artifact.

Run `npm test` inside `portfolio-manager/` to check uploads, exact asset handling,
preview isolation, encryption reuse, 500-image limits, bounded delivery packets,
interrupted transfers and website-push recovery against disposable local remotes.
No test sends customer files to GitHub.
