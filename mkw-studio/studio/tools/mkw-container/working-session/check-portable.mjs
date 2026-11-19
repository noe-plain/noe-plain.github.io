import { openMkwZip, sha256 } from "../../../static/mkw-zip/zip-reader.mjs";

export async function copyIntoWorkspace(source) {
  const root = await navigator.storage.getDirectory();
  const handle = await root.getFileHandle(crypto.randomUUID() + ".mkw", {
    create: true,
  });
  await writeSaveFile(handle, source);
  return handle;
}

export async function checkPortable(handle, name, call, ensure) {
  const before = await handle.getFile();
  const identity = await sha256(await before.arrayBuffer());
  const zip = await openMkwZip(before);
  const { value: statsBefore } = await call("stats");
  const { value: plan } = await call("portablePlan", { expectedRevision: 1 });
  const { value: statsAfter } = await call("stats");
  ensure(
    plan.keepExistingData && plan.bytesWritten > 0,
    "Kein inkrementeller ZIP-Schreibplan.",
  );
  ensure(
    statsAfter.assetReadBytes === statsBefore.assetReadBytes,
    "Speichern las Medien.",
  );

  // Independently compare actual writable-stream calls against the positions
  // read from the original directory and local ZIP headers.
  const ranges = await Promise.all(
    [...zip.entries.values()]
      .filter((e) => e.name.startsWith("assets/"))
      .map(async (e) => {
        const start = await zip.payloadOffset(e);
        return [start, start + e.size];
      }),
  );
  let actual = 0;
  let mediaOverlap = 0;
  async function write(failFirst) {
    const observedHandle = {
      getFile: () => handle.getFile(),
      async createWritable(options) {
        ensure(
          options.keepExistingData && options.mode === "exclusive",
          "Kein exklusiver Schreibplan.",
        );
        const writable = await handle.createWritable(options);
        return {
          async write(packet) {
            await writable.write(packet);
            const end = packet.position + packet.data.byteLength;
            actual += packet.data.byteLength;
            for (const [start, stop] of ranges)
              mediaOverlap += Math.max(
                0,
                Math.min(end, stop) - Math.max(packet.position, start),
              );
            if (failFirst) throw Error("Erzwungener ZIP-Schreibabbruch.");
          },
          truncate: (size) => writable.truncate(size),
          abort: () => writable.abort(),
          close: () => writable.close(),
        };
      },
    };
    return writeFilePlan(observedHandle, plan);
  }
  try {
    await write(true);
    ensure(false, "Abbruchtest schrieb erfolgreich.");
  } catch (error) {
    ensure(
      error.message === "Erzwungener ZIP-Schreibabbruch.",
      "Unerwarteter Schreibfehler.",
    );
  }
  ensure(
    (await sha256(await (await handle.getFile()).arrayBuffer())) === identity,
    "Abbruch änderte das ZIP.",
  );
  actual = 0;
  mediaOverlap = 0;
  await write(false);
  const result = await handle.getFile();
  const revised = await openMkwZip(result);
  ensure(
    revised.manifest.formatVersion === 3 && result.size === before.size,
    "Falsches ZIP-Revisionsprofil.",
  );
  ensure(
    actual === plan.bytesWritten && mediaOverlap === 0,
    "ZIP hat unerwartete Bytes geschrieben.",
  );
  await revised.readDatabase();
  // Replay the old plan on a stale target. The actual file writer must reject it.
  try {
    await writeFilePlan(handle, plan);
    ensure(false, "Veralteter Plan schrieb erfolgreich.");
  } catch (error) {
    ensure(
      error.message.includes("ausserhalb"),
      "Unerwarteter Fehler beim Dateikonflikt.",
    );
  }
  return {
    file: result,
    download: () => download(result, name),
    proof: {
      initialCopyBytes: before.size,
      updatedZipBytes: result.size,
      actuallyWrittenBytes: actual,
      mediaReadBytesForPlanning: 0,
      mediaWriteBytes: mediaOverlap,
      archiveWriteAbortPreservedFile: true,
      staleFileStampRejected: true,
    },
  };
}

export async function checkGrowth(handle, call, ensure) {
  const old = await openMkwZip(await handle.getFile());
  const { value: plan } = await call("portablePlan", { expectedRevision: 1 });
  ensure(
    !plan.keepExistingData && plan.size > old.file.size,
    "Kein ZIP-Neuaufbau bei Datenbankwachstum.",
  );
  await writeFilePlan(handle, plan);
  const fresh = await openMkwZip(await handle.getFile());
  await fresh.readDatabase();
  ensure(
    fresh.entries.size === old.entries.size,
    "ZIP-Neuaufbau erzeugte alte Einträge.",
  );
  for (const [hash, bytes] of old.assets) {
    ensure(
      fresh.assets.get(hash) === bytes,
      "ZIP-Neuaufbau verlor ein Medium.",
    );
    await fresh.readAsset(hash);
  }
  return { fullRewriteBytes: plan.bytesWritten, assetCount: fresh.assets.size };
}
