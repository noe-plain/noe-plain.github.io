const assert = require("node:assert/strict"),
  { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1650, height: 1150 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Direkte Texteingabe");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy && !!fontStatus["Harriet"]);
    await page.addStyleTag({
      content: `#carouselGuides,#carouselSelectionOverlay,#carouselSlideControls,#carouselSnapOverlay,.safe-zone,.text-group-move,.post-stack-gap {visibility:hidden!important}.mkw-inline-input,.text-editor,.text-group {outline:0!important;background:transparent!important;caret-color:transparent!important}.mkw-inline-input::selection,.mkw-inline-input *::selection {background:transparent!important}`,
    });
    const settle = async () => {
      await page.evaluate(async () => {
        await draw();
        for (
          let i = 0;
          i < 100 &&
          (carouselPaintPending ||
            carouselPaintRunning ||
            drawing ||
            drawAgain);
          i++
        )
          await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
    };
    const view = () =>
      page.evaluate(() => {
        const v = document.querySelector(
          p.carousel ? "#carouselViewport" : "#workspace",
        );
        return [v.scrollLeft, v.scrollTop];
      });
    const shot = async (selector) => {
      await page.evaluate(() => getSelection().removeAllRanges());
      await page.mouse.move(1550, 35);
      const clip = await page.locator(selector).evaluate((el) => {
        const r = el.getBoundingClientRect(),
          v = document
            .querySelector(p.carousel ? "#carouselViewport" : "#workspace")
            .getBoundingClientRect(),
          x = Math.max(r.left, v.left + 1),
          y = Math.max(r.top, v.top + 1);
        return {
          x,
          y,
          width: Math.min(r.right, v.right - 1) - x,
          height: Math.min(r.bottom, v.bottom - 1) - y,
        };
      });
      return page.screenshot({ clip });
    };
    for (const [advanced, font, align] of [
      [false, "Replica LL", "left"],
      [true, "Harriet", "right"],
      [true, "Harriet Italic", "center"],
      [true, "Replica LL", "justify"],
    ]) {
      await page.evaluate(
        ([advanced, font, textAlign]) => {
          carouselEndText();
          studioPreferences.advanced = advanced;
          studioApplyPreferences();
          p.carousel.objects = [];
          carouselObject("text", {
            x: 160,
            y: 250,
            w: 740,
            h: 650,
            size: 65,
            font,
            color: "#172238",
            textAlign,
            textAnchor: "bottom",
            text: "Musik verbindet Menschen und schafft besondere Begegnungen.\nGemeinsam erleben wir neue Klangwelten.",
          });
          if (advanced)
            carouselSelected()[0].characterStyles = [
              { start: 0, end: 5, font: "Harriet Italic", size: 80 },
              { start: 7, end: 9, script: "superscript" },
            ];
          carouselZoom = 0.65;
          carouselRefresh();
          const v = document.querySelector("#carouselViewport");
          v.scrollLeft += 80;
          v.scrollTop += 55;
        },
        [advanced, font, align],
      );
      if (align === "justify")
        await page.evaluate(() => MKWTextHyphen.ensure());
      await settle();
      const before = await shot("#carouselCanvas"),
        position = await view(),
        source = await page.evaluate(() => carouselSelected()[0].text);
      await page.locator("#carouselTextEdit").click();
      await settle();
      assert.deepEqual(
        await view(),
        position,
        "Entering text must not pan the carousel",
      );
      assert(
        before.equals(await shot("#carouselCanvas")),
        `${font}/${align} must look identical while editing`,
      );
      assert.equal(
        await page.evaluate(() => carouselEditableValue(carouselUI.editing.el)),
        source,
      );
      const delta = await page.evaluate(() => {
        const o = carouselSelected()[0],
          l = carouselTextLayout(o),
          line = l.lines[0],
          run = line.runs[0],
          span = carouselUI.editing.el.querySelector(
            "[data-text-start] > span",
          ),
          marker = document.createElement("i");
        marker.style.cssText =
          "display:inline-block;vertical-align:baseline;width:0;height:0;margin:0;padding:0;border:0";
        span.prepend(marker);
        const actual = marker.getBoundingClientRect(),
          a = document
            .querySelector("#carouselArtwork")
            .getBoundingClientRect(),
          point = carouselToWorld(o, {
            x: line.x + run.x,
            y:
              carouselTextOffset(o, l) +
              line.y +
              run.dy +
              carouselTypeBaseline(carouselMeasureContext, run.font, run.size),
          });
        marker.remove();
        return {
          x: actual.left - (a.left + point.x * carouselZoom),
          y: actual.top - (a.top + point.y * carouselZoom),
          scroll: carouselUI.editing.el.scrollTop,
        };
      });
      assert(
        Math.abs(delta.x) < 1 && Math.abs(delta.y) < 1,
        JSON.stringify(delta),
      );
      assert.equal(delta.scroll, 0);
      await page.evaluate(() => {
        const el = carouselUI.editing.el;
        MKWTypography.restoreSelection(el, { start: 6, end: 6 });
      });
      await page.keyboard.insertText("X");
      await page.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
      assert.deepEqual(
        await view(),
        position,
        "Typing must not pan the carousel",
      );
      assert.equal(
        await page.evaluate(() => carouselSelected()[0].text),
        source.slice(0, 6) + "X" + source.slice(6),
      );
      await page.keyboard.press("ControlOrMeta+z");
      assert.equal(
        await page.evaluate(() => carouselSelected()[0].text),
        source,
      );
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => {
      const o = carouselSelected()[0];
      o.text = "";
      carouselEditText(o);
    });
    assert.equal(
      await page.locator(".carousel-inline-text [data-empty-run]").count(),
      1,
    );
    await page.evaluate(() => {
      const el = carouselUI.editing.el;
      el.dispatchEvent(new CompositionEvent("compositionstart"));
      el.textContent = "Grüsse";
      el.dispatchEvent(
        new InputEvent("input", {
          inputType: "insertCompositionText",
          isComposing: true,
        }),
      );
    });
    assert(await page.locator(".carousel-inline-text.mkw-composing").count());
    await page.evaluate(() =>
      carouselUI.editing.el.dispatchEvent(
        new CompositionEvent("compositionend", { data: "Grüsse" }),
      ),
    );
    assert.equal(
      await page.evaluate(() => carouselSelected()[0].text),
      "Grüsse",
    );
    assert.equal(await page.locator(".mkw-composing").count(), 0);
    await page.keyboard.press("Escape");
    await page.screenshot({ path: artifact("inline-fidelity-carousel.png") });
    const post = await browser.newPage({
      viewport: { width: 1650, height: 1150 },
    });
    post.on("pageerror", (e) => errors.push(e.message));
    await post.goto(process.env.STUDIO_URL);
    await post.locator("#startNew").click();
    await post.locator("#setupName").fill("Einzelpost Texteingabe");
    await post.locator("#createProject").click();
    await post.waitForFunction(() => !!fontStatus["Harriet"]);
    await post.addStyleTag({
      content: `.safe-zone,.text-group-move,.post-stack-gap{visibility:hidden!important}.text-editor,.text-group{outline:0!important;background:transparent!important;caret-color:transparent!important}.mkw-inline-input::selection,.mkw-inline-input *::selection{background:transparent!important}`,
    });
    for (const [advanced, font, align, family] of [
      [false, "Replica LL", "left", false],
      [true, "Harriet", "right", false],
      [false, "Replica LL", "center", true],
      [true, "Replica LL", "justify", false],
    ]) {
      await post.evaluate(
        ([advanced, font, align, family]) => {
          if (editingText) editingText.el.blur();
          studioPreferences.advanced = advanced;
          studioApplyPreferences();
          const c = makeCanvas(1600, 2000);
          c.getContext("2d").fillStyle = "#5e7781";
          c.getContext("2d").fillRect(0, 0, 1600, 2000);
          p.images = [
            {
              id: uid(),
              name: "Bild",
              width: 1600,
              height: 2000,
              data: c.toDataURL(),
            },
          ];
          p.boards = [];
          const b = createBoard(p.images[0], 1080, 1350);
          for (const k of ["date", "subtitle"]) {
            b.elements[k].enabled = false;
            b.elements[k].visible = false;
          }
          Object.assign(b.elements.title, {
            text: "Musik verbindet Menschen und schafft besondere Begegnungen.\nGemeinsam erleben wir neue Klangwelten.",
            size: 65,
            role: font,
            align,
            uppercase: false,
          });
          b.family = { enabled: family, background: "#ffffff", offset: 0 };
          if (advanced) b.elements.title.typographyVersion = 1;
          p.boards = [b];
          selected = b.id;
          step = "text";
          layer = "title";
          render();
          postSetZoom(1);
          const viewport = document.querySelector("#workspace");
          const canvas = document.querySelector("canvas[data-board]"),
            rect = canvas.getBoundingClientRect(),
            vp = viewport.getBoundingClientRect();
          viewport.scrollLeft += rect.left - vp.left - 80;
          viewport.scrollTop +=
            rect.top +
            textBlock(b, "title").mainRecords[0].y * surfaceScale() -
            vp.top -
            200;
        },
        [advanced, font, align, family],
      );
      if (align === "justify")
        await post.evaluate(() => MKWTextHyphen.ensure());
      await post.evaluate(async () => {
        await draw();
        while (drawing || drawAgain) await new Promise(requestAnimationFrame);
      });
      const state = () =>
          post.evaluate(() => {
            const b = p.boards[0],
              v = document.querySelector("#workspace");
            return {
              scroll: [v.scrollLeft, v.scrollTop],
              elements: JSON.stringify(b.elements),
              block: clone(textBlock(b, "title")),
            };
          }),
        before = await state();
      const snapshot = async () => {
          await post.evaluate(() => getSelection().removeAllRanges());
          await post.mouse.move(1550, 35);
          const box = await post
            .locator("canvas[data-board]")
            .evaluate((el) => {
              const r = el.getBoundingClientRect(),
                v = document
                  .querySelector("#workspace")
                  .getBoundingClientRect(),
                x = Math.max(r.left, v.left + 1),
                y = Math.max(r.top, v.top + 1);
              return {
                x,
                y,
                width: Math.min(r.right, v.right - 1) - x,
                height: Math.min(r.bottom, v.bottom - 1) - y,
              };
            });
          assert(
            box.width > 100 && box.height > 100,
            "Artboard must be visible in the screenshot",
          );
          return post.screenshot({ clip: box });
        },
        pixels = await snapshot();
      await post
        .locator(".text-editor[data-key=title]")
        .evaluate((el) => MKWInlineText.focus(el));
      await post.evaluate(async () => {
        await draw();
        while (drawing || drawAgain) await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
      const after = await state();
      assert.equal(
        after.elements,
        before.elements,
        "Focus must never change document typography",
      );
      assert.deepEqual(after.scroll, before.scroll);
      assert.deepEqual(after.block, before.block);
      const afterPixels = await snapshot();
      if (!pixels.equals(afterPixels)) {
        require("node:fs").writeFileSync(artifact("inline-before.png"), pixels);
        require("node:fs").writeFileSync(
          artifact("inline-after.png"),
          afterPixels,
        );
      }
      assert(
        pixels.equals(afterPixels),
        `${advanced}/${font}/${family} post appearance changed`,
      );
      const postDelta = await post.evaluate(() => {
        const b = p.boards[0],
          e = b.elements.title,
          block = textBlock(b, "title"),
          rec = block.records.find((e) => e.key === "title"),
          layout =
            rec.styled ||
            MKWTypography.postLayout(
              { ...e, key: "title" },
              rec.w,
              rec.size / e.size,
            ),
          line = layout.lines[0],
          run = line.runs[0],
          span = editingText.el.querySelector("[data-text-start]>span"),
          marker = document.createElement("i");
        marker.style.cssText =
          "display:inline-block;width:0;height:0;border:0;padding:0;margin:0;vertical-align:baseline";
        span.prepend(marker);
        const actual = marker.getBoundingClientRect(),
          surface = document
            .querySelector("canvas[data-board]")
            .getBoundingClientRect(),
          scale = surfaceScale();
        marker.remove();
        return {
          x: actual.left - (surface.left + (block.x + line.x + run.x) * scale),
          y:
            actual.top -
            (surface.top +
              (rec.y +
                line.y +
                run.dy +
                carouselTypeBaseline(
                  carouselMeasureContext,
                  run.font,
                  run.size,
                )) *
                scale),
        };
      });
      assert(
        Math.abs(postDelta.x) < 1 && Math.abs(postDelta.y) < 1,
        JSON.stringify(postDelta),
      );
      const source = await post.evaluate(() => p.boards[0].elements.title.text);
      assert.equal(
        await post.evaluate(() => carouselEditableValue(editingText.el)),
        source,
      );
      await post.evaluate(() =>
        MKWTypography.restoreSelection(editingText.el, { start: 6, end: 6 }),
      );
      await post.keyboard.insertText("X");
      await post.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
      });
      assert.deepEqual(
        (await state()).scroll,
        before.scroll,
        "Typing must not pan single posts",
      );
      assert.equal(
        await post.evaluate(() => p.boards[0].elements.title.text),
        source.slice(0, 6) + "X" + source.slice(6),
      );
      await post.keyboard.press("ControlOrMeta+z");
      assert.equal(
        await post.evaluate(() => p.boards[0].elements.title.text),
        source,
      );
      await post.keyboard.press("Escape");
    }
    await post.evaluate(async () => {
      setSharedText(p.boards[0], "title", "");
      await draw();
      const el = document.querySelector('.text-editor[data-key="title"]');
      MKWInlineText.focus(el);
    });
    assert.equal(
      await post
        .locator('.text-editor[data-key="title"] [data-empty-run]')
        .count(),
      1,
    );
    await post.evaluate(() => {
      const el = editingText.el;
      el.dispatchEvent(new CompositionEvent("compositionstart"));
      el.textContent = "Grüsse";
      el.dispatchEvent(
        new InputEvent("input", {
          inputType: "insertCompositionText",
          isComposing: true,
        }),
      );
      el.dispatchEvent(
        new CompositionEvent("compositionend", { data: "Grüsse" }),
      );
    });
    assert.equal(
      await post.evaluate(() => p.boards[0].elements.title.text),
      "Grüsse",
    );
    assert.equal(await post.locator(".mkw-composing").count(), 0);
    await post.keyboard.press("ControlOrMeta+z");
    assert.equal(
      await post.evaluate(() => p.boards[0].elements.title.text),
      "",
    );
    await post.keyboard.press("Escape");
    await post.screenshot({ path: artifact("inline-fidelity-post.png") });
    assert.deepEqual(errors, []);
    console.log(
      "Identical composited artwork during text editing, stable view/document, precise DOM baselines, simple/advanced/family text, range typing and undo passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
