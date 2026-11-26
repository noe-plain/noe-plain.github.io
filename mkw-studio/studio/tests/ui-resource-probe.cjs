const fs = require("node:fs");
const { launch, waitForProjectReady, artifact } = require("./browser.cjs");
(async () => {
  const browser = await launch();
  const result = {
    browser: browser.version(),
    platform: process.platform,
    kind: "Local Chrome baseline; synthetic 64px photo; save-data skips subject detection; no before/after optimization claim",
    runs: [],
  };
  try {
    for (const mode of ["carousel", "preview"])
      for (let attempt = 0; attempt < 3; attempt++) {
        const page = await browser.newPage({
            viewport: { width: 1500, height: 1100 },
          }),
          requests = [];
        await page.addInitScript(() =>
          Object.defineProperty(navigator, "connection", {
            value: { saveData: true, effectiveType: "4g" },
          }),
        );
        page.on("request", (request) => {
          if (["script", "stylesheet"].includes(request.resourceType()))
            requests.push(new URL(request.url()).pathname);
        });
        const begun = Date.now();
        await page.goto(process.env.STUDIO_URL);
        await page.locator("#startDesigner:not(:disabled)").waitFor();
        const initial = await page.evaluate(() => ({
          snapshot: JSON.stringify(snapshot()),
          ui: {
            toolbar: typeof carouselToolUI,
            workspace: typeof carouselRender,
            sidebar: typeof carouselPanel,
            layers: typeof carouselLegacyLayerPanel,
            icons: typeof studioIcon,
            picker: typeof studioOpenPicker,
            typography: typeof MKWTypography,
            campaign: typeof MKWCampaignUI,
          },
          helpFrames: document.querySelectorAll("#studioHelpDialog iframe")
            .length,
          editors: document.querySelectorAll("#carouselEditor").length,
        }));
        if (
          Object.values(initial.ui).some(
            (value) => !["function", "object"].includes(value),
          ) ||
          initial.editors !== 0 ||
          initial.helpFrames !== 0
        )
          throw Error("Shared startup UI is missing or eagerly mounted");
        const ready = Date.now() - begun,
          startResources = [...requests];
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestIdleCallback(resolve, { timeout: 200 }),
            ),
        );
        if (
          (await page.evaluate(() => JSON.stringify(snapshot()))) !==
          initial.snapshot
        )
          throw Error("Idle startup mutated document");
        const before = Date.now();
        await page
          .locator(
            mode === "carousel" ? "#startDesigner" : "#startCampaignPreview",
          )
          .click();
        await page.locator("#setupName").fill("UI Resource Probe");
        await page.locator("#createProject").click();
        await waitForProjectReady(page);
        const setupReady = Date.now() - before;
        if (mode === "preview") {
          const data = await page.evaluate(() => {
            const c = makeCanvas(64, 64);
            c.getContext("2d").fillRect(0, 0, 64, 64);
            return c.toDataURL().split(",")[1];
          });
          await page
            .locator("#files")
            .setInputFiles({
              name: "Probe.png",
              mimeType: "image/png",
              buffer: Buffer.from(data, "base64"),
            });
        }
        await page.waitForFunction(
          () =>
            p.carousel &&
            !busy &&
            document.querySelector("#carouselCanvas")?.width > 1,
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const after = await page.evaluate(() => ({
          editors: document.querySelectorAll("#carouselEditor").length,
          workspaces: document.querySelectorAll("#carouselViewport").length,
          sidebars: document.querySelectorAll("#carouselSidebar").length,
          helpFrames: document.querySelectorAll("#studioHelpDialog iframe")
            .length,
          photos: p.images.length,
        }));
        const firstWorkspaceMs = Date.now() - before,
          entryResources = requests.slice(startResources.length);
        await page.evaluate(async () => {
          window.resourceProbeRefs = [
            carouselToolUI,
            carouselRender,
            carouselPanel,
            carouselLegacyLayerPanel,
            studioIcon,
            studioOpenPicker,
            MKWTypography,
            MKWCampaignUI,
          ];
          await MKWProjects.autosave({ writeFile: false });
        });
        const switched = Date.now(),
          opposite = mode === "carousel" ? "preview" : "carousel",
          requestCount = requests.length;
        await page.locator("#newproject").click();
        await page.locator("[data-project-mode=" + opposite + "]").click();
        await page.locator("#setupName").fill("UI Resource Switch");
        await page.locator("#createProject").click();
        await waitForProjectReady(page);
        if (opposite === "preview") {
          const data = await page.evaluate(() => {
            const c = makeCanvas(64, 64);
            c.getContext("2d").fillRect(0, 0, 64, 64);
            return c.toDataURL().split(",")[1];
          });
          await page
            .locator("#files")
            .setInputFiles({
              name: "Switch.png",
              mimeType: "image/png",
              buffer: Buffer.from(data, "base64"),
            });
        }
        await page.waitForFunction(
          () =>
            p.carousel &&
            !busy &&
            document.querySelector("#carouselCanvas")?.width > 1,
        );
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        const switchState = await page.evaluate(() => ({
          sameFunctions: resourceProbeRefs.every(
            (v, i) =>
              v ===
              [
                carouselToolUI,
                carouselRender,
                carouselPanel,
                carouselLegacyLayerPanel,
                studioIcon,
                studioOpenPicker,
                MKWTypography,
                MKWCampaignUI,
              ][i],
          ),
          editors: document.querySelectorAll("#carouselEditor").length,
          workspaces: document.querySelectorAll("#carouselViewport").length,
          sidebars: document.querySelectorAll("#carouselSidebar").length,
          helpFrames: document.querySelectorAll("#studioHelpDialog iframe")
            .length,
        }));
        if (
          entryResources.length ||
          requests.length !== requestCount ||
          !switchState.sameFunctions ||
          [after, switchState].some(
            (state) =>
              state.editors !== 1 ||
              state.workspaces !== 1 ||
              state.sidebars !== 1 ||
              state.helpFrames !== 0,
          )
        )
          throw Error(
            "UI entry/switch loads duplicate code, mounts duplicate editors, or loads the Wiki",
          );
        result.runs.push({
          mode,
          attempt: attempt + 1,
          startReadyMs: ready,
          setupThroughRealCreateMs: setupReady,
          firstWorkspaceIncludingImportMs: firstWorkspaceMs,
          startResources,
          entryResources,
          sharedAtStart: initial.ui,
          editorsAtStart: initial.editors,
          helpAtStart: initial.helpFrames,
          ...after,
          oppositeMode: opposite,
          switchThroughRealNewProjectMs: Date.now() - switched,
          switchResources: requests.slice(requestCount),
          switchState,
        });
        await page.close();
      }
    fs.writeFileSync(
      process.env.MKW_RESOURCE_PROBE_OUTPUT || artifact("ui-resources.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
