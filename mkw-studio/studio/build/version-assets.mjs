// Run before publishing: changed editor assets receive a new browser cache key.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const root = new URL("../", import.meta.url),
  file = new URL("index.html", root);
const spriteHash = createHash("sha256")
    .update(await readFile(new URL("static/icons/material-symbols.svg", root)))
    .digest("hex")
    .slice(0, 12),
  uiFile = new URL("static/workspace-ui.js", root),
  ui = await readFile(uiFile, "utf8"),
  nextUI = ui.replace(
    /const\s+studioIconSprite\s*=\s*["'][^"']+["'];/,
    `const studioIconSprite = "static/icons/material-symbols.svg?v=${spriteHash}";`,
  );
if (ui !== nextUI) await writeFile(uiFile, nextUI);
// Version the lazily loaded handbook independently from the editor's startup assets.
const helpIndex = new URL("hilfe/index.html", root),
  helpSource = await readFile(helpIndex, "utf8"),
  helpHashes = {};
for (const name of ["hilfe.css", "hilfe.js"])
  helpHashes[name] = createHash("sha256")
    .update(await readFile(new URL("hilfe/" + name, root)))
    .digest("hex")
    .slice(0, 12);
const helpVersioned = helpSource.replace(
  /((?:src|href)=")(hilfe\.(?:css|js))(?:\?[^"#]*)?("[\s>])/g,
  (_, prefix, name, suffix) =>
    `${prefix}${name}?v=${helpHashes[name]}${suffix}`,
);
if (helpSource !== helpVersioned) await writeFile(helpIndex, helpVersioned);
const helpHash = createHash("sha256")
    .update(helpVersioned)
    .digest("hex")
    .slice(0, 12),
  launcherFile = new URL("static/help-popup.js", root),
  launcher = await readFile(launcherFile, "utf8"),
  nextLauncher = launcher.replace(
    /const studioHelpURL = "[^"]+";/,
    `const studioHelpURL = "hilfe/?v=${helpHash}";`,
  );
if (launcher !== nextLauncher) await writeFile(launcherFile, nextLauncher);
const source = await readFile(file, "utf8"),
  assets = new Map();
for (const match of source.matchAll(
  /(?:src|href)="(static\/[^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g,
)) {
  const path = match[1];
  if (!assets.has(path))
    assets.set(
      path,
      createHash("sha256")
        .update(await readFile(new URL(path, root)))
        .digest("hex")
        .slice(0, 12),
    );
}
const versioned = source.replace(
  /((?:src|href)=")(static\/[^"?#]+\.(?:js|css))(?:\?[^"#]*)?("[\s>])/g,
  (_, prefix, path, suffix) =>
    `${prefix}${path}?v=${assets.get(path)}${suffix}`,
);
if (source !== versioned) await writeFile(file, versioned);
console.log(`${assets.size} editor assets versioned by content.`);
