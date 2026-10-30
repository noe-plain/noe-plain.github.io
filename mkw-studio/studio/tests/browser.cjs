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
module.exports = { launch, artifact, waitForProjectReady, openLatestProject };
