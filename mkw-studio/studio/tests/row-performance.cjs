const assert = require("node:assert/strict"),
  fs = require("node:fs");
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
    await page.locator("#setupName").fill("Reihen-Leistung");
    await page.locator("#cw").fill("400");
    await page.locator("#ch").fill("500");
    await page.locator("#cn").fill("3");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const results = await page.evaluate(async () => {
      MKWSpreadUI.commit({ type: "enable" });
      const baseline = snapshot(),
        assets = [];
      for (let i = 0; i < 50; i++) {
        const c = makeCanvas(640, 480),
          g = exportContext(c),
          gradient = g.createLinearGradient(0, 0, 640, 480);
        gradient.addColorStop(0, `hsl(${i * 7},65%,35%)`);
        gradient.addColorStop(1, "#eee8d8");
        g.fillStyle = gradient;
        g.fillRect(0, 0, 640, 480);
        const data = c.toDataURL();
        assets.push({
          id: "performance-photo-" + i,
          name: "Eigenes Testbild " + i,
          data,
          original: data,
          width: 640,
          height: 480,
        });
        c.width = c.height = 1;
      }
      const output = [];
      for (const [rows, slides] of [
        [1, 3],
        [3, 3],
        [10, 20],
      ]) {
        p.carousel = clone(baseline.carousel);
        p.boards = clone(baseline.boards);
        p.images = [...baseline.images];
        p.carousel.objects = [];
        if (slides !== 3)
          MKWSpreadUI.commit({
            type: "resize-spread",
            ids: [p.carousel.artboards[0].id],
            count: slides,
          });
        for (let r = 1; r < rows; r++)
          MKWSpreadUI.commit({ type: "add", count: slides, spread: true });
        p.images = [...baseline.images, ...assets];
        const c = p.carousel;
        for (const [i, a] of c.artboards.entries()) {
          c.objects.push(
            carouselDefault("image", {
              id: "perf-image-" + i,
              imageId: assets[i % 50].id,
              x: a.x,
              y: a.y,
              w: a.w,
              h: a.h,
              pageId: a.id,
              artboardScoped: true,
            }),
          );
          c.objects.push(
            carouselDefault("text", {
              id: "perf-text-" + i,
              text: "MUSIK\nEine gemeinsame Reihe",
              size: 26,
              x: a.x + 20,
              y: a.y + 80,
              w: 340,
              h: 120,
              pageId: a.id,
              artboardScoped: true,
            }),
          );
        }
        const first = c.artboards[0];
        c.folders = [
          {
            id: "perf-folder",
            name: "Prüfgruppe",
            visible: true,
            locked: false,
          },
        ];
        c.objects.push(
          carouselDefault("shape", {
            id: "perf-visible-shape",
            folderId: "perf-folder",
            fill: "#ff0011",
            strokeWidth: 0,
            x: first.x + 40,
            y: first.y + 250,
            w: 180,
            h: 100,
            pageId: first.id,
            artboardScoped: true,
          }),
        );
        changed();
        carouselSlideCenter(0);
        carouselSetZoom(1);
        carouselRefresh();
        await carouselWaitForPaint();
        await new Promise((r) => setTimeout(r, 100));
        const canvas = $("#carouselCanvas"),
          region = canvas._region;
        const native = carouselPaint;
        let calls = 0;
        carouselPaint = async (...args) => {
          calls++;
          return native(...args);
        };
        const invisible = c.objects.findLast(
            (o) =>
              region &&
              !MKWCarouselPolicy.intersects(carouselPaintBounds(o), region),
          ),
          times = [];
        let idleCalls = 0;
        if (invisible) {
          for (let i = 0; i < 5; i++) {
            const t = performance.now();
            invisible.x++;
            carouselRefresh();
            await carouselWaitForPaint();
            times.push(performance.now() - t);
          }
          idleCalls = calls;
        }
        calls = 0;
        const moving = c.objects.find((o) => o.id === "perf-visible-shape");
        for (let i = 0; i < 100; i++) {
          moving.x += 0.01;
          carouselRefresh();
        }
        await carouselWaitForPaint();
        const burstCalls = calls;
        calls = 0;
        const hash = () => {
          const g = canvas.getContext("2d"),
            a = g.getImageData(0, 0, canvas.width, canvas.height).data;
          let h = 0;
          for (let i = 0; i < a.length; i += 4)
            h = (Math.imul(h, 31) + a[i]) | 0;
          return h;
        };
        const before = hash();
        c.folders[0].visible = false;
        carouselRefresh();
        await carouselWaitForPaint();
        const after = hash();
        carouselPaint = native;
        validate(snapshot());
        validateCarousel(snapshot());
        output.push({
          rows,
          slidesPerRow: slides,
          totalSlides: c.n,
          objects: c.objects.length,
          usedImages: p.images.length,
          canvasPixels: canvas.width * canvas.height,
          offscreenObject: !!invisible,
          offscreenPaints: idleCalls,
          offscreenRefreshMs: times,
          burstPaints: burstCalls,
          folderInvalidated: before !== after,
        });
      }
      return output;
    });
    fs.writeFileSync(
      artifact("row-performance-results.json"),
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
    for (const r of results) {
      assert(r.canvasPixels <= 4200000, "Preview raster remains bounded");
      assert(r.burstPaints <= 2, "Pointer bursts coalesce");
      if (r.offscreenObject)
        assert.equal(
          r.offscreenPaints,
          0,
          "Edits in offscreen rows must not repaint unchanged visible artwork",
        );
      assert(
        r.folderInvalidated,
        "Folder visibility must invalidate the viewport",
      );
    }
    const scroll = await page.evaluate(async () => {
      const viewport = $("#carouselViewport"),
        canvas = $("#carouselCanvas");
      await carouselWaitForPaint();
      const before = {
        top: canvas.style.top,
        rect: JSON.stringify(canvas._region),
        pixel: Array.from(
          canvas.getContext("2d").getImageData(100, 100, 1, 1).data,
        ),
      };
      const normal = carouselPaint;
      let started, release;
      const active = new Promise((resolve) => (started = resolve));
      const hold = new Promise((resolve) => (release = resolve));
      carouselPaint = async (...args) => {
        started();
        await hold;
        return normal(...args);
      };
      try {
        viewport.scrollTop += 420;
        await active;
        const during = {
          top: canvas.style.top,
          rect: JSON.stringify(canvas._region),
          pixel: Array.from(
            canvas.getContext("2d").getImageData(100, 100, 1, 1).data,
          ),
        };
        const generation = carouselDraw;
        carouselSchedulePaint(canvas, canvas._requestedView);
        const reused = generation === carouselDraw;
        release();
        await carouselWaitForPaint();
        return { before, during, reused, after: canvas.style.top };
      } finally {
        release();
        carouselPaint = normal;
      }
    });
    assert.deepEqual(
      scroll.during,
      scroll.before,
      "Pending scroll paint must retain the old raster and its origin",
    );
    assert(scroll.reused, "Identical refresh must keep the in-progress paint");
    assert.notEqual(
      scroll.after,
      scroll.before.top,
      "Completed scroll paint publishes the new origin",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS 1/3/10 rows, up to 200 slides/401 objects/50 synthetic 640×480 images, bounded viewport, coalesced movement and correct folder/cache invalidation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
