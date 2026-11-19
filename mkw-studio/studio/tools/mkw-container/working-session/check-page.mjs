// Runs inside the original Studio build. Private projects enter through its
// browser file API and are never served by the local test server.
import {
  copyIntoWorkspace,
  checkPortable,
  checkGrowth,
} from "./check-portable.mjs";

export async function checkSession(file, portableName = "") {
  const ensure = (pass, message) => {
    if (!pass) throw Error(message);
  };
  function connect() {
    const worker = new Worker(new URL("./check-worker.mjs", import.meta.url), {
      type: "module",
    });
    return {
      // The check is deliberately sequential. Product callers can issue dirty
      // revisions from their existing save queue using the same protocol.
      send(action, args) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error(`Zeitüberschreitung: ${action}`)),
            25_000,
          );
          worker.onmessage = ({ data }) => {
            clearTimeout(timer);
            resolve(data);
          };
          worker.onerror = (event) => {
            clearTimeout(timer);
            reject(Error(event.message));
          };
          worker.postMessage({ id: action, action, args });
        });
      },
      stop() {
        worker.terminate();
      },
    };
  }

  const sessionId = crypto.randomUUID();
  const outputHandle = portableName ? await copyIntoWorkspace(file) : null;
  let connection = connect();
  const args = {
    file: outputHandle ? await outputHandle.getFile() : file,
    sessionId,
  };
  async function call(action, options) {
    const reply = await connection.send(action, options);
    if (reply.error) throw Error(reply.error);
    return reply;
  }
  async function rejectAction(action, options, expected) {
    const reply = await connection.send(action, options);
    ensure(
      reply.error && (!expected || expected.test(reply.error)),
      `Abweisung fehlt: ${action}`,
    );
    return reply;
  }

  const hrefs = [];
  const localProject = p;
  try {
    const { value: first } = await call("open", args);
    if (outputHandle) {
      const { value: noChange } = await call("portablePlan", {
        expectedRevision: 0,
      });
      ensure(
        noChange.unchanged && noChange.bytesWritten === 0,
        "Ungeändertes ZIP erzeugte Schreibarbeit.",
      );
    }
    const { value: empty } = await call("stats");
    ensure(
      empty.assetReads === 0 && empty.assetReadBytes === 0,
      "Medien beim Öffnen gelesen.",
    );
    const contender = connect();
    try {
      const result = await contender.send("open", { ...args, resume: true });
      ensure(result.error, "Ein zweiter Worker hat denselben Stand geöffnet.");
    } finally {
      contender.stop();
    }
    const q = first.project;
    ensure(
      q.images.length > 1 && q.images.every((im) => im.data === null),
      "Test erwartet getrennte Bilddaten.",
    );
    const mode = q.carousel ? "designer" : "fd";
    const chosen = q.carousel
      ? q.carousel.objects.find((o) => o.type === "text")
      : q.boards[0];
    ensure(chosen, "Testprojekt enthält kein editierbares Textobjekt.");
    const target = (project) =>
      q.carousel
        ? project.carousel.objects.find((o) => o.id === chosen.id)
        : project.boards[0].elements.title;
    const originalText = target(q).text;
    const edit = {
      id: chosen.id,
      kind: mode,
      ...(q.carousel ? {} : { element: "title" }),
      text: originalText + " ·",
    };

    // Existing painters, with a temporary loader supplied only by this check.
    // The Designer painter invokes the loader when it needs a bitmap.
    const photos = new Set();
    q.images.forEach((im, i) => {
      im.data = JSON.stringify(["images", i, "data"]);
    });
    for (const [i, font] of q.fonts.entries()) {
      if (font.data !== null) continue;
      const { value: medium } = await call("asset", {
        path: ["fonts", i, "data"],
      });
      const url = URL.createObjectURL(medium.blob);
      hrefs.push(url);
      font.data = url;
    }
    const { value: beforePaint } = await call("stats");
    p = q;
    await loadFonts();
    const loaded = new Map();
    const bitmap = async (path) => {
      if (!loaded.has(path)) {
        const { value } = await call("asset", { path: JSON.parse(path) });
        loaded.set(path, await createImageBitmap(value.blob));
        photos.add(path);
      }
      return loaded.get(path);
    };
    async function paintPage(i) {
      const b = q.boards[i];
      const scale = 0.25;
      const canvas = makeCanvas(b.w * scale, b.h * scale);
      const ctx = exportContext(canvas);
      try {
        if (q.carousel) {
          const frame = MKWCarouselPolicy.frame(q.carousel, i);
          // Use the editor's viewport culling rule, including visual effects.
          const visible = q.carousel.objects.filter((object) =>
            MKWCarouselPolicy.intersects(carouselPaintBounds(object), frame),
          );
          await carouselPaint(
            ctx,
            i,
            scale,
            false,
            null,
            visible,
            undefined,
            bitmap,
            q,
          );
        } else {
          const photo = q.images.find((im) => im.id === b.imageId);
          const path = photo.data;
          const { value } = await call("asset", { path: JSON.parse(path) });
          photos.add(path);
          photo.data = URL.createObjectURL(value.blob);
          try {
            await paint(ctx, b, scale);
          } finally {
            URL.revokeObjectURL(photo.data);
            photo.data = path;
          }
        }
        ensure(
          ctx
            .getImageData(0, 0, canvas.width, canvas.height)
            .data.some((n) => n > 0),
          "Zeichenfläche blieb leer.",
        );
      } finally {
        for (const im of loaded.values()) im.close();
        loaded.clear();
        canvas.width = canvas.height = 1;
      }
    }
    await paintPage(0);
    const firstPhotoCount = photos.size;
    const { value: afterFirstPaint } = await call("stats");
    ensure(
      firstPhotoCount > 0 &&
        firstPhotoCount < q.images.length &&
        afterFirstPaint.assetReadBytes > beforePaint.assetReadBytes,
      "Erster Paint hat keine gezielte Bildauswahl gelesen.",
    );
    let nextViewPhotoCount = null;
    if (q.boards.length > 1) {
      await paintPage(q.boards.length - 1);
      nextViewPhotoCount = photos.size - firstPhotoCount;
      ensure(
        nextViewPhotoCount > 0,
        "Spätere Zeichenfläche hat kein weiteres Bild angefordert.",
      );
    }

    const { value: initial } = await call("describe");
    const before = await call("stats");
    const committed = await call("saveText", {
      expectedRevision: first.revision,
      edits: [edit],
    });
    const after = await call("stats");
    const saveBytes = committed.opfsWriteBytes - before.opfsWriteBytes;
    ensure(
      committed.value.revision === 1 && committed.value.changedRecords === 1,
      "Keine gezielte Textrevision.",
    );
    ensure(saveBytes > 0, "Schreibmessung am OPFS war leer.");
    ensure(
      JSON.stringify(before.value) === JSON.stringify(after.value),
      "Textänderung löste Medienzugriff aus.",
    );
    const { value: updated } = await call("describe");
    ensure(
      target(updated.project).text === edit.text,
      "Bearbeiteter Text fehlt.",
    );
    // On both sides compare the complete metadata model with that single
    // text leaf reset to its old value.
    target(updated.project).text = originalText;
    ensure(
      JSON.stringify(updated.project) === JSON.stringify(initial.project),
      "Textänderung hat andere Projektdaten geändert.",
    );

    await rejectAction(
      "saveText",
      { expectedRevision: 0, edits: [edit] },
      /inzwischen/,
    );
    const injected = await rejectAction("failSave", {
      expectedRevision: 1,
      edits: [{ ...edit, text: "Diese Änderung muss zurückgerollt werden." }],
    });
    ensure(
      injected.injectedFailures === 1,
      "VFS-Schreibfehler wurde nicht ausgelöst.",
    );
    const noChange = await call("saveText", {
      expectedRevision: 1,
      edits: [edit],
    });
    ensure(
      noChange.value.revision === 1 && noChange.value.changedRecords === 0,
      "No-op erzeugte eine Änderung.",
    );
    connection.stop();
    connection = connect();
    const recovered = await call("open", { ...args, resume: true });
    ensure(
      recovered.value.revision === 1 &&
        target(recovered.value.project).text === edit.text,
      "Arbeitsstand nicht wiederhergestellt.",
    );
    const { value: recoveryStats } = await call("stats");
    ensure(
      recoveryStats.assetReadBytes === 0 && recoveryStats.assetReads === 0,
      "Wiederaufnahme hat Medien vorab geladen.",
    );

    const noOpStart = await call("stats");
    const noOp = await call("saveText", { expectedRevision: 1, edits: [edit] });
    ensure(
      noOp.opfsWriteBytes === noOpStart.opfsWriteBytes,
      "No-op hat OPFS beschrieben.",
    );
    let portable = null;
    if (outputHandle) {
      portable = await checkPortable(outputHandle, portableName, call, ensure);
    }
    await call("close", { discard: true });
    if (portable) {
      connection.stop();
      connection = connect();
      const newSession = await call("open", {
        file: portable.file,
        sessionId: crypto.randomUUID(),
      });
      ensure(
        target(newSession.value.project).text === edit.text,
        "Textrevision fehlt im portablen ZIP.",
      );
      const { value: noChange } = await call("portablePlan", {
        expectedRevision: 0,
      });
      ensure(noChange.unchanged, "Erneutes Speichern erzeugte Schreibarbeit.");
      await call("close", { discard: true });
      if (q.boards.length === 1) {
        const growth = await copyIntoWorkspace(portable.file);
        connection.stop();
        connection = connect();
        await call("open", {
          file: await growth.getFile(),
          sessionId: crypto.randomUUID(),
        });
        await call("saveText", {
          expectedRevision: 0,
          edits: [{ ...edit, text: "Formatprüfung ".repeat(5500) }],
        });
        portable.proof.growth = await checkGrowth(growth, call, ensure);
        await call("close", { discard: true });
      }
      portable.download();
    }

    return {
      mode,
      boards: q.boards.length,
      availableImageRecords: q.images.length,
      mediaReadBytesAtOpen: empty.assetReadBytes,
      firstViewImageRecords: firstPhotoCount,
      firstViewAssetReadBytes:
        afterFirstPaint.assetReadBytes - beforePaint.assetReadBytes,
      additionalImageRecordsOnLastView: nextViewPhotoCount,
      recordsChangedByTextEdit: committed.value.changedRecords,
      sqliteAndJournalWriteBytesForTextEdit: saveBytes,
      imageReadBytesForTextEdit: 0,
      imageWriteBytesForTextEdit: 0,
      noOpWriteBytes: 0,
      injectedWriteFailureRolledBack: true,
      staleRevisionRejected: true,
      secondWorkerRejected: true,
      workerRestartRecoveredText: true,
      recoveryMediaReadBytes: recoveryStats.assetReadBytes,
      sqliteVersion: first.dbVersion,
      ...(portable ? { portable: portable.proof } : {}),
    };
  } finally {
    connection.stop();
    p = localProject;
    for (const url of hrefs) URL.revokeObjectURL(url);
  }
}
