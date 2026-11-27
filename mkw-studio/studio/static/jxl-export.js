"use strict";
const MKWJXL = (() => {
  const workerURL = "static/jxl-worker.js?v=a4f465569f14";
  const jobs = new Set();
  let queue = Promise.resolve(),
    epoch = 0;
  function cancel() {
    epoch++;
    for (const stop of [...jobs]) stop();
  }
  function encode(canvas, quality) {
    const generation = epoch,
      width = canvas.width,
      height = canvas.height;
    if (width * height > 16000000)
      return Promise.reject(
        Error(
          "JPG+ unterstützt bis zu 16 Megapixel pro Bild. Für grössere Bilder JPG oder PNG wählen.",
        ),
      );
    const pixels = canvas.getContext("2d").getImageData(0, 0, width, height)
      .data.buffer;
    const run = () =>
      new Promise((resolve, reject) => {
        if (generation !== epoch)
          return reject(new DOMException("JPG+ abgebrochen.", "AbortError"));
        const worker = new Worker(workerURL, { type: "module" });
        const done = (error, result) => {
          clearTimeout(timer);
          worker.terminate();
          jobs.delete(stop);
          error ? reject(error) : resolve(result);
        };
        const stop = () =>
          done(new DOMException("JPG+ abgebrochen.", "AbortError"));
        const timer = setTimeout(
          () =>
            done(
              Error("JPG+ benötigt zu lange. Bitte JPG oder PNG verwenden."),
            ),
          120000,
        );
        jobs.add(stop);
        worker.onerror = () =>
          done(
            Error(
              "JPG+ konnte nicht geladen werden. Bitte erneut versuchen oder JPG wählen.",
            ),
          );
        worker.onmessage = ({ data }) =>
          data.error ? done(Error(data.error)) : done(null, data);
        worker.postMessage({ pixels, width, height, quality }, [pixels]);
      });
    const result = queue.then(run, run);
    queue = result.catch(() => {});
    return result;
  }
  return Object.freeze({ encode, cancel });
})();
