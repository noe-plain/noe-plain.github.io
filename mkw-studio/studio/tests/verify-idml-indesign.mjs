// Explicit native integration check: macOS + installed InDesign; never run in CI.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url),
  idml = require("../static/idml-package.js");
if (process.platform !== "darwin")
  throw Error("Native InDesign verification requires macOS and InDesign.");
const directory =
  process.argv[2] ||
  (await fs.mkdtemp(path.join(os.tmpdir(), "mkw-idml-native-")));
await fs.mkdir(directory, { recursive: true });
const records = [];
for (const [w, h] of [
  [800, 1000],
  [1080, 1350],
]) {
  const file = path.join(directory, `mkw-empty-${w}x${h}.idml`),
    roundtrip = path.join(directory, `native-roundtrip-${w}x${h}.idml`),
    script = path.join(directory, "verify.jsx");
  await fs.writeFile(file, idml.emptyPage({ w, h, name: "MKW & <Test> 🎶" }));
  const jsx = `(function(){var doc=null;try{doc=app.open(new File(${JSON.stringify(file)}),false);doc.viewPreferences.horizontalMeasurementUnits=MeasurementUnits.POINTS;doc.viewPreferences.verticalMeasurementUnits=MeasurementUnits.POINTS;var value=app.version+'|'+doc.pages.length+'|'+doc.pages[0].bounds.join(',')+'|'+doc.allPageItems.length;doc.exportFile(ExportFormat.INDESIGN_MARKUP,new File(${JSON.stringify(roundtrip)}),false);return value;}finally{if(doc&&doc.isValid)doc.close(SaveOptions.NO);}}());`;
  await fs.writeFile(script, jsx);
  const apple = path.join(directory, "verify.applescript");
  await fs.writeFile(
    apple,
    'on run argv\n set sourceFile to (POSIX file (item 1 of argv)) as alias\n tell application id "com.adobe.InDesign"\n set nativeResult to do script sourceFile language javascript\n end tell\n return nativeResult\nend run\n',
  );
  const output = execFileSync("osascript", [apple, script], {
      encoding: "utf8",
      timeout: 60000,
    }).trim(),
    [version, pages, bounds, items] = output.split("|"),
    rect = bounds?.split(",").map(Number);
  assert.equal(Number(pages), 1);
  assert.equal(Number(items), 0);
  assert.deepEqual(rect, [0, 0, h * 0.75, w * 0.75]);
  records.push({
    file,
    sha256: createHash("sha256")
      .update(await fs.readFile(file))
      .digest("hex"),
    w,
    h,
    version,
    pages: Number(pages),
    boundsPoints: rect,
    pageItems: Number(items),
    nativeRoundtrip: roundtrip,
    result: "opened-and-reexported",
  });
}
const report = {
  checkedAt: new Date().toISOString(),
  scope:
    "Generated single empty pages only; no text/image/whole-project export claim.",
  records,
};
await fs.writeFile(
  path.join(directory, "verification.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report, null, 2));
