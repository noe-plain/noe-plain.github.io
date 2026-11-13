const assert = require("node:assert/strict");
const {
  launch,
  waitForProjectReady,
  canvasTextRange,
  artifact,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["carousel", "preview", "post"]) {
      const page = await browser.newPage({
          viewport: { width: 1600, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page
        .locator(
          mode === "carousel"
            ? "#startDesigner"
            : mode === "preview"
              ? "#startCampaignPreview"
              : "#startNew",
        )
        .click();
      await page.locator("#setupName").fill("Textwerkzeuge " + mode);
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      await page.evaluate(async (mode) => {
        const text = "Gross und klein\nZweite\u2028Zeile",
          format = {
            text,
            size: 60,
            font: "Replica LL",
            role: "Replica LL",
            color: "#172238",
            uppercase: false,
            baselineShift: 2,
            lineHeight: 0.95,
            characterStyles: [
              {
                start: 0,
                end: 5,
                size: 90,
                color: "#cf1234",
                underline: true,
                baselineShift: 3,
              },
            ],
            textStyles: [
              { size: 70, align: "center", spaceAfter: 12 },
              { size: 40, lineHeight: 1.2, leading: [48, 52] },
            ],
          };
        if (mode === "carousel") {
          carouselObject("text", { ...format, x: 100, y: 200, w: 600, h: 350 });
          return;
        }
        const canvas = makeCanvas(64, 64),
          data = canvas.toDataURL(),
          images = [0, 1].map((i) => ({
            id: uid(),
            name: "Foto " + i + ".png",
            width: 64,
            height: 64,
            data,
            original: data,
          }));
        if (mode === "preview") {
          const q = {
            ...snapshot(),
            campaign: MKWCampaignUI.newState(),
            images,
            boards: [],
            carousel: undefined,
          };
          for (const im of images)
            await MKWCampaignDocument.append(q, im, [
              basicBoard(im, 1080, 1350),
            ]);
          MKWCampaignModel.reconcile(q, uid);
          await MKWProjects.startDocument(q);
          const a = p.carousel.artboards[0];
          carouselObject("text", {
            ...format,
            x: a.x + 100,
            y: a.y + 200,
            w: 600,
            h: 350,
          });
        } else {
          p.images = images;
          p.boards = images.map((im) => basicBoard(im, 1080, 1350));
          for (const b of p.boards)
            Object.assign(b.elements.title, clone(format), {
              visible: true,
              enabled: true,
            });
          selected = p.boards[0].id;
          step = "text";
          layer = "title";
          changed();
        }
      }, mode);
      const source = await page.evaluate(() => {
        const o = p.carousel ? carouselSelected()[0] : board().elements.title;
        window.testSourceId = o.id;
        return clone(o);
      });
      await canvasTextRange(page, 0, source.text.length);
      const copied = await page.evaluate(() => {
        const el = p.carousel ? carouselUI.editing.el : editingText.el;
        window.testClip = new DataTransfer();
        el.dispatchEvent(
          new ClipboardEvent("copy", {
            clipboardData: testClip,
            bubbles: true,
            cancelable: true,
          }),
        );
        return {
          plain: testClip.getData("text/plain"),
          html: testClip.getData("text/html"),
          packet: testClip.getData("application/x-mkw-text"),
        };
      });
      assert.equal(copied.plain, source.text);
      assert(copied.html.includes("data-mkw-rich"));
      assert(
        JSON.parse(copied.packet).characterStyles.some((s) => s.size === 90),
      );
      await page.keyboard.press("ControlOrMeta+c");
      await page.keyboard.press("Escape");
      await page.evaluate((mode) => {
        if (mode === "carousel") {
          carouselObject("text", {
            text: "Vorher Nachher",
            x: 100,
            y: 400,
            w: 600,
            h: 300,
            size: 28,
            font: "Replica LL",
            color: "#125678",
          });
        } else if (mode === "preview") {
          const other = p.carousel.objects.find(
            (o) => o.type === "text" && o.id !== testSourceId,
          );
          Object.assign(other, {
            text: "Vorher Nachher",
            characterStyles: [],
            textStyles: [],
            size: 28,
            color: "#125678",
          });
          changed(false);
          carouselSelect([other.id]);
          carouselSlideCenter(1);
        } else {
          selected = p.boards[1].id;
          chooseStep("text");
          setSharedText(board(), "title", "Vorher Nachher");
          Object.assign(board().elements.title, {
            characterStyles: [],
            textStyles: [],
            size: 28,
            color: "#125678",
          });
          changed();
        }
      }, mode);
      const target = await page.evaluate(() =>
        clone(p.carousel ? carouselSelected()[0] : board().elements.title),
      );
      await canvasTextRange(page, 6, 6);
      await page.keyboard.press("ControlOrMeta+v");
      await page.waitForFunction(() =>
        (p.carousel
          ? carouselSelected()[0]
          : board().elements.title
        ).text.includes("Gross und klein"),
      );
      let result = await page.evaluate(() =>
        clone(p.carousel ? carouselSelected()[0] : board().elements.title),
      );
      assert.equal(result.text, "Vorher" + source.text + " Nachher");
      assert(
        result.characterStyles.some(
          (s) => s.start === 6 && s.size === 90 && s.underline,
        ),
      );
      await page.keyboard.press("ControlOrMeta+z");
      assert.equal(
        await page.evaluate(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title).text,
        ),
        target.text,
      );
      await page.keyboard.press("ControlOrMeta+Shift+z");
      assert.equal(
        await page.evaluate(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title).text,
        ),
        result.text,
      );
      await page.keyboard.press("ControlOrMeta+z");
      await canvasTextRange(page, 0, target.text.length);
      await page.evaluate(() => {
        const el = p.carousel ? carouselUI.editing.el : editingText.el;
        el.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "v",
            ctrlKey: true,
            shiftKey: true,
            bubbles: true,
          }),
        );
        el.dispatchEvent(
          new ClipboardEvent("paste", {
            clipboardData: testClip,
            bubbles: true,
            cancelable: true,
          }),
        );
      });
      result = await page.evaluate(() =>
        clone(p.carousel ? carouselSelected()[0] : board().elements.title),
      );
      assert.equal(result.text, source.text);
      assert(
        !result.characterStyles.some(
          (s) => s.size === 90 || s.color === "#cf1234",
        ),
      );
      await page.keyboard.press("Escape");
      await page.locator("[data-text-clipboard]").click();
      assert(await page.locator("#textClipboardMenu").isVisible());
      await page.keyboard.press("Escape");
      if (browser.browserType().name() === "chromium") {
        await page
          .context()
          .grantPermissions(["clipboard-read", "clipboard-write"]);
        await canvasTextRange(page, 0, 5);
        await page.locator("[data-text-clipboard]").click();
        await page.locator("[data-text-clipboard-action=copyPlain]").click();
        await page.waitForFunction(
          async () => (await navigator.clipboard.readText()) === "Gross",
        );
        const types = await page.evaluate(
          async () => (await navigator.clipboard.read())[0].types,
        );
        assert(
          !types.includes("text/html"),
          "Nur Text kopieren does not leave source formatting on the system clipboard",
        );
        await page.locator("[data-text-clipboard]").click();
        await page.locator("[data-text-clipboard-action=copy]").click();
        await page.waitForFunction(async () => {
          const items = await navigator.clipboard.read();
          return items[0].types.includes("text/html");
        });
        await canvasTextRange(page, 0, source.text.length);
        await page.locator("[data-text-clipboard]").click();
        await page.locator("[data-text-clipboard-action=pastePlain]").click();
        await page.waitForFunction(
          () =>
            (p.carousel ? carouselSelected()[0] : board().elements.title)
              .text === "Gross",
        );
        await page.keyboard.press("Escape");
      }
      const external = await page.evaluate(() =>
        MKWTextClipboard.fromHTML(
          '<p style="font-family:Replica LL;font-size:32px;color:#112233;text-align:right">Hallo <u>Welt</u><script>window.evil=1</script><img src="https://invalid.example/no.png"></p>',
          p.carousel ? carouselSelected()[0] : board().elements.title,
          "",
        ),
      );
      assert.equal(external.text, "Hallo Welt");
      assert(external.characterStyles.some((s) => s.underline));
      assert.equal(external.textStyles[0].align, "right");
      assert.equal(await page.evaluate(() => window.evil), undefined);
      if (mode !== "post") {
        await page.evaluate(() => {
          const o = p.carousel.objects.find((o) => o.id === testSourceId);
          carouselSelect([o.id]);
          carouselSlideCenter(0);
        });
        const before = await page.evaluate(() => clone(carouselSelected()[0]));
        await page.locator("[data-text-scale-percent]").fill("10000");
        await page.locator("[data-text-scale-apply]").click();
        assert.equal(
          await page
            .locator("[data-text-scale-percent]")
            .getAttribute("aria-invalid"),
          "true",
        );
        assert.deepEqual(
          await page.evaluate(() => clone(carouselSelected()[0])),
          before,
        );
        await page.locator("[data-text-scale-percent]").fill("150");
        await page.locator("[data-text-scale-apply]").click();
        let scaled = await page.evaluate(() => clone(carouselSelected()[0]));
        assert.equal(scaled.w, before.w * 1.5);
        assert.equal(scaled.size, before.size * 1.5);
        assert.equal(
          scaled.characterStyles[0].size,
          before.characterStyles[0].size * 1.5,
        );
        assert.equal(scaled.textStyles[0].spaceAfter, 18);
        assert.equal(scaled.textStyles[1].leading[1], 78);
        await page.locator("[data-text-resize=scale]").click();
        const geometry = await page.evaluate(() =>
          clone(carouselSelected()[0]),
        );
        const handle = await page
          .locator(".carousel-handle[data-corner=se]")
          .boundingBox();
        await page.keyboard.down("Control");
        await page.mouse.move(
          handle.x + handle.width / 2,
          handle.y + handle.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          handle.x + handle.width / 2 + 25,
          handle.y + handle.height / 2 + 20,
          { steps: 4 },
        );
        await page.mouse.up();
        await page.keyboard.up("Control");
        scaled = await page.evaluate(() => clone(carouselSelected()[0]));
        const ratio = scaled.w / geometry.w;
        assert(ratio > 1);
        assert(Math.abs(scaled.size / geometry.size - ratio) < 0.001);
        assert(
          Math.abs(
            scaled.characterStyles[0].size / geometry.characterStyles[0].size -
              ratio,
          ) < 0.001,
        );
        await page.evaluate(() => {
          const o = carouselSelected()[0];
          MKWText.changeCharacters(o, null, { family: true });
          changed(false);
        });
        assert(
          await page.evaluate(
            () =>
              new Set(
                carouselTextLayout(carouselSelected()[0]).lines.flatMap((l) =>
                  l.runs.map((r) => r.color),
                ),
              ).size > 1,
          ),
        );
        await page.evaluate(() => {
          const o = carouselSelected()[0];
          MKWText.changeCharacters(o, null, {
            family: false,
            color: "#004400",
          });
          changed(false);
        });
        assert(
          await page.evaluate(() =>
            carouselTextLayout(carouselSelected()[0])
              .lines.flatMap((l) => l.runs)
              .every((r) => !r.family && r.color === "#004400"),
          ),
        );
      }
      assert(
        await page.evaluate(async () => {
          const q = MKWProjectAssets.hydrate(
            await MKWProjectFile.decode(
              await MKWProjectFile.encode(snapshot()),
            ),
          );
          validate(q);
          validateCarousel(q);
          return true;
        }),
      );
      await page.screenshot({
        path: artifact("text-workflow-" + mode + ".png"),
      });
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        "PASS rich/plain copy/paste, soft breaks, local undo/redo, safe HTML, resize and file:",
        mode,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
