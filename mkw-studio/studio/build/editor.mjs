// editor-manifest.json owns module/style order. Vendors keep their own licences.
import { readFile, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import { writeThemeTokens } from "./ui-theme.mjs";
await writeThemeTokens();
const root = new URL("../", import.meta.url),
  { scripts: own, styles } = JSON.parse(
    await readFile(new URL("build/editor-manifest.json", root), "utf8"),
  );
// All first-party files share the existing editor closure; services expose explicit APIs.
const code = (
  await Promise.all(
    own.map(
      async (path) =>
        `\n// ${path}\n` + (await readFile(new URL(path, root), "utf8")),
    ),
  )
).join("\n");
await build({
  stdin: {
    contents: code,
    sourcefile: "mkw-editor.js",
    resolveDir: new URL("static/", root).pathname,
  },
  bundle: false,
  minifyWhitespace: true,
  minifySyntax: true,
  minifyIdentifiers: false,
  sourcemap: "external",
  sourcesContent: true,
  outfile: new URL("static/editor.bundle.js", root).pathname,
});
await build({
  stdin: {
    contents: styles.map((path) => `@import "./${path.slice(7)}";`).join("\n"),
    resolveDir: new URL("static/", root).pathname,
    loader: "css",
  },
  bundle: true,
  minify: true,
  external: ["fonts/*", "icons/*"],
  outfile: new URL("static/editor.bundle.css", root).pathname,
});
console.log(
  `Built ${own.length} editor modules and ${styles.length} stylesheets.`,
);
