const assert = require("node:assert/strict");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Original-Kampagne");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const original = await page.evaluate(async () => {
      const canvas = makeCanvas(64, 64),
        ctx = canvas.getContext("2d");
      ctx.fillStyle = "#387391";
      ctx.fillRect(0, 0, 64, 64);
      const data = canvas.toDataURL(),
        im = {
          id: uid(),
          name: "Original.png",
          data,
          original: data,
          width: 64,
          height: 64,
        };
      p.images = [im];
      p.boards = [basicBoard(im, 1080, 1350)];
      const b = p.boards[0];
      b.safe = { top: 100, bottom: 200, left: 100, right: 100 };
      b.elements.title.text = "Konzert im Original";
      b.elements.title.visible = true;
      b.elements.logo.visible = true;
      b.elements.logo.source = "white";
      b.angle = MKWPostAngle.defaults(b);
      changed();
      await autosave();
      return { id: p.projectId, board: clone(b) };
    });
    await page.locator("#save").click();
    await page.locator("#campaignConvert").click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      () =>
        !!p.campaign ||
        document.querySelector("#status").textContent.includes("Umstieg nicht"),
    );
    console.log(
      "conversion status",
      await page.locator("#status").textContent(),
    );
    assert(
      await page.evaluate(
        (id) => !!p.campaign && p.projectId !== id,
        original.id,
      ),
    );
    assert.equal(
      await page.evaluate(
        () =>
          p.carousel.objects.filter((o) => o.campaignRole === "angle").length,
      ),
      1,
    );
    assert(
      await page.evaluate(() =>
        p.carousel.objects.some(
          (o) => o.type === "text" && o.text === "Konzert im Original",
        ),
      ),
    );
    const q = await page.evaluate(() => ({
      image: p.images[0].id,
      source: p.boards[0].imageId,
    }));
    assert.equal(q.image, q.source);
    console.log(
      "PASS explicit legacy conversion creates independent campaign, editable text and angle",
    );
    const stress = await page.evaluate(async () => {
      const before = performance.now(),
        q = fresh();
      q.fonts = [...p.fonts];
      q.campaign = MKWCampaignUI.newState();
      q.formats = MKWFormats.defaults().slice(0, 2);
      const data = p.images[0].data;
      for (let i = 0; i < 50; i++) {
        const im = {
          id: "photo-" + i,
          name: "Foto " + i + ".png",
          data,
          original: data,
          width: 64,
          height: 64,
        };
        q.images.push(im);
        await MKWCampaignDocument.append(
          q,
          im,
          q.formats.map((f) => {
            const b = basicBoard(im, f.w, f.h);
            b.safe = MKWFormats.safe(f);
            return b;
          }),
        );
      }
      MKWCampaignModel.reconcile(q, uid);
      validate(q);
      validateCarousel(q);
      const packed = MKWProjectAssets.hydrate(
        await MKWProjectFile.decode(await MKWProjectFile.encode(q)),
      );
      validate(packed);
      validateCarousel(packed);
      await MKWProjects.startDocument(q);
      return {
        count: p.images.length,
        pages: p.carousel.n,
        objects: p.carousel.objects.length,
        wrapped: p.carousel.artboards.some((a) => a.x > 5000),
        ms: performance.now() - before,
      };
    });
    assert.equal(stress.count, 50);
    assert.equal(stress.pages, 100);
    assert.equal(stress.objects, 200);
    assert(stress.wrapped);
    console.log("PASS 50-photo/100-output fixture and MKW roundtrip", stress);
    await page.screenshot({ path: artifact("campaign-fifty-photos.png") });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
