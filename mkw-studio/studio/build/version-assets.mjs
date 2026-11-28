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
const templateFile = new URL("static/template-session.js", root),
  templateSource = await readFile(templateFile, "utf8");
let nextTemplate = templateSource;
for (const match of templateSource.matchAll(
  /"(static\/templates\/[-\w]+\.json)(?:\?[^"\s]*)?"/g,
)) {
  const hash = createHash("sha256")
    .update(await readFile(new URL(match[1], root)))
    .digest("hex")
    .slice(0, 12);
  nextTemplate = nextTemplate.replaceAll(match[0], `"${match[1]}?v=${hash}"`);
}
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
// Keep the lazy archive reader, client and worker on the same protocol after
// a Pages update, including for browsers with previously cached ES modules.
const zipSources = [
  "project-file.js",
  ...[
    "browser-codec",
    "browser-worker",
    "client",
    "media-draft",
    "media-source",
    "model-db",
    "zip-reader",
    "zip-writer",
  ].map((name) => "mkw-zip/" + name + ".mjs"),
];
const zipImports = /"(\.\/(?:mkw-zip\/)?[-a-z]+\.mjs)(?:\?v=[a-f0-9]+)?"/g;
const zipGraph = new Map();
const zipHash = createHash("sha256");
for (const path of zipSources) {
  const file = new URL("static/" + path, root);
  const code = await readFile(file, "utf8");
  zipGraph.set(file, code);
  zipHash.update(code.replace(zipImports, '"$1"'));
}
const zipVersion = zipHash.digest("hex").slice(0, 12);
for (const [file, code] of zipGraph) {
  const versioned = code.replace(zipImports, `"$1?v=${zipVersion}"`);
  if (versioned !== code) await writeFile(file, versioned);
}

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

const jxlWorkerHash = createHash("sha256")
    .update(await readFile(new URL("static/jxl-worker.js", root)))
    .digest("hex")
    .slice(0, 12),
  jxlClientFile = new URL("static/jxl-export.js", root),
  jxlClient = await readFile(jxlClientFile, "utf8"),
  nextJxlClient = jxlClient.replace(
    /const workerURL = "[^"]+";/,
    `const workerURL = "static/jxl-worker.js?v=${jxlWorkerHash}";`,
  );
if (jxlClient !== nextJxlClient) await writeFile(jxlClientFile, nextJxlClient);

// The optional practice shares pure path rules, not the editor or project state.
const bezierFiles = [
    "static/path-model.js",
    "hilfe/bezier-model.js",
    "hilfe/bezier-game.js",
  ],
  bezierHash = createHash("sha256");
for (const name of bezierFiles)
  bezierHash.update(await readFile(new URL(name, root)));
const bezierVersion = bezierHash.digest("hex").slice(0, 12),
  handbookScriptFile = new URL("hilfe/hilfe.js", root),
  handbookScript = await readFile(handbookScriptFile, "utf8"),
  nextHandbookScript = handbookScript.replace(
    /const bezierResources = \[[\s\S]*?\];/,
    `const bezierResources = [\n  "../static/path-model.js?v=${bezierVersion}",\n  "bezier-model.js?v=${bezierVersion}",\n  "bezier-game.js?v=${bezierVersion}",\n];`,
  );
if (handbookScript !== nextHandbookScript)
  await writeFile(handbookScriptFile, nextHandbookScript);

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
