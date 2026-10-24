const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright");
const assert = require("node:assert/strict");

(async () => {
  const browser = await require("./browser.cjs").launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      }),
      errors = [],
      failed = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().includes("/api/session"))
        failed.push(response.url());
    });
    await page.goto(process.env.STUDIO_URL || "http://127.0.0.1:8912/");
    if (process.env.STUDIO_THEME)
      await page.evaluate(
        (theme) => studioSetTheme(theme),
        process.env.STUDIO_THEME,
      );
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Sommerkonzerte");
    await page.locator("#setupCode").fill("S1");
    await page.locator("#createProject").click();
    const fixture = await page.evaluate(() => {
      MKWSubject.detect = async () => [];
      const canvas = makeCanvas(2400, 3000),
        ctx = canvas.getContext("2d"),
        gradient = ctx.createLinearGradient(0, 0, 2400, 3000);
      gradient.addColorStop(0, "#a9623e");
      gradient.addColorStop(0.55, "#293c40");
      gradient.addColorStop(1, "#152731");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2400, 3000);
      ctx.fillStyle = "#a5b8a1";
      ctx.beginPath();
      ctx.ellipse(1600, 1250, 1000, 1250, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#cfb58d";
      ctx.beginPath();
      ctx.arc(1800, 480, 580, 0, Math.PI * 2);
      ctx.fill();
      return canvas.toDataURL();
    });
    await page.locator("#files").setInputFiles({
      name: "Sommer.png",
      mimeType: "image/png",
      buffer: Buffer.from(fixture.split(",")[1], "base64"),
    });
    await page.waitForFunction(() => !busy && p.boards.length === 2);
    await page.locator("#mainTextInput").fill("KONZERTE\nFÜR ALLE");
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Shift+W");
    assert.equal(
      await page.locator("#footerGuides").getAttribute("aria-pressed"),
      "false",
    );
    await page.keyboard.press("Shift+W");
    assert.equal(
      await page.locator("#footerGuides").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#mainTextInput").focus();
    await page.keyboard.press("Shift+W");
    assert((await page.locator("#mainTextInput").inputValue()).endsWith("W"));
    assert.equal(
      await page.locator("#footerGuides").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#mainTextInput").fill("KONZERTE\nFÜR ALLE");
    const postBar = await page.locator(".dock").boundingBox();
    assert.equal(postBar.height, 58);
    assert.equal(postBar.y, 1000 - 52 - 12 - 12 - 14 - 58);
    assert.equal(await page.locator(".dock [data-step]").count(), 6);
    assert.equal(
      await page.locator(".dock [data-step] svg[data-google-icon]").count(),
      6,
    );
    const pixels = () =>
      page.evaluate(async () => {
        const b = p.boards[0],
          canvas = makeCanvas(b.w, b.h);
        await paint(canvas.getContext("2d"), b, 1);
        return Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              canvas.getContext("2d").getImageData(0, 0, b.w, b.h).data,
            ),
          ),
        )
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("");
      });
    require("node:fs").writeFileSync(
      require("./browser.cjs").artifact("mkw-ui-fixture.png"),
      Buffer.from(fixture.split(",")[1], "base64"),
    );
    const checkBento = async (viewport, sidebar) => {
      const boxes = await page.evaluate(
        ({ viewport, sidebar }) => {
          const rect = (selector) => {
            const el = document.querySelector(selector),
              r = el.getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              right: r.right,
              bottom: r.bottom,
              radius: parseFloat(getComputedStyle(el).borderTopLeftRadius),
            };
          };
          return {
            header: rect("header"),
            footer: rect("footer"),
            workspace: rect(viewport),
            sidebar: rect(sidebar),
            width: innerWidth,
          };
        },
        { viewport, sidebar },
      );
      assert.equal(boxes.header.x, 12);
      assert.equal(boxes.sidebar.y, 12);
      assert.equal(boxes.workspace.y, boxes.header.bottom + 12);
      assert.equal(boxes.workspace.bottom, boxes.sidebar.bottom);
      assert.equal(boxes.footer.y, boxes.workspace.bottom + 12);
      assert.equal(boxes.sidebar.x, boxes.workspace.right + 12);
      assert.equal(boxes.header.right, boxes.workspace.right);
      assert.equal(boxes.footer.right, boxes.width - 12);
      for (const box of Object.values(boxes).filter(
        (b) => typeof b === "object",
      ))
        assert(box.radius >= 28);
    };
    await checkBento("#workspace", "#toolsSidebar");
    const beforePixels = await pixels(),
      beforeWorkspace = await page.locator("#workspace").boundingBox();
    await page.locator("#toolsToggle").click();
    assert.equal(
      await page.locator("#toolsToggle").getAttribute("aria-expanded"),
      "false",
    );
    assert(await page.locator("#toolsSidebar").isHidden());
    assert(
      (await page.locator("#workspace").boundingBox()).width >
        beforeWorkspace.width + 250,
    );
    assert(await page.locator("#postViewControls").isVisible());
    await page.locator("#toolsToggle").click();
    assert(await page.locator("#toolsSidebar").isVisible());
    assert.equal(
      await pixels(),
      beforePixels,
      "Workspace controls must never change artwork pixels",
    );
    const postDocument = await page.evaluate(() => JSON.stringify(p));
    for (const command of ["Meta", "Control"]) {
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press(command + "+1");
      assert.equal(
        await page.evaluate(() => view),
        await page.evaluate(() => studioZoomReference(false)),
      );
      assert.equal(await page.locator("#viewValue").textContent(), "100%");
      await page.keyboard.press(command + "+0");
      const shortcut = await page.evaluate(() => view);
      await page.evaluate(() => postSetZoom(1));
      await page.locator("#postFit").click();
      assert(Math.abs(shortcut - (await page.evaluate(() => view))) < 0.001);
    }
    assert.equal(
      await page.evaluate(() => JSON.stringify(p)),
      postDocument,
      "Zoom shortcuts do not alter single-post artwork",
    );
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-ui-post.png"),
    });
    await page.evaluate(() => {
      p.boards[1].image.scale = 0.01;
      selectBoard(p.boards[0].id);
      return draw();
    });
    const placement = await page.evaluate(() => {
      const n = $("#postNotice").getBoundingClientRect(),
        e = $("#export").getBoundingClientRect();
      return {
        left: n.right <= e.left,
        sameY: Math.abs(n.y - e.y) < 2,
        visible: !$("#postNotice").hidden,
      };
    });
    assert(placement.left && placement.sameY && placement.visible);
    await page.locator("#postNotice").click();
    assert(await page.locator("#studioWarnings").isVisible());
    await page.locator("[data-warning-index]").first().click();
    assert.deepEqual(
      await page.evaluate(() => ({
        selected: selected === p.boards[1].id,
        step,
      })),
      { selected: true, step: "crop" },
    );
    assert(await page.locator("#studioWarnings").isHidden());

    await page.locator("#newproject").click();
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Sommer Carousel");
    assert.equal(await page.locator("#cb").inputValue(), "200");
    await page.locator("#createProject").click();
    await page.locator("#carouselCanvas").waitFor();
    await checkBento("#carouselViewport", "#carouselSidebar");
    const carouselBar = await page
      .locator(".carousel-contextbar")
      .boundingBox();
    assert.equal(carouselBar.y, postBar.y);
    assert.equal(carouselBar.height, postBar.height);
    assert.equal(
      await page.locator(".carousel-contextbar [data-tool]").count(),
      6,
    );
    assert.equal(
      await page
        .locator(".carousel-contextbar [data-tool] svg[data-google-icon]")
        .count(),
      6,
    );
    assert.equal(
      (await page.locator("#carouselViewport").boundingBox()).x,
      12,
      "Only the 12px shell inset precedes the artwork; no left tool column",
    );
    const center = () =>
      page.evaluate(() => {
        const v = document.querySelector("#carouselViewport"),
          r = v.getBoundingClientRect(),
          a = document.querySelector("#carouselCanvas").getBoundingClientRect();
        return {
          x: (r.left + v.clientWidth / 2 - a.left) / carouselZoom,
          y: (r.top + v.clientHeight / 2 - a.top) / carouselZoom,
        };
      });
    const beforeCenter = await center(),
      beforeWidth = (await page.locator("#carouselViewport").boundingBox())
        .width;
    await page.locator("#toolsToggle").click();
    assert(await page.locator("#carouselSidebar").isHidden());
    assert(
      (await page.locator("#carouselViewport").boundingBox()).width >
        beforeWidth + 250,
    );
    const afterCenter = await center();
    assert(
      Math.abs(beforeCenter.x - afterCenter.x) < 4 &&
        Math.abs(beforeCenter.y - afterCenter.y) < 4,
      "Sidebar toggling keeps the viewed artwork point",
    );
    assert(await page.locator("#carouselZoom").isVisible());
    await page.locator("#toolsToggle").click();
    await page.evaluate((data) => {
      Object.assign(p.images[0], {
        data,
        original: data,
        width: 2400,
        height: 3000,
      });
      carouselObject("image", {
        x: 0,
        y: 0,
        w: 2160,
        h: 1350,
        imageId: p.images[0].id,
        name: "Sommer Illustration",
      });
    }, fixture);
    const sections = await page
      .locator("#carouselProperties>.carousel-property-section>h4")
      .allTextContents();
    assert.equal(sections[0], "Inhalt");
    assert.equal(sections.at(-1), "Position & Grösse");
    const action = await page.locator("#carouselReplace").boundingBox(),
      properties = await page.locator("#carouselProperties").boundingBox();
    assert(action.y < properties.y + 100);
    await page.evaluate(() => {
      const o = carouselObject("text", {
        x: 200,
        y: 720,
        w: 780,
        h: 400,
        text: "DER SOMMER\nKLINGT",
        size: 110,
      });
      carouselPanel();
    });
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-ui-carousel.png"),
    });
    await page.evaluate(() =>
      carouselObject("text", {
        x: 3 * 1080 + 990,
        y: 1160,
        w: 250,
        h: 150,
        text: "ZU WEIT",
      }),
    );
    const warningId = await page.evaluate(() => carouselSelection);
    await page.evaluate(() => carouselSelect([]));
    await page.locator("#carouselNotice").click();
    await page.locator("[data-warning-index]").first().click();
    assert.equal(await page.evaluate(() => carouselSelection), warningId);
    assert.equal(
      await page
        .locator("button[data-tool=select]")
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Shift+W");
    assert(await page.locator("#carouselGuides").isHidden());
    assert.equal(await page.evaluate(() => carouselUI.tool), "select");
    await page.keyboard.press("Shift+W");
    assert(await page.locator("#carouselGuides").isVisible());
    await page.keyboard.press("w");
    assert.equal(await page.evaluate(() => carouselUI.tool), "angle");
    await page.locator("button[data-tool=select]").click();

    for (const command of ["Meta", "Control"]) {
      await page.evaluate(() => document.activeElement.blur());
      await page.keyboard.press(command + "+1");
      assert.equal(
        await page.evaluate(() => carouselZoom),
        await page.evaluate(() => studioZoomReference(true)),
      );
      assert.equal(await page.locator("#carouselZoom").inputValue(), "100");
      await page.keyboard.press(command + "+0");
      const shortcut = await page.evaluate(() => carouselZoom);
      await page.evaluate(() => carouselSetZoom(1));
      await page.locator("#carouselFit").click();
      assert(
        Math.abs(shortcut - (await page.evaluate(() => carouselZoom))) < 0.001,
      );
    }
    await page.locator("#settings").click();
    const modalZoom = await page.evaluate(() => carouselZoom);
    await page.keyboard.press("Control+1");
    assert.equal(await page.evaluate(() => carouselZoom), modalZoom);
    await page.locator("#closeSettings").click();
    // 100% display remains possible for long carousels without a huge preview allocation.
    const wide = await page.evaluate(async () => {
      const old = p.carousel.n;
      p.carousel.n = 20;
      carouselSetZoom(0.2);
      return old;
    });
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Control+1");
    assert(
      await page.evaluate(() => {
        const c = $("#carouselCanvas");
        return (
          carouselZoom === studioZoomReference(true) &&
          Math.abs(c.getBoundingClientRect().width - 390 * 20) < 1 &&
          c.width <= 16000 &&
          c.width * c.height <= 24040000
        );
      }),
    );
    await page.evaluate((n) => {
      p.carousel.n = n;
      carouselFit();
    }, wide);
    await page.locator("#footerSnap").click();
    assert.equal(await page.evaluate(() => carouselUI.snap), false);
    await page.locator("#footerSnap").click();
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-ui-compact.png"),
    });
    await page.setViewportSize({ width: 640, height: 900 });
    await page.locator("#carouselSidebar").waitFor({ state: "hidden" });
    await page.locator("#toolsToggle").click();
    assert(await page.locator("#carouselSidebar").isVisible());
    await page.locator("#toolsToggle").click();
    for (const tool of [
      "text",
      "image",
      "gradient",
      "angle",
      "hand",
      "select",
    ]) {
      await page.locator(`button[data-tool=${tool}]`).click();
      assert.equal(
        await page
          .locator(`button[data-tool=${tool}]`)
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    assert.equal(await page.locator("button[data-tool=zoom]").count(), 0);
    assert(await page.locator("#carouselExport").isVisible());
    assert(await page.locator("footer #carouselZoom").isVisible());
    assert.equal(await page.locator("footer").count(), 1);
    await page.screenshot({
      path: require("./browser.cjs").artifact("mkw-ui-mobile.png"),
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(failed, []);
    console.log(
      "PASS shared command bars, local Google icons, inspector order, hide/show and view preservation, warning navigation, guide/snap feedback, compact/mobile access, unchanged artwork pixels",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
