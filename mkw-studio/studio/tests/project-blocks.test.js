const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const blocks = require("../static/project-blocks.js");
global.MKWProjectAssets = require("../static/project-assets.js");
const files = require("../static/project-file.js");
const context = {};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(require.resolve("../static/file-io.js"), "utf8"),
  context,
);
function handle(initial = new Blob([])) {
  let file = initial;
  return {
    getFile: async () => file,
    fail: false,
    opens: 0,
    async createWritable(options) {
      this.opens++;
      let next = options.keepExistingData ? file : new Blob([]);
      const owner = this;
      return {
        async write({ position, data }) {
          if (owner.fail) throw Error("Disk full");
          next = new Blob([
            next.slice(0, position),
            position > next.size
              ? new Uint8Array(position - next.size)
              : new Uint8Array(),
            data,
            next.slice(position + data.size),
          ]);
        },
        async truncate(size) {
          next = next.slice(0, size);
        },
        async close() {
          file = next;
        },
        async abort() {},
      };
    },
  };
}
async function pack(project) {
  const document = MKWProjectAssets.compact(project),
    assets = new Map();
  for (const collection of ["images", "logos", "fonts"])
    for (const item of document[collection])
      if (item.data) {
        const key = Buffer.from(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(item.data),
          ),
        ).toString("hex");
        assets.set(key, item.data);
        delete item.data;
        item.assetRef = key;
      }
  return { document, assets };
}
function project(count = 50) {
  const images = Array.from({ length: count }, (_, i) => ({
    id: String(i),
    data: "data:image/png;base64," + Buffer.alloc(40001, i).toString("base64"),
  }));
  return {
    version: 1,
    projectId: "id",
    meta: { title: "Fünfzig 🎶" },
    images,
    logos: [],
    fonts: [],
    boards: images.map((im) => ({ imageId: im.id, elements: {} })),
  };
}
async function save(h, p) {
  const plan = await blocks.prepare(await pack(p), await h.getFile());
  await context.writeFilePlan(h, plan);
  return plan;
}
test("native 50-image saves write only layout changes, preserve exact bytes, do not grow and skip unchanged files", async () => {
  const p = project(),
    h = handle();
  const first = await save(h, p),
    original = await h.getFile(),
    index = await blocks.readIndex(original);
  assert.equal(first.keepExistingData, false);
  assert.equal(index.blocks.size, 50);
  assert.deepEqual(await files.decode(original), MKWProjectAssets.compact(p));
  p.meta.title = "Anderer Titel";
  const update = await save(h, p);
  assert(update.keepExistingData);
  assert(update.bytesWritten < first.bytesWritten / 100);
  assert(
    update.writes.every((w) => w.position === 0 || w.position >= index.offset),
  );
  assert.deepEqual(
    await files.decode(await h.getFile()),
    MKWProjectAssets.compact(p),
  );
  for (let i = 0; i < 12; i++) {
    p.meta.title = "Layout " + i;
    await save(h, p);
  }
  assert(
    (await h.getFile()).size < original.size + 100,
    "No append-only layout history",
  );
  const opens = h.opens;
  assert((await save(h, p)).unchanged);
  assert.equal(h.opens, opens);
});
test("add/reuse shared bytes, remove deleted assets immediately, preserve hidden assets and migrate old gzip files", async () => {
  const p = project(3),
    h = handle(await files.encode(p));
  await save(h, p);
  const before = await blocks.readIndex(await h.getFile());
  p.images.push({ ...p.images[0], id: "duplicate" });
  p.boards.push({ imageId: "duplicate", checked: false, elements: {} });
  const duplicate = await save(h, p);
  assert(duplicate.keepExistingData);
  assert.equal((await blocks.readIndex(await h.getFile())).blocks.size, 3);
  p.images.push({
    id: "new",
    data: "data:image/png;base64," + Buffer.alloc(50, 7).toString("base64"),
  });
  p.boards.push({ imageId: "new", elements: {} });
  const added = await save(h, p);
  assert(added.keepExistingData);
  assert(added.bytesWritten < 2000);
  const after = await blocks.readIndex(await h.getFile());
  assert.equal(
    [...before.blocks.values()][0].offset,
    [...after.blocks.values()][0].offset,
  );
  const oldSize = (await h.getFile()).size;
  p.boards = p.boards.filter((b) => b.imageId !== "1");
  const deleted = await save(h, p);
  assert.equal(deleted.keepExistingData, false);
  assert((await h.getFile()).size < oldSize - 39000);
  assert.equal((await blocks.readIndex(await h.getFile())).blocks.size, 3);
  assert.deepEqual(
    await files.decode(await h.getFile()),
    MKWProjectAssets.compact(p),
  );
  assert(
    (await files.decode(await h.getFile())).boards.some(
      (b) => b.checked === false,
    ),
  );
});
test("failed writes preserve original file, truncated/altered blocks and unsupported headers reject before restore", async () => {
  const p = project(2),
    h = handle();
  await save(h, p);
  const original = await h.getFile();
  await assert.rejects(
    files.decode(original, { maxBytes: original.size + 100 }),
    /gross/,
  );
  p.meta.title = "Changed";
  h.fail = true;
  await assert.rejects(save(h, p), /Disk full/);
  assert.equal(await h.getFile(), original);
  await assert.rejects(files.decode(original.slice(0, original.size - 1)));
  const changed = new Blob([
    original.slice(0, 30),
    new Uint8Array([200]),
    original.slice(31),
  ]);
  await assert.rejects(files.decode(changed), /Datenblöcke/);
  const header = new Uint8Array(await original.slice(0, 24).arrayBuffer());
  new DataView(header.buffer).setBigUint64(
    8,
    BigInt(Number.MAX_SAFE_INTEGER) + 1n,
    true,
  );
  await assert.rejects(
    files.decode(new Blob([header, original.slice(24)])),
    /Datenblöcke/,
  );
});
