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
      b.elements.date.text = "Do 19. Nov 2026";
      b.elements.date.visible = true;
      b.elements.date.size = 42;
      b.elements.title.text = "Konzert im Original";
      b.elements.title.size = 86;
      b.elements.title.characterStyles = [
        {
          start: 0,
          end: 7,
          font: "Harriet Italic",
          size: 76,
          color: "#f7e6ab",
          underline: true,
        },
      ];
      b.elements.title.textStyles = [
        { lineHeight: 0.95, spaceBefore: 5, spaceAfter: 11, align: "center" },
      ];
      b.elements.subtitle.text = "Ein besonderer Abend";
      b.elements.subtitle.visible = true;
      b.elements.subtitle.size = 35;
      b.elements.title.visible = true;
      b.elements.logo.visible = true;
      b.elements.logo.source = "white";
      b.angle = MKWPostAngle.defaults(b);
      changed();
      await autosave();
      const canvasText = makeCanvas(b.w, b.h),
        textContext = exportContext(canvasText);
      for (const key of ["date", "title", "subtitle"])
        await paint(textContext, b, 1, { only: key });
      const gradientCanvas = makeCanvas(b.w, b.h),
        gradientContext = exportContext(gradientCanvas);
      gradientContext.fillStyle = "#ffffff";
      gradientContext.fillRect(0, 0, b.w, b.h);
      textGradient(gradientContext, b, textBlock(b));
      const digest = async (ctx) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              ctx.getImageData(0, 0, b.w, b.h).data,
            ),
          ),
        ).join(",");
      return {
        id: p.projectId,
        board: clone(b),
        textHash: await digest(textContext),
        gradientHash: await digest(gradientContext),
        gradientPixels: Array.from(
          gradientContext.getImageData(100, 0, 1, b.h).data,
        ),
        lines: textBlock(b).mainRecords.map((e) => ({
          text: e.text,
          size: e.size,
          y: e.y,
        })),
      };
    });
    await page.locator("#open").click();
    await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
    const convert = page.locator(`[data-convert-project="${original.id}"]`);
    const deletion = page.locator(`[data-delete-project="${original.id}"]`);
    assert(
      (await convert.boundingBox()).y >=
        (await deletion.boundingBox()).y +
          (await deletion.boundingBox()).height,
    );
    await page.screenshot({ path: artifact("campaign-convert-library.png") });
    await convert.click();
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    assert.equal(await page.evaluate(() => p.projectId), original.id);
    await convert.click();
    await page.locator("[data-feedback-confirm]").click();
    await page.waitForFunction(
      () =>
        !!p.campaign ||
        document
          .querySelector("#status")
          .textContent.includes("nicht abgeschlossen"),
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
          (o) => o.type === "text" && o.text.includes("Konzert im Original"),
        ),
      ),
    );
    const fidelity = await page.evaluate(async (id) => {
      const main = p.carousel.objects.find((o) => o.campaignRole === "titles"),
        gradient = p.carousel.objects.find(
          (o) => o.campaignRole === "legacy-gradient",
        ),
        frame = p.carousel.artboards[0];
      const textCanvas = makeCanvas(frame.w, frame.h),
        tc = exportContext(textCanvas);
      await carouselPaint(tc, 0, 1, true, null, [main]);
      const gc = exportContext(makeCanvas(frame.w, frame.h));
      gc.fillStyle = "#ffffff";
      gc.fillRect(0, 0, frame.w, frame.h);
      await carouselPaint(gc, 0, 1, true, null, [gradient]);
      const digest = async (ctx) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              ctx.getImageData(0, 0, frame.w, frame.h).data,
            ),
          ),
        ).join(",");
      const old = await MKWProjectStore.open(id);
      return {
        count: p.carousel.objects.filter(
          (o) => o.type === "text" && o.campaignRole !== "copyright",
        ).length,
        text: main.text,
        sizes: main.textStyles.map((s) => s.size),
        textHash: await digest(tc),
        gradientHash: await digest(gc),
        gradientPixels: Array.from(gc.getImageData(100, 0, 1, frame.h).data),
        original: old.project.boards[0].elements.title.text,
        opacity: gradient.opacity,
        blend: gradient.blend,
      };
    }, original.id);
    assert.equal(fidelity.count, 1);
    assert.deepEqual(
      fidelity.sizes,
      original.lines.map((e) => e.size),
    );
    assert.equal(fidelity.original, "Konzert im Original");
    const gradientDifference = Math.max(
      ...fidelity.gradientPixels.map((value, i) =>
        Math.abs(value - original.gradientPixels[i]),
      ),
    );
    console.log(
      "Gradient maximum 8-bit channel difference:",
      gradientDifference,
    );
    assert(
      gradientDifference <= 1,
      "Gradient geometry/opacity match with at most one 8-bit rounding level between raster and direct compositing",
    );
    assert.equal(
      fidelity.textHash,
      original.textHash,
      "Combined editable title frame preserves original text pixels",
    );
    assert.equal(fidelity.opacity, 0.42);
    assert.equal(fidelity.blend, "multiply");
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
    const scrolling = await page.evaluate(async () => {
      carouselSetZoom(0.35);
      carouselSlideCenter(0);
      await carouselWaitForPaint();
      const frame = () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
      await frame();
      const before = JSON.stringify([
          p.carousel.artboards,
          p.carousel.objects,
          p.campaign,
        ]),
        viewport = $("#carouselViewport"),
        card = document.querySelector(".campaign-card"),
        width = card.getBoundingClientRect().width;
      const originalRefresh = carouselRefresh;
      let refreshes = 0;
      carouselRefresh = (...args) => {
        refreshes++;
        return originalRefresh(...args);
      };
      const started = performance.now();
      try {
        for (let i = 0; i < 10; i++) {
          viewport.scrollTop += 4;
          await frame();
        }
      } finally {
        carouselRefresh = originalRefresh;
      }
      const result = {
        refreshes,
        unchanged:
          before ===
          JSON.stringify([
            p.carousel.artboards,
            p.carousel.objects,
            p.campaign,
          ]),
        stableCard: card === document.querySelector(".campaign-card"),
        width,
        ms: performance.now() - started,
      };
      carouselSetZoom(0.5);
      await carouselWaitForPaint();
      result.widthAfterZoom = document
        .querySelector(".campaign-card")
        .getBoundingClientRect().width;
      const oldView = {
        x: $("#carouselViewport").scrollLeft,
        y: $("#carouselViewport").scrollTop,
        zoom: carouselZoom,
      };
      checkpoint();
      p.meta.title += " · Änderung";
      changed();
      await frame();
      const current = $("#carouselViewport");
      result.viewPreserved =
        Math.abs(current.scrollLeft - oldView.x) < 1 &&
        Math.abs(current.scrollTop - oldView.y) < 1 &&
        carouselZoom === oldView.zoom;
      return result;
    });
    assert(
      scrolling.refreshes <= 1,
      "Small scroll steps reuse the overscanned artwork",
    );
    assert(scrolling.unchanged);
    assert(scrolling.stableCard);
    assert(
      scrolling.viewPreserved,
      "Full edits retain the live workspace position and zoom",
    );
    assert.equal(scrolling.width, 230);
    assert.equal(scrolling.widthAfterZoom, 230);
    console.log(
      "PASS 50-photo scroll reuse, stable cards, zoom-independent width and unchanged document",
      scrolling,
    );
    await page.screenshot({ path: artifact("campaign-fifty-photos.png") });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
