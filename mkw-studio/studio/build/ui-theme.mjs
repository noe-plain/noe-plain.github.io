import { writeFile } from "node:fs/promises";
import colours from "../static/ui-colour-model.js";
export async function writeThemeTokens() {
  const css = [
    "/* Generated from ui-colour-model.js; edit that model for palette changes. */",
  ];
  for (const theme of ["light", "dark"]) {
    css.push(theme === "light" ? ":root {" : 'html[data-theme="dark"] {');
    for (const [role, value] of Object.entries(
      colours.palette(colours.defaultColour, theme),
    ))
      css.push(`  --md-sys-color-${role}: ${value};`);
    css.push("}");
  }
  await writeFile(
    new URL("../static/ui-theme-tokens.css", import.meta.url),
    css.join("\n") + "\n",
  );
}
