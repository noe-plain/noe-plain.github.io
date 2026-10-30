const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const http = require("node:http");
const {
  launch,
  artifact,
  waitForProjectReady,
  openLatestProject,
} = require("./browser.cjs");
(async () => {
  const browser = await launch();
  const hubRoot = path.resolve(__dirname, "../.."),
    types = {
      ".html": "text/html",
      ".js": "text/javascript",
      ".css": "text/css",
      ".svg": "image/svg+xml",
      ".otf": "font/otf",
      ".wasm": "application/wasm",
    },
    server = http.createServer(async (request, response) => {
      try {
        const url = new URL(request.url, "http://localhost"),
          file = path.resolve(
            hubRoot,
            "." +
              decodeURIComponent(url.pathname) +
              (url.pathname.endsWith("/") ? "index.html" : ""),
          );
        assert(file.startsWith(hubRoot + path.sep));
        response.setHeader(
          "Content-Type",
          types[path.extname(file)] || "application/octet-stream",
        );
        response.end(await fs.readFile(file));
      } catch {
        response.writeHead(404);
        response.end("Not found");
      }
    });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const errors = [];
  const page = await browser.newPage({
    viewport: { width: 1480, height: 1000 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  const audit = async (page, selector) => {
    await page.waitForFunction(
      () =>
        !document.documentElement.classList.contains("studio-theme-changing"),
    );
    await page.evaluate(async () => {
      await Promise.allSettled(
        document
          .getAnimations()
          .filter((animation) =>
            Number.isFinite(animation.effect?.getComputedTiming().iterations),
          )
          .map((animation) => animation.finished),
      );
    });
    await page.addScriptTag({ content: require("axe-core").source });
    const issues = await page.evaluate(
      async (selector) =>
        (
          await axe.run(
            { include: [[selector]] },
            {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            },
          )
        ).violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      selector,
    );
    assert.deepEqual(issues, []);
  };
  try {
    const requests = [];
    page.on("request", (r) => requests.push(r.url()));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew:not([disabled])").waitFor();
    assert.equal(await page.locator("#startContinue").count(), 0);
    for (const name of [
      "#startNew",
      "#startDesigner",
      "#startTemplates",
      "#startOpen",
      "#startHelp",
      "#startSettings",
    ])
      assert(await page.locator(name).isVisible());
    assert(
      !requests.some((url) =>
        /\/hilfe\/|face\.tflite|person\.tflite/.test(url),
      ),
      "Start does not eagerly load handbook or recognition",
    );
    await audit(page, "#startDialog");
    await page.screenshot({ path: artifact("entry-start-light.png") });
    await page.locator("#startDesigner").click();
    assert.equal(
      await page
        .locator('[data-project-mode="carousel"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#cancelSetup").click();
    await page.locator("#startNew").click();
    assert.equal(
      await page
        .locator('[data-project-mode="post"]')
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#setupName").fill("Persona Kampagne");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    await page.evaluate(async () => {
      MKWSubject.detect = async () => [];
      const c = makeCanvas(640, 800),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#7d9cad";
      ctx.fillRect(0, 0, 640, 800);
      const blob = await new Promise((resolve) =>
        c.toBlob(resolve, "image/png"),
      );
      await importFiles([
        new File([blob], "Konzert-1.png", { type: "image/png" }),
        new File([blob], "Konzert-2.png", { type: "image/png" }),
      ]);
      selected = p.boards[0].id;
      chooseStep("text");
    });
    await page.locator("#mainTextInput").fill("Unser Konzert");
    assert.match(
      await page.locator("#toolsSidebar .inspector-scope").textContent(),
      /Textvorlage/,
    );
    assert.equal(
      await page.evaluate(
        () =>
          p.boards.find((b) => b.imageId === p.images[1].id).elements.title
            .text,
      ),
      "Unser Konzert",
    );
    await page.evaluate(() => {
      window.personaBefore = JSON.stringify(p);
    });
    const viewBefore = await page
      .locator("#workspace")
      .evaluate((el) => [el.scrollLeft, el.scrollTop]);
    const jump = page.locator('#toolsSidebar [data-inspector-jump="style"]');
    await jump.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await page.evaluate(
        () =>
          document.activeElement.closest("[data-inspector-group]")?.dataset
            .inspectorGroup,
      ),
      "style",
    );
    assert.deepEqual(
      await page
        .locator("#workspace")
        .evaluate((el) => [el.scrollLeft, el.scrollTop]),
      viewBefore,
    );
    assert(
      await page.evaluate(() => JSON.stringify(p) === window.personaBefore),
      "Inspector navigation cannot change document content",
    );
    await page.evaluate(() => {
      selected = p.boards.find((b) => b.imageId === p.images[1].id).id;
      chooseStep("text");
    });
    assert.match(
      await page.locator("#toolsSidebar .inspector-scope").textContent(),
      /verknüpft/,
    );
    await page.locator("#mainTextInput").fill("Nur dieses Bild");
    assert.match(
      await page.locator("#toolsSidebar .inspector-scope").textContent(),
      /Eigene/,
    );
    await audit(page, "#toolsSidebar");
    await page.screenshot({ path: artifact("entry-fd-inspector.png") });
    await page.evaluate(async () => {
      await autosave();
    });
    const projectId = await page.evaluate(() => p.projectId);
    await page.reload();
    await openLatestProject(page);
    assert.equal(await page.evaluate(() => p.projectId), projectId);
    assert.equal(await page.evaluate(() => p.images.length), 2);
    console.log(
      "PASS novice start choice, template scope, keyboard property navigation, browser reopening and document isolation",
    );

    const design = await browser.newPage({
      viewport: { width: 1480, height: 1000 },
    });
    design.on("pageerror", (e) => errors.push(e.message));
    await design.goto(process.env.STUDIO_URL);
    await design.locator("#startDesigner").click();
    await design.locator("#setupName").fill("Persona Designer");
    await design.locator("#createProject").click();
    await waitForProjectReady(design);
    await design.evaluate(async () => {
      const c = makeCanvas(300, 300),
        ctx = c.getContext("2d");
      ctx.fillStyle = "#7f9360";
      ctx.fillRect(0, 0, 300, 300);
      const data = c.toDataURL(),
        im = {
          id: uid(),
          width: 300,
          height: 300,
          name: "Bild.png",
          data,
          original: data,
        };
      p.images.push(im);
      const o = carouselObject("image", {
        x: 100,
        y: 350,
        w: 500,
        h: 600,
        imageId: im.id,
      });
      carouselSelect([o.id]);
      await carouselWaitForPaint();
      window.inspectorPixels = $("#carouselCanvas").toDataURL();
      window.inspectorDocument = JSON.stringify(p);
    });
    const viewport = await design
      .locator("#carouselViewport")
      .evaluate((el) => [el.scrollLeft, el.scrollTop]);
    await design
      .locator('#carouselSidebar [data-inspector-jump="layout"]')
      .click();
    assert.deepEqual(
      await design
        .locator("#carouselViewport")
        .evaluate((el) => [el.scrollLeft, el.scrollTop]),
      viewport,
    );
    await design.evaluate(async () => {
      await carouselWaitForPaint();
    });
    assert(
      await design.evaluate(
        () => $("#carouselCanvas").toDataURL() === window.inspectorPixels,
      ),
    );
    assert(
      await design.evaluate(
        () => JSON.stringify(p) === window.inspectorDocument,
      ),
    );
    await design.locator("#carouselContentEdit").click();
    assert.equal(
      await design.locator("#carouselContentEdit").getAttribute("aria-pressed"),
      "true",
    );
    assert.match(
      await design
        .locator("#carouselSidebar .inspector-subtitle")
        .textContent(),
      /Bildinhalt/,
    );
    await design.locator("#carouselContentEdit").click();
    assert.equal(
      await design.locator("#carouselContentEdit").getAttribute("aria-pressed"),
      "false",
    );
    assert(
      await design
        .locator("#carouselSidebar .inspector-navigation")
        .evaluate((nav) =>
          [...nav.children].every((button) => {
            const b = button.getBoundingClientRect(),
              n = nav.getBoundingClientRect();
            return (
              b.width >= 44 && b.left >= n.left - 1 && b.right <= n.right + 1
            );
          }),
        ),
      "Every inspector navigation action stays visible and targetable",
    );
    await audit(design, "#carouselSidebar");
    await design.screenshot({ path: artifact("entry-designer-inspector.png") });
    for (const theme of ["light", "dark"]) {
      await design.evaluate((theme) => studioSetTheme(theme), theme);
      await audit(design, "#carouselSidebar");
    }
    console.log(
      "PASS shared Designer inspector, direct frame/content action, native keyboard targets, unchanged artwork pixels and themes",
    );

    const hub = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    hub.on("pageerror", (e) => errors.push(e.message));
    await hub.goto(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await hub.locator(".tool-card").count(), 3);
    assert.equal(
      await hub
        .locator('[data-tool="pdf-editor"] a, [data-tool="pdf-editor"] button')
        .count(),
      0,
    );
    assert.match(
      await hub.locator('[data-tool="pdf-editor"]').textContent(),
      /Geplant/,
    );
    assert.match(
      await hub.locator('[data-tool="webp-konverter"]').textContent(),
      /Redesign geplant/,
    );
    assert.equal(
      await hub.locator('[data-tool="webp-konverter"] a').getAttribute("href"),
      "./webp-konverter/",
    );
    for (const theme of ["light", "dark"]) {
      const actual = await hub.locator("html").getAttribute("data-theme");
      if (actual !== theme) await hub.locator("#themeToggle").click();
      await audit(hub, "body");
      await hub.screenshot({ path: artifact(`entry-hub-${theme}.png`) });
    }
    await hub.setViewportSize({ width: 320, height: 740 });
    assert(
      await hub.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await hub.screenshot({ path: artifact("entry-hub-narrow.png") });
    await hub.locator('[data-tool="studio"] a').click();
    await hub.locator("#startNew:not([disabled])").waitFor();
    assert.equal(await hub.locator("html").getAttribute("data-theme"), "dark");
    assert.deepEqual(errors, []);
    console.log(
      "PASS available/planned hub, shared theme, 320px layout, real Pages subpath and no runtime errors",
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})();
