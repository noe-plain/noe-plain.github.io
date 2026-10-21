const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Automatik Sponsorlogo");
    await page.locator("#createProject").click();
    const result = await page.evaluate(async () => {
      const logoCanvas = makeCanvas(500, 180),
        ctx = exportContext(logoCanvas);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 500, 180);
      ctx.fillStyle = "#0069b4";
      ctx.font = "bold 50px Arial";
      ctx.fillText("Kantonalbank", 130, 120);
      ctx.fillRect(20, 30, 70, 70);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(35, 45, 40, 40);
      const data = logoCanvas.toDataURL(),
        asset = {
          id: uid(),
          name: "Altes farbiges Logo mit weissem Hintergrund",
          data,
          width: 500,
          height: 180,
        };
      p.logos.push(asset);
      const im = {
        id: uid(),
        name: "Foto",
        data,
        original: data,
        width: 500,
        height: 180,
      };
      p.images = [im];
      p.boards = [createBoard(im, 1080, 1350)];
      const b = p.boards[0];
      selected = b.id;
      const logo = {
        id: asset.id,
        name: asset.name,
        width: 500,
        height: 180,
        ink: { x: 0, y: 0, w: 1, h: 1 },
        density: 0.3,
        darkDensity: 0.15,
        lightDensity: 0.85,
        gray: false,
        monochrome: false,
        complex: false,
        mode: "auto",
        scale: 1,
        enabled: true,
      };
      b.sponsors = {
        enabled: true,
        colour: "#ffffff",
        groups: [
          { id: uid(), name: "Hauptpartnerin", enabled: true, logos: [logo] },
        ],
      };
      const results = [];
      for (const colour of ["#ffffff", "#e3d9ae", "#19232b"]) {
        b.sponsors.colour = colour;
        const auto = makeCanvas(b.w, b.h),
          manual = makeCanvas(b.w, b.h);
        logo.mode = "auto";
        const a = MKWSponsors.layout(b);
        await paintSponsors(exportContext(auto), b);
        logo.mode = MKWSponsors.mode({ ...logo, mode: "auto" }, colour);
        const m = MKWSponsors.layout(b);
        await paintSponsors(exportContext(manual), b);
        const x = auto.getContext("2d").getImageData(0, 0, b.w, b.h).data,
          y = manual.getContext("2d").getImageData(0, 0, b.w, b.h).data;
        results.push({
          exact: x.every((v, i) => v === y[i]),
          geometry:
            JSON.stringify(
              a.groups.map((g) => [
                g.x,
                g.y,
                g.w,
                g.logos.map((l) => [l.x, l.y, l.w, l.h]),
              ]),
            ) ===
            JSON.stringify(
              m.groups.map((g) => [
                g.x,
                g.y,
                g.w,
                g.logos.map((l) => [l.x, l.y, l.w, l.h]),
              ]),
            ),
          mode: logo.mode,
          positions: a.groups.map((g) => [
            g.x,
            g.y,
            g.w,
            g.h,
            g.logos.map((l) => [l.x, l.y, l.w, l.h]),
          ]),
          content: a.content,
          thickness: a.thickness,
        });
      }
      const bitmap = await sponsorBitmap(asset, "multiply", "#ffffff"),
        pixels = bitmap.getContext("2d").getImageData(0, 0, 500, 180).data;
      logo.mode = "auto";
      b.sponsors.colour = "#ffffff";
      render();
      return {
        results,
        background: [...pixels.slice(0, 4)],
        ink: [...pixels.slice((40 * 500 + 25) * 4, (40 * 500 + 25) * 4 + 4)],
      };
    });
    assert(
      result.results.every((r) => r.exact && r.geometry),
      JSON.stringify(result),
    );
    assert.deepEqual(
      result.results.map((r) => r.mode),
      ["multiply", "multiply", "screen"],
    );
    for (const entry of result.results) {
      assert.deepEqual(
        entry.positions,
        result.results[0].positions,
        "Background changes must not resize or reposition logos",
      );
      assert.deepEqual(entry.content, result.results[0].content);
      assert.equal(entry.thickness, result.results[0].thickness);
    }
    assert.deepEqual(result.background, [255, 255, 255, 255]);
    assert.deepEqual(result.ink, [0, 0, 0, 255]);
    assert.deepEqual(errors, []);
    await page.screenshot({
      path: artifact("sponsor-auto-opaque-colour-logo.png"),
    });
    console.log(
      "Automatic sponsor multiply/screen exactly matches manual modes and optical size; opaque coloured legacy logo backgrounds remain clear.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
