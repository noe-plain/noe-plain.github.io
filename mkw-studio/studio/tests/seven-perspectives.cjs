const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { launch, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch(),
    records = [],
    errors = [];
  const phase = process.env.MKW_AUDIT_PHASE || "after";
  try {
    const page = await browser.newPage({
      viewport: { width: 1500, height: 1050 },
    });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(process.env.STUDIO_URL);
    await page.waitForFunction(
      () => !document.querySelector("#startNew").disabled,
    );
    await page.addScriptTag({ content: require("axe-core").source });
    async function capture(name, shot = false) {
      // Inspect settled states separately from entrance animations.
      await page.waitForTimeout(450);
      const state = await page.evaluate(async () => {
        const modal = document.activeElement?.closest("dialog:modal") || [...document.querySelectorAll("dialog:modal")].at(-1);
        const scope = modal || document;
        const controls = [
          ...scope.querySelectorAll(
            'button,input,select,textarea,summary,a[href],[role="slider"],[role="tab"],[role="toolbar"],[contenteditable="true"]',
          ),
        ]
          .filter(
            (el) =>
              el.getClientRects().length &&
              getComputedStyle(el).visibility !== "hidden" &&
              !el.closest("[hidden],[inert]"),
          )
          .map((el) => {
            const r = el.getBoundingClientRect(),
              s = getComputedStyle(el);
            return {
              tag: el.tagName,
              id: el.id,
              role: el.getAttribute("role"),
              name:
                (el.getAttribute("aria-labelledby") || "")
                  .split(/\s+/)
                  .map((id) => document.getElementById(id)?.textContent || "")
                  .join(" ")
                  .trim() ||
                el.getAttribute("aria-label") ||
                [...(el.labels || [])]
                  .map((label) => label.textContent.trim())
                  .join(" ") ||
                el.getAttribute("title") ||
                el.textContent.trim(),
              class: el.className?.baseVal ?? el.className,
              type: el.type,
              width: r.width,
              height: r.height,
              font: s.fontSize,
              disabled: !!el.disabled,
              selected: el.getAttribute("aria-selected"),
              pressed: el.getAttribute("aria-pressed"),
              tabIndex: el.tabIndex,
              location:
                el.closest("dialog,[popover],aside,header,footer,main")?.id ||
                "body",
            };
          });
        const result = await axe.run(
          {
            ...(modal ? { include: [["#" + modal.id]] } : {}),
            exclude: [[".board-surface"], ["#carouselViewport"]],
          },
          {
            runOnly: {
              type: "tag",
              values: [
                "wcag2a",
                "wcag2aa",
                "wcag21a",
                "wcag21aa",
                "wcag22aa",
                "best-practice",
              ],
            },
          },
        );
        return {
          controls,
          auditedModal: modal?.id || null,
          // A named top-layer menu is a transient widget, not an additional page landmark.
          // Keep this best-practice advisory in the raw report; never suppress WCAG rules.
          menuLandmarkAdvisories: result.violations
            .filter((v) => v.id === "region")
            .flatMap((v) =>
              v.nodes
                .filter(
                  (n) =>
                    n.target.length === 1 &&
                    document
                      .querySelector(n.target[0])
                      ?.matches('[popover][role="menu"]'),
                )
                .map((n) => n.target),
            ),
          violations: result.violations
            .map((v) => ({
              ...v,
              nodes: v.nodes.filter(
                (n) =>
                  !(
                    v.id === "region" &&
                    n.target.length === 1 &&
                    document
                      .querySelector(n.target[0])
                      ?.matches('[popover][role="menu"]')
                  ),
              ),
            }))
            .filter((v) => v.nodes.length)
            .map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              help: v.helpUrl,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                html: n.html.slice(0, 650),
                summary: n.failureSummary,
              })),
            })),
          incomplete: result.incomplete.map((v) => ({
            id: v.id,
            targets: v.nodes.map((n) => n.target),
            nodes: v.nodes.map((n) => ({
              target: n.target,
              html: n.html.slice(0, 500),
              summary: n.failureSummary,
              checks: [...n.any, ...n.all, ...n.none].map((c) => ({
                id: c.id,
                message: c.message,
                data: c.data,
              })),
            })),
          })),
          unresolvedControls: [...scope.querySelectorAll("[aria-controls]")]
            .filter(
              (el) =>
                el.getClientRects().length && !el.closest("[hidden],[inert]"),
            )
            .flatMap((el) =>
              el
                .getAttribute("aria-controls")
                .split(/\s+/)
                .filter((id) => id && !document.getElementById(id))
                .map((id) => ({
                  control: el.id || el.outerHTML.slice(0, 200),
                  missing: id,
                })),
            ),
          overflow: document.documentElement.scrollWidth > innerWidth,
          dialogs: [
            ...document.querySelectorAll("dialog[open],[popover]:popover-open"),
          ].map((el) => el.id),
        };
      });
      if (name.startsWith("settings-")) assert.equal(state.auditedModal, "settingsDialog", "Audit the active settings dialog, not the underlying start dialog");
      if (name.startsWith("setup-")) assert.notEqual(state.auditedModal, "startDialog");
      records.push({ name, ...state });
      fs.writeFileSync(
        artifact(`seven-${phase}.json`),
        JSON.stringify(
          {
            phase,
            browser: process.env.MKW_TEST_BROWSER,
            axe: require("axe-core").version,
            records,
            errors,
          },
          null,
          2,
        ),
      );
      fs.writeFileSync(
        artifact(`seven-${phase}-${name}.aria.txt`),
        await page.locator("body").ariaSnapshot(),
      );
      if (shot)
        await page.screenshot({
          path: artifact(`seven-${phase}-${name}.png`),
          animations: "disabled",
        });
      console.log(
        name,
        state.controls.length,
        "controls;",
        state.violations.map((v) => v.id).join(", ") ||
          "no automatic violations",
      );
    }
    await capture("start", true);
    await page.locator("#startHelp").click();
    await page.waitForFunction(() => studioHelpPopup?.ready);
    await page
      .locator("#studioHelpFrame")
      .contentFrame()
      .locator("body")
      .evaluate((body, source) => {
        const script = body.ownerDocument.createElement("script");
        script.textContent = source;
        body.append(script);
      }, require("axe-core").source);
    await capture("wiki", true);
    await page
      .locator("#studioHelpFrame")
      .contentFrame()
      .locator("#helpSearch")
      .count()
      .then(async (count) => {
        if (count)
          await page
            .locator("#studioHelpFrame")
            .contentFrame()
            .locator("#helpSearch")
            .fill("speichern");
      });
    await capture("wiki-search");
    await page.locator("#closeStudioHelp").click();
    await page.locator("#startSettings").click();
    for (const tab of [
      "general",
      "workflow",
      "guides",
      "fonts",
      "sponsors",
      "templates",
      "export",
    ]) {
      await page.locator("#settings-tab-" + tab).click();
      await capture("settings-" + tab, tab === "general");
    }
    await page.locator("#closeSettings").click();
    await page.locator("#startTemplates").click();
    await page.locator("[data-template-id=mkw-winkel-slidepost]").click();
    await page.waitForFunction(
      () => document.querySelectorAll("[data-template-layer]").length === 11,
    );
    await capture("templates", true);
    await page.locator("#closeTemplateGallery").click();
    await page.locator("#startOpen").click();
    await capture("library");
    await page.locator("#closeProjectLibrary").click();
    await page.locator("#startNew").click();
    await capture("setup-fd", true);
    await page.locator("#setupName").fill("Sieben Blickwinkel");
    await page.locator("[data-project-mode=carousel]").click();
    await capture("setup-designer");
    await page.locator("[data-project-mode=post]").click();
    await page.locator("#createProject").click();
    await page.waitForFunction(() => !busy);
    await page.evaluate(async () => {
      MKWSubject.detect = async () => [];
      const canvas = makeCanvas(800, 1000),
        x = exportContext(canvas);
      x.fillStyle = "#526a75";
      x.fillRect(0, 0, 800, 1000);
      const im = {
        id: uid(),
        name: "Konzertfoto.png",
        width: 800,
        height: 1000,
        data: canvas.toDataURL(),
      };
      p.images.push(im);
      p.boards = p.formats.map((f) => createBoard(im, f.w, f.h));
      p.meta.title = "Ein Abend voller Musik";
      p.meta.date = "15.11.26";
      p.meta.subtitle = "Musikkollegium Winterthur";
      selected = p.boards[0].id;
      changed();
      for (const b of p.boards) await prepareLogo(b);
      await draw();
      await autosave();
    });
    for (const tool of ["crop", "text", "logo", "sponsors"]) {
      await page.evaluate((tool) => chooseStep(tool), tool);
      await capture("fd-" + tool, tool === "text");
    }
    await page.evaluate(() => editBoardOptions(board()));
    await capture("fd-format");
    await page.locator(".text-type-picker summary").first().click();
    await capture("fd-options", true);
    await page.locator("#save").click();
    await capture("save");
    await page.locator("#closeSave").click();
    await page.locator("#export").click();
    for (const format of ["jpg", "png", "webp"]) {
      await page.locator(`[data-export-format=${format}]`).click();
      await capture("export-" + format, format === "jpg");
    }
    await page.locator("#closeExport").click();
    await page.evaluate(() => openProjectSetup());
    await page.locator("[data-project-mode=carousel]").click();
    await page.locator("#setupName").fill("Designer-Prüfung");
    await page.locator("#cn").fill("2");
    await page.locator("#createProject").click();
    await page.waitForFunction(() => p.carousel && !busy);
    await page.evaluate(async () => {
      carouselObject("text", {
        id: "audit-text",
        name: "Konzerttitel",
        x: 100,
        y: 200,
        w: 780,
        h: 500,
        size: 70,
        text: "Musik für alle\nEin besonderer Abend",
        color: "#182533",
      });
      carouselObject("gradient", {
        id: "audit-gradient",
        x: 1200,
        y: 200,
        w: 700,
        h: 500,
      });
      carouselObject("angle", {
        id: "audit-angle",
        x: 600,
        y: 600,
        w: 600,
        h: 700,
      });
      carouselObject("shape", {
        id: "audit-shape",
        x: 140,
        y: 800,
        w: 400,
        h: 300,
      });
      await prepareLogo(p.boards[0]);
      await carouselWaitForPaint();
    });
    for (const id of [
      "audit-text",
      "audit-gradient",
      "audit-angle",
      "audit-shape",
    ]) {
      await page.evaluate((id) => {
        carouselSelect([id]);
        carouselPanel();
      }, id);
      await capture("designer-" + id.replace("audit-", ""));
    }
    await page.evaluate(() => {
      studioPreferences.advanced = true;
      studioApplyPreferences();
      carouselSelect(["audit-text"]);
      carouselPanel();
    });
    await capture("designer-advanced-text", true);
    await page.locator('[data-typo-tab="paragraph"]').click();
    await capture("typography-paragraph");
    await page.evaluate(() => {
      carouselSelect(["audit-shape"]);
      carouselPanel();
    });
    await page.locator("#carouselAddEffect").click();
    await capture("effect-menu");
    await page.locator("[data-add-effect=blur]").click();
    await capture("effect-editor", true);
    await page.locator("[data-effect-done]").click();
    await page.evaluate(() => {
      carouselSelect(["audit-shape", "audit-gradient"]);
      carouselCreateFolder();
    });
    await capture("layers-folder");
    await page.evaluate(() => {
      carouselSelect(["audit-shape"]);
      carouselPanel();
    });
    await page
      .locator('[data-layer="audit-shape"] .carousel-layer-actions')
      .click();
    await capture("layer-menu");
    await page.keyboard.press("Escape");
    await page.locator("[data-paint-channel=fill]").click();
    for (const mode of ["solid", "gradient", "image"]) {
      await page.locator("#paintMode").selectOption(mode);
      await capture("picker-" + mode, mode === "gradient");
    }
    await page.locator("#paintClose").click();
    await page.evaluate(() => {
      carouselSelect([]);
      carouselPanel();
    });
    await capture("designer-empty");
    await page.locator("[data-slide='0']").click();
    await capture("slide-options");
    await page.locator("#carouselExport").click();
    await page.locator("[data-export-format=pdf]").click();
    await capture("export-pdf", true);
    await page.locator("#closeExport").click();
    for (const theme of ["light", "dark"]) {
      await page.evaluate((t) => studioSetTheme(t), theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await capture("narrow-" + theme, true);
    }
    await page.setViewportSize({ width: 1500, height: 1050 });
    const out = {
      phase,
      browser: process.env.MKW_TEST_BROWSER,
      date: new Date().toISOString(),
      axe: require("axe-core").version,
      records,
      errors,
    };
    fs.writeFileSync(
      artifact(`seven-${phase}.json`),
      JSON.stringify(out, null, 2),
    );
    assert.deepEqual(errors, []);
    if (phase !== "before") {
      const violations = records.flatMap((r) =>
        r.violations.map((v) => `${r.name}: ${v.id}`),
      );
      assert.deepEqual(violations, []);
      assert.deepEqual(
        records.flatMap((r) => r.unresolvedControls),
        [],
      );
    }
    console.log("Inventory captured:", records.length, "contexts.");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
