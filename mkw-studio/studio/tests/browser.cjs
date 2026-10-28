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
module.exports = { launch, artifact, waitForProjectReady };
