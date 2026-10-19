const { test } = require('node:test'), assert = require('node:assert/strict');
global.MKWProjectAssets = require('../static/project-assets.js');
const files = require('../static/project-file.js');
function streamed(text, size = 40 * 1024 * 1024, step = 7) {
  const bytes = new TextEncoder().encode(text);
  return { size, stream: () => new ReadableStream({ start(controller) {
    for (let i = 0; i < bytes.length; i += step) controller.enqueue(bytes.slice(i, i + step));
    controller.close();
  } }) };
}
test('streamed MKW reader handles legacy JSON, nested arrays, escaped strings and UTF8 chunk boundaries', async () => {
  const project = { version: 1, meta: { title: 'Musik 🎶 „Herbst“', escaped: '"\\\n\t' }, images: [{ data: 'data:image/png;base64,AAA==' }], boards: [{ nested: [true, null, [1, 2], { key: 'value' }] }], logos: [], fonts: [] };
  const text = JSON.stringify(project);
  for (const step of [1, 7, 80]) assert.deepEqual(await files.decode(streamed(text, undefined, step)), project);
  assert.deepEqual(await files.decode(new Blob([text])), project);
});
test('streamed MKW reader rejects truncated, trailing and malformed data', async () => {
  for (const text of ['{"images":[{"data":"abc', '{"a":1}false', '{"a":[1,]}', '{"a":1,}', '{"a":1,"a":2}', '{"a":}', '{}{}'])
    await assert.rejects(files.decode(streamed(text)));
});
test('50 image files serialize asset by asset and prune deleted originals', async () => {
  const data = 'data:image/png;base64,' + 'A'.repeat(1024 * 1024), project = { version: 1, meta: {}, boards: [], images: [], logos: [], fonts: [] };
  for (let i = 0; i < 50; i++) {
    project.images.push({ id: String(i), data, original: data });
    project.boards.push({ imageId: String(i), elements: {} });
  }
  project.images.push({ id: 'deleted', data: 'unused' });
  const stringify = JSON.stringify;
  let max = 0;
  JSON.stringify = function(value) {
    const text = stringify(value);
    max = Math.max(max, text.length);
    assert(text.length < 2 * 1024 * 1024, 'No complete project string may be created');
    return text;
  };
  let blob;
  try { blob = await files.encode(project, { compress: false }); } finally { JSON.stringify = stringify; }
  assert(blob.size > 50 * 1024 * 1024);
  const decoded = await files.decode(blob);
  assert.equal(decoded.images.length, 50);
  assert(decoded.images.every(image => image.data === data && !image.original));
  assert.equal(project.images.length, 51);
  assert(max < 2 * 1024 * 1024);
});

test('compressed MKW preserves metadata/assets losslessly, legacy JSON remains readable and corrupt gzip fails', async () => {
  const project = { version: 1, meta: { title: "Musik" }, images: [{ id: "a", data: "data:image/png;base64," + "A".repeat(100000) }], boards: [{ imageId: "a", elements: {} }], logos: [], fonts: [] };
  const blob = await files.encode(project), packed = MKWProjectAssets.compact(project);
  assert.deepEqual([...new Uint8Array(await blob.slice(0, 2).arrayBuffer())], [31, 139]);
  assert(blob.size < 10000);
  assert.deepEqual(await files.decode(blob), packed);
  await assert.rejects(files.decode(blob.slice(0, blob.size - 10)));
  assert.deepEqual(await files.decode(new Blob([JSON.stringify(packed)])), packed);
});
