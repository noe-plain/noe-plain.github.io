# .design feasibility probe

Run from the Studio directory with the normal development dependencies installed. Node, Python 3.9+ and Playwright Chrome are required for the full ZIP experiment. Optional Firefox and WebKit installations add browser capability checks.

```sh
mkdir -p /tmp/mkw-design-vendor /tmp/mkw-design-results
npm pack @sqlite.org/sqlite-wasm@3.54.1-build1 --pack-destination /tmp/mkw-design-vendor
tar -xzf /tmp/mkw-design-vendor/sqlite.org-sqlite-wasm-3.54.1-build1.tgz -C /tmp/mkw-design-vendor
node tools/design-format-probe/run.mjs /tmp/mkw-design-vendor/package/dist /tmp/mkw-design-results chromium firefox webkit
unzip -t /tmp/mkw-design-results/zip-probe-after.zip
```

The local server runs on loopback. Browser contexts and OPFS files belong to the probe. No user projects are opened. The SQLite worker creates the original and uses a separate worker to reopen and update it. Python generates a ZIP with a synthetic PNG and works only on a separate generated copy. The normal Studio writing helper then applies the same plan to an isolated browser OPFS file and exercises both abort and successful close. Output files are disposable. The script records browser launch issues separately. It returns a failing status if the requested Chromium baseline or ZIP commit fails. This protocol covers a fixed-length STORED entry and serves as a feasibility experiment only.
