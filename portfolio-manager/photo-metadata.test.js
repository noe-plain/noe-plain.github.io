const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const { photoMetadata } = require('./photo-metadata');
const { processImage } = require('./media-processor');

test('All four variants retain only the selected photographic metadata', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'photo-metadata-'));
    try {
        const source = path.join(dir, 'source.jpg');
        const selected = { IFD0: { Make: 'SONY', Model: 'ILCE-7CM2' }, IFD2: { LensModel: 'FE 35mm F1.8', FNumber: '28/10', ExposureTime: '1/250', ISOSpeedRatings: '400' } };
        await sharp({ create: { width: 80, height: 40, channels: 3, background: '#abc' } }).jpeg().withExif({
            IFD0: { ...selected.IFD0, Artist: 'PRIVATE ARTIST', ImageDescription: 'PRIVATE DESCRIPTION', Orientation: '6' },
            IFD2: { ...selected.IFD2, BodySerialNumber: 'PRIVATE SERIAL', DateTimeOriginal: '2026:09:28 12:34:56', UserComment: 'PRIVATE COMMENT' },
            IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '47/1 22/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '8/1 33/1 0/1' }
        }).withMetadata({ orientation: 6 }).toFile(source);
        const original = await fs.readFile(source);
        const before = await sharp(source).metadata();
        assert.ok(before.exif.includes(Buffer.from('PRIVATE ARTIST')));
        assert.equal(before.orientation, 6);
        const expected = photoMetadata(before.exif);
        assert.deepEqual(expected.IFD0, selected.IFD0);
        assert.equal(expected.IFD2.LensModel, selected.IFD2.LensModel);
        assert.equal(expected.IFD2.ISOSpeedRatings, '400');
        const output = path.join(dir, 'out');
        await processImage(source, output, 'Foto', '.jpg');
        assert.deepEqual((await fs.readdir(output)).sort(), ['Foto-mobile.jpg', 'Foto-mobile.webp', 'Foto.jpg', 'Foto.webp', 'raw']);
        for (const file of ['Foto.jpg', 'Foto-mobile.jpg', 'Foto.webp', 'Foto-mobile.webp']) {
            const meta = await sharp(path.join(output, file)).metadata();
            assert.deepEqual(photoMetadata(meta.exif), expected, file);
            assert.equal(meta.width, 40, file + ' orientation applied');
            assert.equal(meta.height, 80);
            assert.equal(meta.xmp, undefined);
            assert.equal(meta.iptc, undefined);
            assert.ok(!meta.exif.includes(Buffer.from('PRIVATE')), file);
            assert.ok(!meta.exif.includes(Buffer.from('2026:09:28')), file);
            // No GPS or source thumbnail IFD pointers in the output IFD0.
            const b = meta.exif.subarray(6), le = b.toString('ascii', 0, 2) === 'II';
            const u16 = n => le ? b.readUInt16LE(n) : b.readUInt16BE(n);
            const u32 = n => le ? b.readUInt32LE(n) : b.readUInt32BE(n);
            const offset = u32(4), count = u16(offset);
            for (let i = 0; i < count; i++) assert.notEqual(u16(offset + 2 + i * 12), 0x8825, file + ' GPS removed');
            assert.equal(u32(offset + 2 + count * 12), 0, file + ' thumbnail removed');
        }
        assert.deepEqual(await fs.readFile(path.join(output, 'raw', 'Foto.jpg')), original);
    } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('Missing, malformed and big-endian EXIF are handled', () => {
    for (const value of [undefined, Buffer.alloc(0), Buffer.from('Exif\0\0II'), Buffer.alloc(32)]) assert.deepEqual(photoMetadata(value), {});
    const b = Buffer.alloc(26);
    b.write('MM'); b.writeUInt16BE(42, 2); b.writeUInt32BE(8, 4); b.writeUInt16BE(1, 8);
    b.writeUInt16BE(0x0110, 10); b.writeUInt16BE(2, 12); b.writeUInt32BE(4, 14); b.write('ABC\0', 18);
    assert.deepEqual(photoMetadata(b), { IFD0: { Model: 'ABC' } });
});
