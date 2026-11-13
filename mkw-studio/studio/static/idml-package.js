/* Experimental empty-page IDML package. No DOM, project mutation or content export. */
(function (root) {
  "use strict";
  const namespace = "http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging";
  const mime = "application/vnd.adobe.indesign-idml-package";
  const encoder = new TextEncoder();
  function xml(value) {
    return String(value).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c],
    );
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++)
        crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const chunks = [],
      central = [];
    let offset = 0,
      centralLength = 0;
    for (const [name, content] of files) {
      const path = encoder.encode(name),
        data = encoder.encode(content),
        crc = crc32(data);
      const local = new Uint8Array(30 + path.length),
        view = new DataView(local.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 33, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, data.length, true);
      view.setUint32(22, data.length, true);
      view.setUint16(26, path.length, true);
      local.set(path, 30);
      const entry = new Uint8Array(46 + path.length),
        cv = new DataView(entry.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(14, 33, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, path.length, true);
      cv.setUint32(42, offset, true);
      entry.set(path, 46);
      chunks.push(local, data);
      central.push(entry);
      offset += local.length + data.length;
      centralLength += entry.length;
    }
    const end = new Uint8Array(22),
      ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralLength, true);
    ev.setUint32(16, offset, true);
    const result = new Uint8Array(offset + centralLength + end.length);
    let position = 0;
    for (const chunk of [...chunks, ...central, end]) {
      result.set(chunk, position);
      position += chunk.length;
    }
    return result;
  }
  function emptyPage({ w, h, name = "MKW IDML Test" } = {}) {
    if (![w, h].every((v) => Number.isInteger(v) && v >= 240 && v <= 4000))
      throw Error(
        "Seitenformat: ganze Pixelwerte von 240 bis 4000 erforderlich.",
      );
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 80 ||
      /[\u0000-\u001f\u007f\ud800-\udfff\ufffe\uffff]/u.test(
        name.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ""),
      )
    )
      throw Error("Ungültiger Dokumentname.");
    const width = w * 0.75,
      height = h * 0.75;
    const part = (kind, body) =>
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><idPkg:${kind} xmlns:idPkg="${namespace}" DOMVersion="21.5">${body}</idPkg:${kind}>`;
    return zip([
      ["mimetype", mime],
      [
        "META-INF/container.xml",
        `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>`,
      ],
      [
        "designmap.xml",
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><?aid style="50" type="document" readerVersion="6.0" featureSet="257"?><Document xmlns:idPkg="${namespace}" DOMVersion="21.5" Self="d" StoryList="" Name="${xml(name)}" ActiveLayer="uLayer"><idPkg:Graphic src="Resources/Graphic.xml"/><idPkg:Fonts src="Resources/Fonts.xml"/><idPkg:Styles src="Resources/Styles.xml"/><idPkg:Preferences src="Resources/Preferences.xml"/><Layer Self="uLayer" Name="MKW" Visible="true" Locked="false" Printable="true"/><idPkg:Spread src="Spreads/Spread_uSpread.xml"/></Document>`,
      ],
      ["Resources/Graphic.xml", part("Graphic", "")],
      ["Resources/Fonts.xml", part("Fonts", "")],
      ["Resources/Styles.xml", part("Styles", "")],
      [
        "Resources/Preferences.xml",
        part(
          "Preferences",
          `<DocumentPreference PageWidth="${width}" PageHeight="${height}" PagesPerDocument="1" FacingPages="false" AllowPageShuffle="false" DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0" DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"/>`,
        ),
      ],
      [
        "Spreads/Spread_uSpread.xml",
        part(
          "Spread",
          `<Spread Self="uSpread" PageCount="1" BindingLocation="0" AllowPageShuffle="false" ItemTransform="1 0 0 1 0 0"><Page Self="uPage" Name="1" AppliedMaster="n" GeometricBounds="0 0 ${height} ${width}" ItemTransform="1 0 0 1 0 0"><MarginPreference ColumnCount="1" ColumnGutter="0" Top="0" Bottom="0" Left="0" Right="0" ColumnsPositions="0 ${width}"/></Page></Spread>`,
        ),
      ],
    ]);
  }
  const api = Object.freeze({ emptyPage });
  if (typeof module !== "undefined") module.exports = api;
  else root.MKWIDML = api;
})(globalThis);
