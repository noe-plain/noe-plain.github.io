const playwright = require(process.env.PLAYWRIGHT_PATH || "playwright");
const fs = require("node:fs");
async function launch() {
  const engine = process.env.MKW_TEST_BROWSER || "chromium";
  if (!["chromium", "firefox", "webkit"].includes(engine))
    throw Error("Unknown test browser: " + engine);
  if (engine !== "chromium")
    return playwright[engine].launch({
      headless: !process.env.MKW_TEST_HEADED,
    });
  const localChrome =
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    executablePath =
      process.env.CHROME_PATH ||
      (process.platform === "darwin" && fs.existsSync(localChrome)
        ? localChrome
        : undefined);
  return playwright.chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
}
const path = require("node:path"),
  os = require("node:os");
function artifact(name) {
  const directory = process.env.MKW_TEST_OUTPUT || os.tmpdir();
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, name);
}
async function waitForProjectReady(page) {
  await page.waitForFunction(
    () =>
      typeof busy !== "undefined" &&
      !busy &&
      !document.querySelector("#projectSetup")?.open &&
      !document.querySelector("#startDialog")?.open,
  );
}
async function openLatestProject(page) {
  await page.locator("#startOpen").click();
  await page.locator("#projectLibraryList[aria-busy=false]").waitFor();
  const rows = page.locator("#projectLibraryList [data-project-id]");
  if (!(await rows.count()))
    throw Error(
      "No browser project available: " +
        (await page.locator("#projectOpenStatus").textContent()),
    );
  await rows.first().click();
  await waitForProjectReady(page);
}
async function selectTextScope(page, selector, values) {
  if (
    selector === "[data-paragraph-selection]" &&
    (await page.locator("[data-typo-all]").isVisible())
  )
    await page.locator("[data-typo-all]").click();
  await page.locator(selector).evaluate((el) => {
    const picker = el.closest("details");
    if (picker) picker.open = true;
  });
  const desired = new Set(
      (Array.isArray(values) ? values : [values]).map(String),
    ),
    inputs = page.locator(selector).locator('input[type="checkbox"]');
  for (let i = 0; i < (await inputs.count()); i++) {
    const input = inputs.nth(i),
      value = await input.inputValue();
    await input.setChecked(desired.has(value));
  }
}
async function ensureCanvasTextEditing(page) {
  const active = await page.evaluate(() =>
    p.carousel
      ? carouselUI.editing?.id === carouselSelected()[0]?.id
      : editingText?.boardId === selected && editingText?.key === layer,
  );
  if (!active) await page.locator("[data-text-edit-action]").click();
  await page.waitForFunction(() =>
    p.carousel
      ? carouselUI.editing?.id === carouselSelected()[0]?.id
      : editingText?.boardId === selected && editingText?.key === layer,
  );
  await page.evaluate(() =>
    MKWInlineText.focus(p.carousel ? carouselUI.editing.el : editingText.el),
  );
}
async function canvasTextRange(page, start, end) {
  await ensureCanvasTextEditing(page);
  await page.evaluate(
    ({ start, end }) => {
      const el = p.carousel ? carouselUI.editing.el : editingText.el,
        o = p.carousel ? carouselSelected()[0] : board().elements[layer];
      MKWTypography.restoreSelection(el, { start, end });
      MKWTypography.track(o, start, end);
    },
    { start, end },
  );
}
async function fillCanvasText(page, value) {
  const length = await page.evaluate(() => {
    const o = p.carousel ? carouselSelected()[0] : board().elements[layer];
    return o.text.length;
  });
  await canvasTextRange(page, 0, length);
  await page.keyboard.press("Backspace");
  const parts = value.split(/([\n\u2028])/);
  for (const part of parts) {
    if (part === "\n") await page.keyboard.press("Enter");
    else if (part === "\u2028") await page.keyboard.press("Shift+Enter");
    else if (part) await page.keyboard.insertText(part);
  }
  await page.waitForFunction(
    (value) =>
      (p.carousel ? carouselSelected()[0] : board().elements[layer]).text ===
      value,
    value,
  );
  await page.locator("[data-text-edit-action]").click();
}
module.exports = {
  ensureCanvasTextEditing,
  fillCanvasText,
  canvasTextRange,
  launch,
  artifact,
  waitForProjectReady,
  openLatestProject,
  selectTextScope,
};
