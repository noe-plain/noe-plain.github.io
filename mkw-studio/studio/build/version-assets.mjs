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
