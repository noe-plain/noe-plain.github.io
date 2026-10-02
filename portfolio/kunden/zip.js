/* Small, uncompressed ZIP writer: avoids sending private images to a service. */
(function (scope) {
    const encoder = new TextEncoder();
    const table = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ n >>> 1 : n >>> 1; return n >>> 0; });
    function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ crc >>> 8; return (crc ^ 0xffffffff) >>> 0; }
    function header(size) { const bytes = new Uint8Array(size); return { bytes, view: new DataView(bytes.buffer) }; }
    function createZip(files) {
        const parts = [], central = [], names = new Set(); let offset = 0, centralSize = 0;
        for (const file of files) {
            let name = file.name.replace(/[\\/\x00-\x1f]/g, '-'), n = 1, unique = name;
            while (names.has(unique)) { const dot = name.lastIndexOf('.'); unique = (dot < 0 ? name : name.slice(0, dot)) + '-' + (++n) + (dot < 0 ? '' : name.slice(dot)); }
            names.add(unique);
            const filename = encoder.encode(unique), data = new Uint8Array(file.data), crc = crc32(data);
            const local = header(30); local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true); local.view.setUint16(12, 33, true);
            local.view.setUint32(14, crc, true); local.view.setUint32(18, data.length, true); local.view.setUint32(22, data.length, true); local.view.setUint16(26, filename.length, true);
            parts.push(local.bytes, filename, data);
            const dir = header(46); dir.view.setUint32(0, 0x02014b50, true); dir.view.setUint16(4, 20, true); dir.view.setUint16(6, 20, true); dir.view.setUint16(8, 0x800, true); dir.view.setUint16(14, 33, true);
            dir.view.setUint32(16, crc, true); dir.view.setUint32(20, data.length, true); dir.view.setUint32(24, data.length, true); dir.view.setUint16(28, filename.length, true); dir.view.setUint32(42, offset, true);
            central.push(dir.bytes, filename); centralSize += 46 + filename.length; offset += 30 + filename.length + data.length;
        }
        if (offset + centralSize > 0xffffffff || files.length > 65535) throw Error('Die Auswahl ist zu gross. Bitte in kleineren Gruppen herunterladen.');
        const end = header(22); end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, files.length, true); end.view.setUint16(10, files.length, true); end.view.setUint32(12, centralSize, true); end.view.setUint32(16, offset, true);
        return new Blob([...parts, ...central, end.bytes], { type: 'application/zip' });
    }
    scope.createClientZip = createZip;
    if (typeof module !== 'undefined') module.exports = { createZip };
})(typeof window !== 'undefined' ? window : globalThis);
