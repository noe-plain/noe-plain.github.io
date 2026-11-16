/* Explicit draft workflow: renders proposals, validates editable files, never registers templates. */
const assert = require("node:assert/strict"),
  fs = require("node:fs/promises"),
  path = require("node:path"),
  { launch, waitForProjectReady } = require("../../tests/browser.cjs");
const output = process.env.MKW_DRAFT_OUTPUT || "/tmp/mkw-vorlagen-2026-11-16";
(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1100 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startDesigner").click();
    await page.locator("#setupName").fill("Vorlagenatelier · Entwürfe");
    await page.locator("#cn").fill("1");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(() => document.fonts.ready);
    await page.addScriptTag({ path: path.join(__dirname, "recipes.js") });
    const setup = await page.evaluate(async () => {
      const seed = await MKWTemplates.get("mkw-winkel-slidepost");
      window.draftPhotos = [];
      for (const filename of [
        "260831_A1_Probe_c-noe-plain-4.jpg",
        "260831_A1_Probe_c-noe-plain-5.jpg",
      ]) {
        const bitmap = await image("testbilder/" + filename),
          factor = Math.min(1, 1000 / bitmap.width),
          canvas = makeCanvas(
            Math.round(bitmap.width * factor),
            Math.round(bitmap.height * factor),
          );
        canvas
          .getContext("2d")
          .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL();
        draftPhotos.push({
          id: "draft-photo-" + draftPhotos.length,
          name: filename,
          data,
          original: data,
          width: canvas.width,
          height: canvas.height,
        });
        canvas.width = canvas.height = 1;
      }
      window.draftCatalog = MKWContentDrafts.create({
        text: carouselDefault("text"),
        image: carouselDefault("image"),
        shape: carouselDefault("shape"),
        gradient: carouselDefault("gradient"),
        angle: carouselDefault("angle"),
        logo: seed.carousel.objects.find((o) => o.type === "logo"),
      });
      return {
        ids: draftCatalog.map((d) => d.id),
        library: await MKWTemplates.list(),
        projectId: p.projectId,
        revision,
        history: history.length,
        fonts: p.fonts.map((f) => f.role),
      };
    });
    assert.equal(setup.ids.length, 3);
    const summary = [];
    for (const id of setup.ids) {
      const result = await page.evaluate(async (id) => {
        const draft = draftCatalog.find((d) => d.id === id),
          template = MKWTemplateModel.validate(draft.template),
          source = JSON.stringify(template),
          values = {};
        for (const o of template.carousel.objects)
          if (MKWTemplateModel.imageLayer(o))
            values[o.id] = {
              image: draftPhotos[o.name.includes("Impression 2") ? 1 : 0],
            };
        const built = MKWTemplateModel.instantiate(template, {
            name: draft.name,
            values,
          }),
          q = MKWTemplates.documentFor(built),
          c = q.carousel;
        validate(q);
        validateCarousel(q);
        for (const [slide, frame] of c.artboards.entries()) {
          const texts = c.objects.filter(
            (o) => o.pageId === frame.id && o.type === "text",
          );
          const imageOnly =
            (id === "menschen" && slide === 1) ||
            (id === "bilderslider" && slide > 0);
          if (
            imageOnly
              ? texts.length !== 0
              : texts.length !== 1 || texts[0].textAlign !== "left"
          )
            throw Error(
              "Genau ein linksbündiges Textfeld pro Slide erforderlich",
            );
          if (texts[0] && texts[0].textStyles[0].size !== 64)
            throw Error("Übertitel muss 64 px haben");
        }
        if (id === "menschen") {
          if (c.n !== 3) throw Error("Nahe am Orchester braucht drei Slides");
          const on = (slide, type) =>
            c.objects.filter(
              (o) => o.pageId === c.artboards[slide].id && o.type === type,
            );
          const logo = on(0, "logo")[0],
            photo = on(0, "image")[0],
            text = on(0, "text")[0];
          if (!(logo.y + logo.h <= photo.y && photo.y + photo.h < text.y))
            throw Error("Logo–Bild–Text Reihenfolge verletzt");
          const inset = on(1, "image")[0],
            frame = c.artboards[1];
          if (!(inset.w < frame.w && inset.x + inset.w === frame.x + frame.w))
            throw Error("Zweites Bild muss schmaler und rechtsbündig sein");
          if (
            on(2, "image").length ||
            on(2, "text")[0].font !== "Harriet Regular"
          )
            throw Error("Textfolie benötigt Harriet und kein Hintergrundbild");
        }
        if (id === "bilderslider") {
          const photos = c.objects.filter((o) => o.type === "image");
          if (
            photos.length !== 4 ||
            c.objects.filter((o) => o.type === "text").length !== 1
          )
            throw Error(
              "Slider benötigt vier Bildplätze und nur einen Titelblock",
            );
          for (const seam of [1080, 2160])
            if (!photos.some((o) => o.x < seam && o.x + o.w > seam))
              throw Error("Bildbrücke über Slide-Grenze fehlt");
          const angle = c.objects.find((o) => o.type === "angle");
          if (
            !angle ||
            angle.direction !== "left" ||
            angle.pageId !== c.artboards[1].id
          )
            throw Error("Linker Winkel auf Slide 2 fehlt");
          if (c.objects.some((o) => o.pageId === c.artboards[2].id))
            throw Error("Slide 3 soll ohne eigene Ebenen offen bleiben");
          const second = c.artboards[1];
          if (
            photos.filter(
              (o) => o.x < second.x + second.w && o.x + o.w > second.x,
            ).length !== 3
          )
            throw Error("Slide 2 benötigt drei darüberliegende Bilder");
        }
        for (const o of c.objects.filter((o) => o.type === "gradient"))
          if (o.opacity !== 0.39 || o.blend !== "multiply")
            throw Error("Verlauf muss multipliziert mit 39 Prozent sein");
        const layouts = c.objects
          .filter((o) => o.type === "text")
          .map((o) => ({
            name: o.name,
            text: o.text,
            height: carouselTextHeight(o),
            frame: o.h,
            maxWidth: Math.max(
              ...carouselTextLayout(o).lines.map((l) => l.width),
            ),
            width: o.w,
          }));
        const overflows = layouts.filter(
          (l) => l.height > l.frame + 1 || l.maxWidth > l.width + 1,
        );
        const bytes = await MKWProjectFile.encode(q),
          roundtrip = MKWProjectAssets.hydrate(
            await MKWProjectFile.decode(bytes),
          );
        validate(roundtrip);
        validateCarousel(roundtrip);
        if (JSON.stringify(q.carousel) !== JSON.stringify(roundtrip.carousel))
          throw Error("MKW-Layout änderte sich beim Rundlauf");
        const render = async (project, slide, scale) => {
          const frame = MKWCarouselPolicy.frame(project.carousel, slide),
            canvas = makeCanvas(
              Math.round(frame.w * scale),
              Math.round(frame.h * scale),
            );
          await carouselPaint(
            exportContext(canvas),
            slide,
            scale,
            false,
            null,
            null,
            () => true,
            image,
            project,
          );
          const data = canvas.toDataURL("image/png");
          canvas.width = canvas.height = 1;
          return data;
        };
        const previews = [];
        for (let slide = 0; slide < c.n; slide++) {
          const original = await render(q, slide, 0.5),
            restored = await render(roundtrip, slide, 0.5);
          if (original !== restored)
            throw Error("Pixel änderten sich beim MKW-Rundlauf");
          previews.push(original);
        }
        const seamComparisons = [];
        if (id === "bilderslider") {
          // Check both sides of every seam against the continuous artwork.
          // Focus on the photo joins: SVG logo rasterization away from a seam can vary with canvas width.
          const scale = 1,
            whole = makeCanvas(c.w * c.n * scale, c.h * scale);
          await carouselPaint(
            exportContext(whole),
            null,
            scale,
            false,
            null,
            null,
            () => true,
            image,
            q,
          );
          for (let slide = 0; slide < c.n; slide++) {
            const bitmap = await createImageBitmap(
              await (await fetch(await render(q, slide, scale))).blob(),
            );
            const part = makeCanvas(bitmap.width, bitmap.height),
              ctx = exportContext(part);
            ctx.drawImage(bitmap, 0, 0);
            const actual = ctx.getImageData(
              0,
              0,
              bitmap.width,
              bitmap.height,
            ).data;
            const expected = whole
              .getContext("2d")
              .getImageData(
                slide * bitmap.width,
                0,
                bitmap.width,
                bitmap.height,
              ).data;
            let maxDiff = 0,
              absoluteError = 0,
              samples = 0;
            for (let i = 0; i < actual.length; i++) {
              const x = Math.floor(i / 4) % bitmap.width;
              const atSeam =
                (slide > 0 && x < 32) ||
                (slide < c.n - 1 && x >= bitmap.width - 32);
              if (!atSeam) continue;
              const difference = Math.abs(actual[i] - expected[i]);
              maxDiff = Math.max(maxDiff, difference);
              absoluteError += difference;
              samples++;
            }
            const meanError = absoluteError / samples;
            seamComparisons.push({
              slide: slide + 1,
              maxChannelDifference: maxDiff,
              meanChannelDifference: meanError,
            });
            // Canvas drawImage can quantize a few clipped, scaled photo-edge samples differently.
            // A displaced crop or visible gap fails both this tight mean and the channel bound.
            if (maxDiff > 8 || meanError > 0.05)
              throw Error(
                `Bildübergang Slide ${slide + 1}: Maximum ${maxDiff}, Mittel ${meanError}`,
              );
            bitmap.close();
            part.width = part.height = 1;
          }
          whole.width = whole.height = 1;
        }
        // Exercise real content slots with a longer title and sentence, not only the default copy.
        const variant = clone(q),
          title = variant.carousel.objects.find((o) =>
            /^Übertitel und Titel /.test(o.name),
          );
        if (title) {
          const main = title.characterStyles.find((r) => r.uppercase);
          const firstBreak = title.text.indexOf("\n");
          Object.assign(
            title,
            MKWTextEdit.replace(
              title,
              firstBreak + 1,
              main.end,
              {
                text:
                  id === "bilderslider"
                    ? "DIESER MOMENT.\nBLEIBT IM OHR."
                    : "EIN BESONDERER\nKONZERTABEND",
              },
              false,
            ),
          );
        }
        const edited = MKWProjectAssets.hydrate(
          await MKWProjectFile.decode(await MKWProjectFile.encode(variant)),
        );
        validate(edited);
        validateCarousel(edited);
        const titleFits = !title || carouselTextHeight(title) <= title.h + 1;
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.readAsDataURL(bytes);
        });
        if (JSON.stringify(template) !== source)
          throw Error("Vorlage wurde beim Befüllen verändert");
        return {
          id: draft.id,
          name: draft.name,
          purpose: draft.purpose,
          replace: draft.replace,
          template,
          overflows,
          seamComparisons,
          titleFits,
          titleHeight: title ? carouselTextHeight(title) : 0,
          previews,
          file: base64,
          layers: c.objects.length,
          slides: c.n,
          fonts: q.fonts.map((f) => f.role),
          photoSlots: MKWTemplateModel.requirements(template).length,
        };
      }, id);
      await fs.writeFile(
        path.join(output, `${id}.json`),
        JSON.stringify(result.template, null, 2) + "\n",
      );
      await fs.writeFile(
        path.join(output, `${id}.mkw`),
        Buffer.from(result.file, "base64"),
      );
      for (const [i, data] of result.previews.entries())
        await fs.writeFile(
          path.join(output, `${id}-${i + 1}.png`),
          Buffer.from(data.split(",")[1], "base64"),
        );
      summary.push({
        id,
        name: result.name,
        purpose: result.purpose,
        replace: result.replace,
        layers: result.layers,
        slides: result.slides,
        photoSlots: result.photoSlots,
        overflows: result.overflows,
        seamComparisons: result.seamComparisons,
        titleFits: result.titleFits,
        titleHeight: result.titleHeight,
      });
      console.log(JSON.stringify(summary.at(-1)));
    }
    const after = await page.evaluate(async () => ({
      library: await MKWTemplates.list(),
      projectId: p.projectId,
      revision,
      history: history.length,
    }));
    assert.deepEqual(
      after.library,
      setup.library,
      "Draft generation cannot alter the shipped or device library",
    );
    assert.equal(after.projectId, setup.projectId);
    assert.equal(after.revision, setup.revision);
    assert.equal(after.history, setup.history);
    assert.deepEqual(errors, []);
    await fs.writeFile(
      path.join(output, "verification.json"),
      JSON.stringify(
        {
          engine: process.env.MKW_TEST_BROWSER || "chromium",
          summary,
          libraryUnchanged: true,
          activeProjectUnchanged: true,
          mkwRoundtripPixelEqual: true,
          carouselSeamStripsVerified: true,
          seamMaximumChannelDifference: 8,
          seamMaximumMeanChannelDifference: 0.05,
          seamStripWidthPixels: 32,
          previewScale: 0.5,
          seamComparisonScale: 1,
        },
        null,
        2,
      ) + "\n",
    );
    const overflows = summary.flatMap((s) =>
      s.overflows.map((o) => ({ draft: s.id, ...o })),
    );
    assert.deepEqual(
      overflows,
      [],
      "Every default text must fit its editable frame",
    );
    assert(
      summary.every((s) => s.titleFits),
      "Representative longer title must fit",
    );
    console.log(
      "PASS three asset-free draft templates, editable MKW roundtrip with identical pixels, complete layers, content replacement and unchanged library/project",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
