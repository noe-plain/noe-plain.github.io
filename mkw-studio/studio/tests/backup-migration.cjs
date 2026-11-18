const assert = require("node:assert/strict");
const fs = require("node:fs");
const { launch, waitForProjectReady } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1100 },
    });
    await page.goto(process.env.STUDIO_URL);
    await page.locator("#startNew").click();
    await page.locator("#setupName").fill("Eigener Backup-Abnahmetest");
    await page.locator("#createProject").click();
    await waitForProjectReady(page);
    const before = await page.evaluate(async () => {
      const canvas = makeCanvas(128, 128),
        g = canvas.getContext("2d");
      for (const [i, c] of [
        "#ff0000",
        "#00ff00",
        "#0000ff",
        "#ffff00",
      ].entries()) {
        g.fillStyle = c;
        g.fillRect((i % 2) * 64, Math.floor(i / 2) * 64, 64, 64);
      }
      const data = canvas.toDataURL(),
        im = {
          id: uid(),
          name: "Eigenes-Pruefbild.png",
          data,
          original: data,
          width: 128,
          height: 128,
          reviewComment: "Notiz erhalten",
        };
      p.images = [im];
      p.boards = [basicBoard(im, 600, 750)];
      const b = p.boards[0];
      b.elements.logo.visible = false;
      b.elements.title.text = "Eigener Prüftitel";
      b.elements.title.visible = true;
      b.angle = MKWPostAngle.defaults(b);
      Object.assign(b.angle.image, {
        x: 360,
        y: 340,
        angle: 17,
        scale: b.angle.image.scale * 1.2,
        flipX: -1,
      });
      changed();
      await MKWProjects.autosave({ writeFile: false });
      const bitmap = makeCanvas(b.w, b.h);
      await MKWPostAngleEditor.paint(exportContext(bitmap), b, 1, {
        only: "postAngle",
      });
      window.backupAuditPixels = exportContext(bitmap).getImageData(
        0,
        0,
        b.w,
        b.h,
      ).data;
      return {
        projectId: p.projectId,
        angle: clone(b.angle),
        logoVisible: b.elements.logo.visible,
      };
    });
    await page.evaluate(() => MKWCampaignUI.convert({ confirmed: true }));
    const result = await page.evaluate(async (before) => {
      if (!p.campaign)
        throw Error("Conversion failed: " + $("#status").textContent);
      const frame = p.carousel.artboards[0],
        angle = p.carousel.objects.find((o) => o.campaignRole === "angle"),
        logo = p.carousel.objects.find((o) => o.campaignRole === "logo");
      const canvas = makeCanvas(frame.w, frame.h),
        g = exportContext(canvas);
      await carouselPaint(g, 0, 1, true, null, [angle]);
      const pixels = g.getImageData(0, 0, frame.w, frame.h).data;
      let count = 0,
        total = 0,
        max = 0;
      for (let i = 0; i < pixels.length; i++) {
        const d = Math.abs(pixels[i] - backupAuditPixels[i]);
        total += d;
        max = Math.max(max, d);
        if (d > 1) count++;
      }
      const stored = await MKWProjectStore.open(before.projectId);
      const freshCampaign = fresh();
      freshCampaign.images = [p.images[0]];
      freshCampaign.campaign = MKWCampaignUI.newState();
      await MKWCampaignDocument.append(freshCampaign, p.images[0], [
        basicBoard(p.images[0], 600, 750),
      ]);
      const newLogo = freshCampaign.carousel.objects.find(
        (o) => o.campaignRole === "logo",
      );
      return {
        independentCopy: p.projectId !== before.projectId,
        originalAnglePreserved:
          JSON.stringify(stored.project.boards[0].angle) ===
          JSON.stringify(before.angle),
        commentPreserved: p.images[0].reviewComment === "Notiz erhalten",
        originalLogoVisible: before.logoVisible,
        convertedLogoVisible: logo.visible,
        newCampaignLogoVisible: newLogo.visible,
        anglePixelDifference: {
          max,
          mean: Number((total / pixels.length).toFixed(4)),
          channelsAboveOne: count,
          totalChannels: pixels.length,
        },
        sourceAngle: before.angle.image.angle,
        convertedAngle: angle.angle,
        convertedImageAngle: angle.imageAngle,
      };
    }, before);
    assert(
      result.independentCopy &&
        result.originalAnglePreserved &&
        result.commentPreserved,
    );
    assert.equal(
      result.convertedLogoVisible,
      result.originalLogoVisible,
      "Conversion must not reveal a hidden logo",
    );
    assert.equal(
      result.newCampaignLogoVisible,
      true,
      "New campaigns still start with the normal visible logo",
    );
    assert.equal(result.convertedImageAngle, result.sourceAngle);
    assert(
      result.anglePixelDifference.max <= 1,
      "Converted angle retains actual source pixels",
    );
    console.log(
      "PASS hidden legacy logo, original isolation, shared comment and actual independent angle crop/rotation pixels",
    );
    fs.writeFileSync(
      require("./browser.cjs").artifact("backup-migration-audit.json"),
      JSON.stringify(result, null, 2) + "\n",
    );
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
