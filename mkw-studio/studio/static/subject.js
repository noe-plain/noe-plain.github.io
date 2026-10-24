"use strict";
const MKWSubject = (() => {
  const workerURL = "static/subject-worker.js?v=9a36a99c62d2";
  let worker,
    ready = false,
    sequence = 0,
    batchFailure = null;
  const pending = new Map();
  function skipped(code) {
    return Object.assign(Error("Personenerkennung übersprungen."), { code });
  }
  function reset(code = "unavailable") {
    batchFailure = code;
    worker?.terminate();
    worker = null;
    ready = false;
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.reject(skipped(code));
    }
    pending.clear();
  }
  function beginBatch() {
    batchFailure = null;
  }
  function skipReason() {
    return MKWSubjectModel.skipConnection(navigator.connection)
      ? "connection"
      : batchFailure;
  }
  function getWorker() {
    if (!worker) {
      const w = new Worker(workerURL);
      worker = w;
      w.onerror = (event) => {
        event.preventDefault();
        if (worker === w) reset();
      };
      w.onmessage = ({ data }) => {
        if (worker !== w) return;
        const task = pending.get(data.id);
        if (!task) return;
        if (data.error || !Array.isArray(data.people)) return reset();
        pending.delete(data.id);
        clearTimeout(task.timer);
        ready = true;
        task.resolve(data.people);
      };
    }
    return worker;
  }
  async function detect(im) {
    const reason = skipReason();
    if (reason) throw skipped(reason);
    const source = await image(im.data),
      scale = Math.min(1, 1280 / im.width, 1280 / im.height),
      canvas = makeCanvas(im.width * scale, im.height * scale);
    canvas
      .getContext("2d")
      .drawImage(source, 0, 0, canvas.width, canvas.height);
    const bitmap = await createImageBitmap(canvas),
      id = ++sequence;
    try {
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reset("timeout"),
          ready
            ? MKWSubjectModel.detectionBudget
            : MKWSubjectModel.startupBudget,
        );
        pending.set(id, { resolve, reject, timer });
        try {
          getWorker().postMessage({ id, bitmap }, [bitmap]);
        } catch {
          reset();
        }
      });
    } finally {
      bitmap.close();
      canvas.width = canvas.height = 1;
    }
  }
  function crop(board, im) {
    const position = MKWSubjectModel.position(board, im);
    if (position) Object.assign(board.image, position);
  }
  return { detect, crop, beginBatch, skipReason };
})();
