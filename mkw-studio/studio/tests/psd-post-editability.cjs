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
    await page.locator("#setupName").fill("FD Photoshop");
    await page.locator("#createProject").click();
    await page.waitForFunction(
      () => !busy && !document.querySelector("#projectSetup").open,
    );
    await page.evaluate(async () => {
      const c = makeCanvas(600, 750),
        ctx = exportContext(c);
      ctx.fillStyle = "#a75341";
      ctx.fillRect(0, 0, 600, 750);
      ctx.fillStyle = "#eac875";
      ctx.fillRect(150, 100, 300, 500);
      const data = c.toDataURL(),
        q = fresh();
      q.fonts = [...p.fonts];
      q.meta.title = "FD Photoshop";
      const im = {
        id: uid(),
        name: "Bühne.png",
        width: 600,
        height: 750,
        data,
        original: data,
      };
      q.images = [im];
      const logoCanvas = makeCanvas(200, 70),
        lc = exportContext(logoCanvas);
      lc.fillStyle = "#fff";
      lc.fillRect(0, 0, 200, 70);
      lc.fillStyle = "#173e9e";
      lc.fillRect(10, 10, 180, 50);
      const logo = {
        id: uid(),
        name: "Partnerlogo.png",
        width: 200,
        height: 70,
        data: logoCanvas.toDataURL(),
        background: "light",
        monochrome: false,
        gray: false,
      };
      q.logos = [logo];
      const sponsor = {
        id: logo.id,
        name: logo.name,
        width: 200,
        height: 70,
        density: 0.6,
        mode: "auto",
        gray: false,
        complex: false,
        scale: 1,
        enabled: true,
      };
      for (const [w, h] of [
        [600, 750],
        [600, 600],
      ]) {
        const b = basicBoard(im, w, h, q.meta);
        b.safe = { top: 50, bottom: 100, left: 50, right: 50 };
        b.elements.date.text = "Musik für alle";
        b.elements.date.size = 24;
        b.elements.date.uppercase = false;
        b.elements.title.text = "Konzert\nAbend";
        b.elements.title.size = 60;
        b.elements.title.uppercase = false;
        b.elements.title.textStyles = [{ size: 60 }, { size: 36 }];
        b.elements.copyright.text = "© Testfoto";
        b.elements.copyright.visible = true;
        b.elements.copyright.size = 16;
        b.elements.logo.visible = true;
        b.elements.logo.source = "white";
        b.elements.logo.size = 300;
        b.sponsors = {
          enabled: true,
          colour: "#ffffff",
          height: 180,
          groups: [
            {
              id: "partners",
              name: "Hauptpartnerin",
              enabled: true,
              logos: [{ ...sponsor }],
            },
          ],
        };
        b.angle = MKWPostAngle.defaults(b);
        MKWPostAngle.cover(b, im, MKWSponsors.layout(b).content);
        q.boards.push(b);
      }
      await MKWProjects.startDocument(q);
      for (const b of p.boards) await prepareLogo(b);
      await autosave();
    });
    const before = await page.evaluate(() => ({
      p: JSON.stringify(p),
      revision,
      history: history.length,
    }));
    const result = await page.evaluate(async () => {
      const blob = await buildPSD();
      window.psdPostBlob = blob;
      const d = agPsd.readPsd(await blob.arrayBuffer()),
        flat = (ls) => ls.flatMap((l) => [l, ...flat(l.children || [])]),
        layers = flat(d.children);
      const groups = layers.filter((l) => l.name === "Sponsorenleiste");
      return {
        artboards: d.children.length,
        smart: layers.filter((l) => l.placedLayer).length,
        angle: layers
          .filter((l) => l.name === "Winkel")
          .every((l) => l.children.some((c) => c.placedLayer)),
        sponsors: groups.length,
        bars: layers.filter(
          (l) => l.name === "Balkenfarbe" && l.vectorFill?.type === "color",
        ).length,
        labels: layers.filter((l) => l.name === "Hauptpartnerin" && l.text)
          .length,
        coherent: layers.filter((l) => l.text?.text === "Konzert\nAbend")
          .length,
        sourceIds: layers
          .filter((l) => l.name === "Bühne.png" || l.name === "Bildinhalt")
          .map((l) => l.placedLayer?.id),
        sources: d.linkedFiles.length,
      };
    });
    assert.equal(result.artboards, 2);
    assert(result.smart >= 8);
    assert(result.angle);
    assert.equal(result.sponsors, 2);
    assert.equal(result.bars, 2);
    assert.equal(result.labels, 2);
    assert.equal(result.coherent, 2);
    assert.equal(new Set(result.sourceIds).size, 1);
    assert(result.sources <= 5);
    assert.deepEqual(
      await page.evaluate(() => ({
        p: JSON.stringify(p),
        revision,
        history: history.length,
      })),
      before,
      "FD PSD has no project mutations",
    );
    const download = page.waitForEvent("download");
    await page.evaluate(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(psdPostBlob);
      a.download = "psd-post-editability.psd";
      a.click();
    });
    await (await download).saveAs(artifact("psd-post-editability.psd"));
    assert.deepEqual(errors, []);
    console.log(
      "PASS FD PSD artboards, shared original photo/angle source, independent crop masks, replaceable logos, separate sponsor fills/names/logos, coherent styled text and document isolation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
