const assert = require("node:assert/strict");
const fixtures = require("./fixtures/indesign-projects.json");
const { launch, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const fixture of fixtures) {
      const page = await browser.newPage({
          viewport: { width: 1500, height: 1100 },
        }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page
        .locator(fixture.mode === "carousel" ? "#startDesigner" : "#startNew")
        .click();
      if (fixture.mode === "post")
        await page.locator("[data-project-mode=post]").click();
      await page.locator("#setupName").fill(fixture.name);
      if (fixture.mode === "carousel") {
        await page.locator("#cw").fill(String(fixture.pages[0].w));
        await page.locator("#ch").fill(String(fixture.pages[0].h));
        await page.locator("#cn").fill(String(fixture.pages.length));
        if (fixture.layout === "free")
          await page.locator("[data-designer-layout=free]").click();
      }
      await page.locator("#createProject").click();
      await waitForProjectReady(page);
      const result = await page.evaluate(async (fixture) => {
        let im;
        if (fixture.asset || fixture.mode === "post") {
          const canvas = makeCanvas(64, 80),
            ctx = canvas.getContext("2d");
          ctx.fillStyle = "#23789a";
          ctx.fillRect(0, 0, 64, 80);
          ctx.fillStyle = "#e7b34c";
          ctx.fillRect(0, 0, 32, 40);
          const data = canvas.toDataURL();
          im = {
            id: uid(),
            name: "Synthetisches Prüfbild.png",
            data,
            original: data,
            width: 64,
            height: 80,
            captureDate: "",
            captureDay: "",
          };
          if (fixture.mode === "post") p.images.push(im);
        }
        if (fixture.mode === "carousel") {
          p.carousel.objects = [];
          if (fixture.layout === "free")
            fixture.pages.forEach((frame, i) =>
              MKWArtboardUI.apply(
                i,
                {
                  ...p.carousel.artboards[i],
                  ...frame,
                  name: "Prüfseite " + (i + 1),
                  bg: "#ffffff",
                },
                true,
              ),
            );
          for (const object of fixture.objects) {
            const properties = { ...object.properties };
            if (properties.imageId === "$image") {
              properties.imageId = im.id;
              if (!p.images.some((asset) => asset.id === im.id))
                p.images.push(im);
            }
            carouselObject(object.type, properties);
          }
        } else {
          p.boards = fixture.pages.map((format) =>
            createBoard(im, format.w, format.h),
          );
          for (const b of p.boards) {
            b.image = { ...b.image, ...fixture.image, x: b.w / 2, y: b.h / 2 };
            for (const e of Object.values(b.elements))
              if (e.role) e.role = "Arial";
            Object.assign(b.elements.title, {
              text: fixture.text,
              uppercase: false,
              size: 80,
              typographyVersion: 1,
              textStyles: [{ spaceAfter: 12 }, { align: "right" }],
              characterStyles: [{ start: 0, end: 5, color: "#c52242" }],
            });
          }
          selected = p.boards[0].id;
          step = "text";
          layer = "title";
          render();
        }
        const compact = MKWProjectAssets.compact(snapshot()),
          before = JSON.stringify(compact),
          hydrated = MKWProjectAssets.hydrate(clone(compact));
        validate(hydrated);
        validateCarousel(hydrated);
        const encoded = await MKWProjectFile.encode(compact),
          decoded = await MKWProjectFile.decode(encoded);
        validate(MKWProjectAssets.hydrate(clone(decoded)));
        validateCarousel(decoded);
        await restore(decoded);
        const restored = MKWProjectAssets.compact(snapshot());
        const differences = [];
        function compare(a, b, path = "") {
          if (JSON.stringify(a) === JSON.stringify(b)) return;
          if (
            Array.isArray(a) !== Array.isArray(b) ||
            (Array.isArray(a) && a.length !== b.length)
          ) {
            differences.push({
              path,
              before: Array.isArray(a) ? ["array", a.length] : typeof a,
              after: Array.isArray(b) ? ["array", b.length] : typeof b,
            });
            return;
          }
          if (a && b && typeof a === "object" && typeof b === "object")
            for (const key of new Set([...Object.keys(a), ...Object.keys(b)]))
              compare(a[key], b[key], path + "." + key);
          else
            differences.push({
              path,
              before:
                typeof a === "string" && a.length > 200 ? "[long string]" : a,
              after:
                typeof b === "string" && b.length > 200 ? "[long string]" : b,
            });
        }
        compare(compact, restored);
        return {
          differences,
          sourceStable: JSON.stringify(compact) === before,
          // JSON member order may change when assets are rehydrated; every
          // source field, array position and value must still match exactly.
          roundtrip: differences.length === 0,
          pages: p.boards.map((b) => [b.w, b.h]),
          texts: p.carousel
            ? p.carousel.objects
                .filter((o) => o.type === "text")
                .map((o) => o.text)
            : p.boards.map((b) => b.elements.title.text),
          hidden: p.carousel?.objects.filter((o) => !o.visible).length || 0,
          flips: p.carousel
            ? p.carousel.objects
                .filter((o) => o.type === "image")
                .map((o) => o.flipX)
            : p.boards.map((b) => b.image.flipX),
        };
      }, fixture);
      assert(
        result.sourceStable,
        fixture.id + ": validation/serialization must preserve the source",
      );
      assert(
        result.roundtrip,
        fixture.id +
          ": complete MKW save/read/restore must retain all source data: " +
          JSON.stringify(result.differences),
      );
      assert.deepEqual(
        result.pages,
        fixture.pages.map((f) => [f.w, f.h]),
      );
      assert.deepEqual(
        result.pages.map(([w, h]) => [w * 0.75, h * 0.75]),
        fixture.expectedPagePoints,
      );
      assert.deepEqual(
        result.texts,
        fixture.mode === "carousel"
          ? fixture.objects
              .filter((o) => o.type === "text")
              .map((o) => o.properties.text)
          : fixture.pages.map(() => fixture.text),
      );
      if (fixture.id === "designer-free-effects") {
        assert.equal(result.hidden, 1);
        assert.deepEqual(result.flips, [-1]);
      }
      if (fixture.mode === "post") assert.deepEqual(result.flips, [-1, -1]);
      assert.deepEqual(errors, []);
      console.log(
        "PASS IDML source recipe " +
          fixture.id +
          ": validation, Unicode/styles/geometry/assets and complete MKW roundtrip; no IDML generated",
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
