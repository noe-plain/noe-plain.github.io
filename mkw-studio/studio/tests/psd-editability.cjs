const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.error(e.message);
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("PSD Bearbeitung");
    await page.locator("#cw").fill("600");
    await page.locator("#ch").fill("750");
    await page.locator("#ct").fill("50");
    await page.locator("#cb").fill("100");
    await page.locator("#cl").fill("50");
    await page.locator("#cr").fill("50");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => p.carousel && !busy);
    await page.evaluate(async () => {
      const c = makeCanvas(600, 400),
        ctx = exportContext(c);
      ctx.fillStyle = "#4d83b2";
      ctx.fillRect(0, 0, 600, 400);
      ctx.fillStyle = "#efc55d";
      ctx.fillRect(180, 60, 240, 280);
      ctx.fillStyle = "#aa4334";
      ctx.fillRect(240, 120, 120, 160);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          name: "Testfoto.png",
          width: 600,
          height: 400,
          data,
          original: data,
        };
      p.images.push(im);
      await image(data);
      carouselObject("image", {
        id: "psd-photo",
        name: "Foto – Rahmen",
        x: 40,
        y: 300,
        w: 500,
        h: 350,
        imageId: im.id,
        scale: 1.1,
        panX: 12,
        panY: -9,
        flipX: -1,
        angle: 6,
      });
      carouselObject("angle", {
        id: "psd-angle",
        name: "Winkel – Bildinhalt",
        x: 650,
        y: 180,
        w: 350,
        h: 500,
        imageId: im.id,
        scale: 1.2,
        panX: 0,
        panY: 0,
        direction: "left",
        glow: 25,
      });
      carouselObject("text", {
        id: "psd-text",
        name: "Zusammenhängender Text",
        text: "Musik für alle\nEin besonderer Abend",
        font: "Replica LL",
        x: 60,
        y: 80,
        w: 470,
        h: 180,
        size: 44,
        color: "#202020",
        textStyles: [{ size: 44 }, { size: 28 }],
        textAlign: "left",
      });
      carouselObject("text", {
        id: "psd-justify",
        name: "Blocksatz",
        text: "Ein langer Absatz für das gemeinsame Konzert mit Musik und Bildern.",
        font: "Harriet Regular",
        x: 680,
        y: 50,
        w: 420,
        h: 150,
        size: 24,
        color: "#202020",
        textAlign: "justify",
      });
      carouselObject("image", {
        id: "psd-fx",
        name: "Foto mit Effekten",
        x: 1000,
        y: 600,
        w: 150,
        h: 100,
        imageId: im.id,
        scale: 1,
        panX: 0,
        panY: 0,
        effects: { blur: 4, noise: 5, blurEnabled: true, noiseEnabled: false },
      });
      carouselObject("path", {
        id: "psd-path-photo",
        name: "Bildfüllung",
        x: 950,
        y: 350,
        w: 150,
        h: 150,
        imageId: im.id,
        fillMode: "image",
        fillEnabled: true,
        strokeEnabled: false,
        strokeWidth: 0,
        closed: true,
        points: [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
          { x: 0.5, y: 1 },
        ],
      });
      carouselObject("gradient", {
        id: "psd-gradient",
        name: "Verlauf",
        x: 650,
        y: 700,
        w: 300,
        h: 40,
        opacity: 0.39,
        blend: "multiply",
      });
      p.carousel.objects.find((o) => o.type === "logo").visible = false;
      p.carousel.folders = [
        {
          id: "photo-folder",
          name: "Fotos",
          locked: true,
          visible: true,
          collapsed: true,
        },
        {
          id: "empty-folder",
          name: "Noch leer",
          visible: false,
          collapsed: false,
        },
      ];
      p.carousel.objects.find((o) => o.id === "psd-photo").folderId =
        "photo-folder";
      await carouselWaitForPaint();
      await autosave();
    });
    const before = await page.evaluate(() => ({
      p: JSON.stringify(p),
      revision,
      history: history.length,
    }));
    const result = await page.evaluate(async () => {
      const blob = await buildPSD();
      window.psdTestBlob = blob;
      const d = agPsd.readPsd(await blob.arrayBuffer()),
        flat = (ls) => ls.flatMap((l) => [l, ...flat(l.children || [])]),
        layers = flat(d.children),
        texts = layers.filter((l) => l.text);
      const expected = makeCanvas(d.width, d.height);
      await carouselPaint(exportContext(expected));
      const a = d.canvas
          .getContext("2d")
          .getImageData(0, 0, d.width, d.height).data,
        b = expected
          .getContext("2d")
          .getImageData(0, 0, d.width, d.height).data;
      let difference = 0;
      for (let i = 0; i < a.length; i++)
        difference = Math.max(difference, Math.abs(a[i] - b[i]));
      window.psdTestReference = expected.toDataURL();
      return {
        folders: layers
          .filter((l) => l.children)
          .map((l) => ({
            name: l.name,
            hidden: l.hidden,
            locked: l.protected?.position,
          })),
        texts: texts.map((l) => ({
          name: l.name,
          text: l.text.text,
          shape: l.text.shapeType,
          runs: l.text.styleRuns?.length || 0,
        })),
        smart: layers
          .filter((l) => l.placedLayer)
          .map((l) => ({
            name: l.name,
            id: l.placedLayer.id,
            mask: !!l.vectorMask,
          })),
        filters: layers.find(
          (l) => l.name.includes("Bearbeiten") && l.placedLayer?.filter,
        )?.placedLayer.filter.list.length,
        gradients: layers.filter(
          (l) => l.hidden && l.vectorFill?.type === "solid",
        ).length,
        sources: d.linkedFiles.length,
        slices: d.imageResources.slices[0].slices.length,
        difference,
      };
    });
    assert(
      result.texts.some(
        (t) =>
          t.text === "Musik für alle\nEin besonderer Abend" &&
          t.shape === "box",
      ),
    );
    assert(result.folders.some((f) => f.name === "Fotos" && f.locked));
    assert(result.folders.some((f) => f.name === "Noch leer" && f.hidden));
    assert.equal(result.texts.length, 2);
    assert.equal(result.smart.length, 5);
    assert.equal(result.smart.filter((l) => l.mask).length, 4);
    assert.equal(
      new Set(result.smart.filter((l) => l.mask).map((l) => l.id)).size,
      1,
    );
    assert.equal(result.filters, 2);
    assert.equal(result.gradients, 1);
    assert.equal(result.sources, 2);
    assert.equal(result.slices, 2);
    assert(result.difference <= 1);
    assert.deepEqual(
      await page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        history: history.length,
      })),
      before,
      "PSD export leaves document/history untouched",
    );
    const download = page.waitForEvent("download");
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(psdTestBlob);
      a.download = "psd-editability.psd";
      a.click();
    });
    await (await download).saveAs(artifact("psd-editability.psd"));
    const png = page.waitForEvent("download");
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = psdTestReference;
      a.download = "psd-editability-reference.png";
      a.click();
    });
    await (await png).saveAs(artifact("psd-editability-reference.png"));

    assert.deepEqual(errors, []);
    console.log(
      "PASS PSD coherent native text, paragraph styles, shared embedded photo source, separate vector crop masks, slides and exact composite; Photoshop fixture saved",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
