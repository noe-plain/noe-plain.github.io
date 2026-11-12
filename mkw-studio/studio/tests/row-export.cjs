const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  { execFileSync } = require("node:child_process");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Vollständiges Projekt");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.locator("#spreadNewRow").click();
    await page.evaluate(() => {
      const canvas = makeCanvas(64, 64),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#336699";
      ctx.fillRect(0, 0, 64, 64);
      const data = canvas.toDataURL();
      p.images.push({
        id: "unselected-photo",
        name: "Nicht exportiertes Bild.png",
        data,
        original: data,
        width: 64,
        height: 64,
      });
      carouselObject("image", {
        imageId: "unselected-photo",
        name: "Bild in anderer Reihe",
        x: 300,
        y: 300,
        w: 100,
        h: 100,
      });
      const a = p.carousel.artboards[2];
      carouselObject("text", {
        id: "other-row",
        name: "Nicht exportierter Text",
        text: "Auch die andere Reihe bleibt bearbeitbar",
        x: 50,
        y: 200,
        w: 400,
        h: 100,
        size: 24,
      });
      carouselSlideSelect(2);
    });
    await page.locator("#carouselExport").click();
    await page.locator("[data-export-format=png]").click();
    await page.locator("#exportRowScope").selectOption("row");
    assert.equal(await page.locator("#exportNames input:checked").count(), 1);
    await page.locator("#reviewExport").click();
    await page.locator("#reviewSelection summary").click();
    assert.equal(await page.locator("[data-review-export-id]").count(), 3);
    await page.locator("[data-review-export-id]").first().check();
    assert.equal(await page.locator("#exportNames input:checked").count(), 2);
    await page.locator("[data-review-export-id]").first().uncheck();
    await page.locator("[data-review-export-id]").last().uncheck();
    assert.equal(await page.locator("#exportNames input:checked").count(), 0);
    assert(await page.locator("#zip").isDisabled());
    await page.locator("#reviewSelection summary").click();
    await page.waitForFunction(
      () =>
        document.querySelector("#reviewPosition").textContent ===
        "Keine Auswahl",
    );
    assert(await page.locator("#reviewImage").isHidden());
    await page.locator("#reviewSelection summary").click();
    await page.locator("[data-review-export-id]").last().check();
    await page.locator("#reviewSelection summary").click();
    await page.waitForFunction(() =>
      /Slide 1/.test(document.querySelector("#reviewPosition").textContent),
    );
    await page.locator("#closeReview").click();
    assert.equal(await page.locator("#exportNames input:checked").count(), 1);
    const before = await page.evaluate(() => ({
      objects: JSON.stringify(p.carousel.objects),
      history: history.length,
      future: future.length,
      revision,
    }));
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#zip").click(),
    ]);
    const target = artifact("rows-with-project.zip");
    await download.saveAs(target);
    const result = JSON.parse(
      execFileSync(
        "python3",
        [
          "-c",
          "import zipfile,json,base64,sys; z=zipfile.ZipFile(sys.argv[1]); names=z.namelist(); projects=[n for n in names if n.endswith('.mkw')]; assert len(projects)==1; assert z.testzip() is None; print(json.dumps({'names':names,'project':base64.b64encode(z.read(projects[0])).decode()}))",
          target,
        ],
        { maxBuffer: 10 * 1024 * 1024 },
      ).toString(),
    );
    assert.equal(result.names.filter((n) => n.endsWith(".png")).length, 1);
    assert(result.names.some((n) => n.includes("_R02_S01.png")));
    assert(
      result.names.every(
        (n) => !n.startsWith("/") && !n.split("/").includes(".."),
      ),
    );
    const file = await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const q = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(new Blob([bytes])),
      );
      validate(q);
      validateCarousel(q);
      return {
        rows: q.carousel.pageStructure.groups.map((g) => g.length),
        objects: q.carousel.objects.map((o) => o.id),
        image: q.images.some(
          (im) =>
            im.id === "unselected-photo" &&
            im.data.startsWith("data:image/png"),
        ),
      };
    }, result.project);
    assert.deepEqual(file.rows, [2, 1]);
    assert(file.objects.includes("other-row"));
    assert(file.image);
    await page.waitForFunction(() => !busy);
    assert.deepEqual(
      await page.evaluate(() => ({
        objects: JSON.stringify(p.carousel.objects),
        history: history.length,
        future: future.length,
        revision,
      })),
      before,
    );
    await page.locator("#exportRowScope").selectOption("all");
    assert.equal(await page.locator("#exportNames input:checked").count(), 3);
    assert.deepEqual(errors, []);
    console.log(
      "PASS row/all export selection, direct review selection edits, unique local row filenames, ZIP includes full validated MKW for unselected content, unchanged history and project",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
