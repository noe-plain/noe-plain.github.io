// Read only the camera settings we publish, never GPS, serial numbers or MakerNotes.
// Sharp supplies EXIF as a TIFF buffer, optionally prefixed with "Exif\0\0".
function photoMetadata(exif) {
    if (!Buffer.isBuffer(exif)) return {};
    const data = exif.subarray(exif.subarray(0, 6).equals(Buffer.from('Exif\0\0')) ? 6 : 0);
    const result = {};
    try {
        const endian = data.toString('ascii', 0, 2);
        if (endian !== 'II' && endian !== 'MM') return {};
        const u16 = offset => endian === 'II' ? data.readUInt16LE(offset) : data.readUInt16BE(offset);
        const u32 = offset => endian === 'II' ? data.readUInt32LE(offset) : data.readUInt32BE(offset);
        if (u16(2) !== 42) return {};
        function readIFD(offset, allowed) {
            const values = {};
            const count = u16(offset);
            if (count > 4096 || offset + 2 + count * 12 > data.length) return values;
            for (let i = 0; i < count; i++) {
                const entry = offset + 2 + i * 12;
                const tag = u16(entry), type = u16(entry + 2), length = u32(entry + 4);
                if (!allowed[tag]) continue;
                const size = ({ 2: 1, 3: 2, 4: 4, 5: 8 })[type];
                if (!size || !length || length > 1024) continue;
                const bytes = size * length, start = bytes <= 4 ? entry + 8 : u32(entry + 8);
                if (start + bytes > data.length) continue;
                let value;
                if (type === 2) value = data.toString('utf8', start, start + bytes).replace(/\0.*$/s, '').trim();
                else if (length === 1 && type === 3) value = String(u16(start));
                else if (length === 1 && type === 4) value = String(u32(start));
                else if (length === 1 && type === 5 && u32(start + 4)) value = `${u32(start)}/${u32(start + 4)}`;
                if (value) values[allowed[tag]] = value;
            }
            return values;
        }
        const camera = readIFD(u32(4), { 0x010f: 'Make', 0x0110: 'Model', 0x8769: 'ExifOffset' });
        const exifOffset = Number(camera.ExifOffset);
        delete camera.ExifOffset;
        if (Object.keys(camera).length) result.IFD0 = camera;
        if (exifOffset && exifOffset + 2 <= data.length) {
            const settings = readIFD(exifOffset, { 0x829a: 'ExposureTime', 0x829d: 'FNumber', 0x8827: 'ISOSpeedRatings', 0xa434: 'LensModel' });
            if (Object.keys(settings).length) result.IFD2 = settings;
        }
    } catch {
        // Broken or incomplete EXIF must not prevent an otherwise valid image upload.
    }
    return result;
}
module.exports = { photoMetadata };
