const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  try {
    for (const mode of ["post", "carousel"]) {
      const page = await browser.newPage({
        viewport: { width: 1500, height: 1050 },
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.STUDIO_URL);
      await page.locator("#startNew").click();
      await page.locator(`[data-project-mode=${mode}]`).click();
      await page.locator("#setupName").fill("Datumsprüfung");
      if (mode === "carousel") await page.locator("#cn").fill("1");
      await page.locator("#createProject").click();
      await page.waitForFunction(() => !busy);
      await page.evaluate(async (mode) => {
        if (mode === "post") {
          const c = makeCanvas(800, 1000),
            ctx = exportContext(c);
          ctx.fillStyle = "#507685";
          ctx.fillRect(0, 0, c.width, c.height);
          const data = c.toDataURL(),
            im = {
              id: uid(),
              name: "Konzert.png",
              width: 800,
              height: 1000,
              data,
              original: data,
            };
          p.images.push(im);
          p.boards = [createBoard(im, 1080, 1350)];
          selected = p.boards[0].id;
          changed();
        } else {
          carouselObject("text", {
            id: "date-test",
            x: 100,
            y: 200,
            w: 700,
            h: 300,
            text: "Musik im Herbst",
            size: 80,
          });
        }
        p.meta.code = "E2";
        p.meta.date = "";
        delete p.meta.dateSource;
        p.boards[0].elements.date.text = "DO 19. NOV 2026";
        await prepareLogo(p.boards[0]);
        await draw();
        if (p.carousel) await carouselWaitForPaint();
        await autosave();
      }, mode);
      const pixels = () =>
        page.evaluate(async () => {
          const b = p.boards[0],
            c = makeCanvas(b.w, b.h);
          await paint(exportContext(c), b, 1, { transparent: false });
          const data = c.toDataURL();
          c.width = c.height = 1;
          return data;
        });
      const before = await pixels();
      const open = page.locator(
        mode === "post" ? "#export" : "#carouselExport",
      );
      await open.click();
      assert.equal(await page.locator("#date").inputValue(), "19.11.26");
      assert.match(
        await page.locator("#date").getAttribute("aria-describedby"),
        /dateFormats/,
      );
      for (const value of [
        "151126",
        "15.11.2026",
        "15/11/26",
        "15-11-2026",
        "2026-11-15",
        "15. November 2026",
        "15112026",
      ]) {
        await page.locator("#date").fill(value);
        assert(await page.locator("#zip").isEnabled(), value);
        assert.match(
          await page.locator(".export-name").first().textContent(),
          /^261115_E2_/,
        );
        assert.notEqual(
          await page.locator("#date").getAttribute("aria-invalid"),
          "true",
        );
      }
      for (const format of [
        "jpg",
        "png",
        "webp",
        ...(mode === "carousel" ? ["pdf"] : []),
      ]) {
        await page.locator(`[data-export-format=${format}]`).click();
        await page.locator("#date").fill("310426");
        assert(await page.locator("#zip").isDisabled(), format);
        assert.equal(
          await page.locator("#date").getAttribute("aria-invalid"),
          "true",
        );
        assert.match(
          await page.locator("#exportStatus").textContent(),
          /Kalenderdatum/,
        );
        assert.match(
          await page.locator(".export-name").first().textContent(),
          /Korrektur/,
        );
        assert(await page.locator(".export-card input").first().isChecked());
        await page.locator("#date").fill("151126");
        assert(await page.locator("#zip").isEnabled());
        assert.match(
          await page.locator(".export-name").first().textContent(),
          new RegExp("^261115_E2_.*\\." + format),
        );
      }
      if (mode === "carousel") {
        assert(
          await page.locator("#start").isHidden(),
          "image numbering is irrelevant for PDF",
        );
        const d = page.waitForEvent("download");
        await page.locator("#zip").click();
        assert.match((await d).suggestedFilename(), /^261115_E2_.*\.pdf$/);
        await page.waitForFunction(() => !busy);
      } else {
        await page.locator("[data-export-format=jpg]").click();
        const d = page.waitForEvent("download");
        await page.locator("#zip").click();
        assert.match((await d).suggestedFilename(), /^261115_E2_.*_JPG\.zip$/);
        await page.waitForFunction(() => !busy);
      }
      await page.locator("#deselectAllExports").click();
      assert(await page.locator("#zip").isDisabled());
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /mindestens/,
      );
      assert.equal(
        await page.locator(".export-name").first().textContent(),
        "Nicht ausgewählt",
      );
      await page.locator("#selectAllExports").click();
      await page.locator("#date").fill("");
      assert(await page.locator("#zip").isEnabled());
      assert.match(
        await page.locator("#exportStatus").textContent(),
        /Kein Datum/,
      );
      await page.locator("#closeExport").click();
      await open.click();
      assert.equal(
        await page.locator("#date").inputValue(),
        "",
        "deliberately blank date is not replaced by heading inference",
      );
      await page.locator("#date").fill("151126");
      await page.locator("#closeExport").click();
      await open.click();
      assert.equal(
        await page.locator("#date").inputValue(),
        "151126",
        "manual date survives reopening export",
      );
      await page.waitForFunction(() =>
        document.querySelector(".export-size[data-bytes]"),
      );
      await page
        .locator("#date")
        .evaluate((el) =>
          el.closest("label").scrollIntoView({ block: "center" }),
        );
      await page.screenshot({
        path: artifact(`five-person-${mode}-export.png`),
        animations: "disabled",
      });
      await page.locator("#closeExport").click();
      await page.locator("#save").click();
      assert.equal(await page.locator("#saveDate").inputValue(), "151126");
      assert.match(await page.locator("#saveName").inputValue(), /^261115_E2_/);
      await page.locator("#saveDate").fill("31.04.2026");
      assert.equal(
        await page.locator("#saveDate").getAttribute("aria-invalid"),
        "true",
      );
      assert(
        await page.locator("#saveProject").isEnabled(),
        "MKW drafts can always be saved to protect work",
      );
      const draftDownload = page.waitForEvent("download");
      await page.evaluate(() => {
        window.showSaveFilePicker = undefined;
      });
      await page.locator("#saveProject").click();
      const draft = await draftDownload;
      const draftBytes = Array.from(await fs.readFile(await draft.path()));
      assert.equal(
        await page.evaluate(
          async (bytes) =>
            (await MKWProjectFile.decode(new Blob([new Uint8Array(bytes)])))
              .meta.date,
          draftBytes,
        ),
        "31.04.2026",
        "invalid naming metadata cannot prevent preserving a draft",
      );
      await page.waitForFunction(() => !busy);
      await page.locator("#save").click();
      await page.locator("#saveDate").fill("151126");
      // The isolated browser downloads to its own temporary directory.
      await page.evaluate(() => {
        window.showSaveFilePicker = undefined;
      });
      const download = page.waitForEvent("download");
      await page.locator("#saveProject").click();
      const file = await download;
      assert.match(file.suggestedFilename(), /^261115_E2_.*\.mkw$/);
      const bytes = Array.from(await fs.readFile(await file.path()));
      const saved = await page.evaluate(async (bytes) => {
        const q = await MKWProjectFile.decode(
          new Blob([new Uint8Array(bytes)]),
        );
        validate(MKWProjectAssets.hydrate(q));
        let rejected = false;
        try {
          validate(
            MKWProjectAssets.hydrate({
              ...q,
              meta: { ...q.meta, dateSource: "unknown" },
            }),
          );
        } catch {
          rejected = true;
        }
        if (!rejected)
          throw Error("Unknown date-source metadata must be rejected");
        return { date: q.meta.date, source: q.meta.dateSource };
      }, bytes);
      assert.deepEqual(saved, { date: "151126", source: "manual" });
      await page.waitForFunction(() => !busy);
      await page.locator("#projectFile").setInputFiles(await file.path());
      await page.waitForFunction(() => !busy && p.meta.date === "151126");
      await open.click();
      assert.equal(
        await page.locator("#date").inputValue(),
        "151126",
        "manual source survives portable MKW reopen",
      );
      await page.locator("#date").fill("310426");
      for (const theme of ["light", "dark"]) {
        await page.evaluate((theme) => studioSetTheme(theme), theme);
        const colour = await page.locator("#date").evaluate(async (el) => {
          await Promise.allSettled(el.getAnimations().map((a) => a.finished));
          const probe = document.createElement("span");
          probe.style.color = "var(--md-sys-color-error)";
          document.body.append(probe);
          const error = getComputedStyle(probe).color;
          probe.remove();
          return { border: getComputedStyle(el).borderTopColor, error };
        });
        assert.equal(
          colour.border,
          colour.error,
          "focused date errors use the semantic error border in " + theme,
        );
      }
      await page.evaluate(() => studioSetTheme("light"));
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(() =>
        document.querySelector(".export-size[data-bytes]"),
      );
      await page
        .locator("#date")
        .evaluate((el) =>
          el.closest("label").scrollIntoView({ block: "center" }),
        );
      await page.screenshot({
        path: artifact(`five-person-${mode}-error-mobile.png`),
        animations: "disabled",
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert(await page.locator("#date").getAttribute("aria-describedby"));
      await page.locator("#date").fill("151126");
      await page.locator("#closeExport").click();
      assert.equal(
        await pixels(),
        before,
        "naming and date feedback never change rendered artwork",
      );
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        `PASS ${mode}: flexible dates, exact naming/downloads, PDF validation, manual/blank precedence, MKW roundtrip, optional date, selection, narrow error UI and unchanged artwork`,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
