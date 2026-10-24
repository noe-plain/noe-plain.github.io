// Run before publishing: changed editor assets receive a new browser cache key.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { writeThemeTokens } from "./ui-theme.mjs";
await writeThemeTokens();
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
const templatePath = "static/templates/mkw-winkel-slidepost.json",
  templateHash = createHash("sha256")
    .update(await readFile(new URL(templatePath, root)))
    .digest("hex")
    .slice(0, 12),
  templateFile = new URL("static/template-session.js", root),
  templateSource = await readFile(templateFile, "utf8"),
  nextTemplate = templateSource.replace(
    /const builtInURL\s*=\s*"[^"]+";/,
    `const builtInURL =\n    "${templatePath}?v=${templateHash}";`,
  );
if (templateSource !== nextTemplate)
  await writeFile(templateFile, nextTemplate);
const patternPath = "static/hyphenation/hyph-de-1996.tex",
  patternHash = createHash("sha256")
    .update(await readFile(new URL(patternPath, root)))
    .digest("hex")
    .slice(0, 12),
  hyphenFile = new URL("static/text-hyphen.js", root),
  hyphenSource = await readFile(hyphenFile, "utf8"),
  nextHyphen = hyphenSource.replace(
    /const patternURL = "[^"]+";/,
    `const patternURL = "${patternPath}?v=${patternHash}";`,
  );
if (hyphenSource !== nextHyphen) await writeFile(hyphenFile, nextHyphen);
// Recognition remains lazy; version the worker and its local models together.
const workerFile = new URL("static/subject-worker.js", root),
  workerSource = await readFile(workerFile, "utf8");
let workerVersioned = workerSource;
for (const path of [
  "vendor/vision.js",
  "vendor/face.tflite",
  "vendor/person.tflite",
]) {
  const hash = createHash("sha256")
    .update(await readFile(new URL("static/" + path, root)))
    .digest("hex")
    .slice(0, 12);
  workerVersioned = workerVersioned.replaceAll(
    new RegExp('"' + path.replaceAll(".", "\\.") + '(?:\\?[^"\\s]*)?"', "g"),
    '"' + path + "?v=" + hash + '"',
  );
}
if (workerSource !== workerVersioned)
  await writeFile(workerFile, workerVersioned);
const workerHash = createHash("sha256")
    .update(workerVersioned)
    .digest("hex")
    .slice(0, 12),
  subjectFile = new URL("static/subject.js", root),
  subjectSource = await readFile(subjectFile, "utf8"),
  subjectVersioned = subjectSource.replace(
    /const workerURL = "[^"]+";/,
    `const workerURL = "static/subject-worker.js?v=${workerHash}";`,
  );
if (subjectSource !== subjectVersioned)
  await writeFile(subjectFile, subjectVersioned);

// Version the lazily loaded handbook independently from the editor's startup assets.
const helpIndex = new URL("hilfe/index.html", root),
  helpSource = await readFile(helpIndex, "utf8"),
  helpHashes = {};
for (const name of ["hilfe.css", "hilfe.js"])
  helpHashes[name] = createHash("sha256")
    .update(await readFile(new URL("hilfe/" + name, root)))
    .digest("hex")
    .slice(0, 12);
const themeHash = createHash("sha256")
  .update(await readFile(new URL("static/ui-theme-tokens.css", root)))
  .update(await readFile(new URL("static/ui-theme.css", root)))
  .digest("hex")
  .slice(0, 12);
const helpVersioned = helpSource
  .replace(
    /(href="\.\.\/static\/ui-theme(?:-tokens)?\.css)(?:\?[^"#]*)?("[\s>])/g,
    (_, prefix, suffix) => `${prefix}?v=${themeHash}${suffix}`,
  )
  .replace(
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
