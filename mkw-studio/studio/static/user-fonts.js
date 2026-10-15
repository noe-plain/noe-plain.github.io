"use strict";
const studioBrandFonts = [
  ["Replica LL", "Replica LL"],
  ["Harriet Regular", "Harriet Regular"],
  ["Harriet", "Harriet Bold"],
  ["Harriet Italic", "Harriet Bold Italic"],
];
function studioIsCustomFont(font) {
  return (
    font?.custom === true &&
    /^MKWCustom_[a-f0-9]{32}$/.test(font.role) &&
    typeof font.name === "string" &&
    typeof font.displayName === "string" &&
    font.displayName.length > 0 &&
    font.displayName.length <= 160 &&
    typeof font.data === "string" &&
    font.data.startsWith("data:")
  );
}
let studioFontDatabase;
function studioOpenFontDatabase() {
  if (!studioFontDatabase)
    studioFontDatabase = new Promise((resolve, reject) => {
      const request = indexedDB.open("mkw-studio-user-fonts", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("fonts", { keyPath: "role" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  return studioFontDatabase;
}
async function studioStoredFonts() {
  const db = await studioOpenFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("fonts", "readonly"),
      request = transaction.objectStore("fonts").getAll();
    request.onsuccess = () =>
      resolve(request.result.filter(studioIsCustomFont));
    request.onerror = () => reject(request.error);
  });
}
async function studioStoreFont(font) {
  const db = await studioOpenFontDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("fonts", "readwrite");
    transaction.objectStore("fonts").put(font);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}
async function studioMergeUserFonts() {
  try {
    for (const font of await studioStoredFonts())
      if (!p.fonts.some((existing) => existing.role === font.role))
        p.fonts.push(font);
  } catch {}
}
function studioFontOptions(value, system = true) {
  const custom = p.fonts
    .filter(studioIsCustomFont)
    .map((font) => [font.role, font.displayName])
    .sort((a, b) => a[1].localeCompare(b[1], "de"));
  return `<optgroup label="Markenschriften · Musikkollegium">${options(studioBrandFonts, value)}</optgroup>${custom.length ? `<optgroup label="Eigene Schriften">${options(custom, value)}</optgroup>` : ""}${
    system
      ? `<optgroup label="Systemschriften">${options(
          [
            ["Arial", "Arial"],
            ["Georgia", "Georgia"],
          ],
          value,
        )}</optgroup>`
      : ""
  }`;
}
function studioFontMetadata(buffer, fallback) {
  const result = {
    displayName: fallback,
    postscriptName: fallback.replace(/\s+/g, "-"),
  };
  try {
    const data = new DataView(buffer);
    if (buffer.byteLength < 12) return result;
    for (let i = 0; i < data.getUint16(4); i++) {
      const table = 12 + i * 16;
      if (table + 16 > buffer.byteLength) break;
      if (String.fromCharCode(...new Uint8Array(buffer, table, 4)) !== "name")
        continue;
      const start = data.getUint32(table + 8),
        count = data.getUint16(start + 2),
        strings = start + data.getUint16(start + 4),
        names = {};
      for (let j = 0; j < count; j++) {
        const record = start + 6 + j * 12,
          platform = data.getUint16(record),
          id = data.getUint16(record + 6),
          length = data.getUint16(record + 8),
          offset = strings + data.getUint16(record + 10);
        if (
          ![1, 2, 6].includes(id) ||
          offset + length > buffer.byteLength ||
          names[id]
        )
          continue;
        const bytes = new Uint8Array(buffer, offset, length);
        names[id] = new TextDecoder(
          platform === 0 || platform === 3 ? "utf-16be" : "macintosh",
        )
          .decode(bytes)
          .replace(/\0/g, "");
      }
      if (names[1])
        result.displayName = (
          names[1] + (names[2] && names[2] !== "Regular" ? " " + names[2] : "")
        ).slice(0, 160);
      if (names[6]) result.postscriptName = names[6].slice(0, 160);
      break;
    }
  } catch {}
  return result;
}
function studioRenderFontSettings() {
  const root = $("#customFontList"),
    fonts = p.fonts.filter(studioIsCustomFont);
  root.innerHTML = fonts.length
    ? fonts
        .map(
          (font) =>
            `<div class="custom-font-row"><span class="font-sample" style="font-family:${font.role}">Ag</span><span><strong>${esc(font.displayName)}</strong><small>${esc(font.name)}</small></span></div>`,
        )
        .join("")
    : "<p>Noch keine eigenen Schriften hinzugefügt.</p>";
}
$("#addCustomFonts").onclick = () => $("#customFontFiles").click();
$("#customFontFiles").onchange = async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  $("#addCustomFonts").disabled = true;
  let imported = 0,
    failed = [],
    storageMessage = "";
  try {
    for (const file of files) {
      try {
        if (
          !/\.(otf|ttf|woff2?)$/i.test(file.name) ||
          file.size > 20 * 1024 * 1024
        )
          throw Error(
            "Bitte eine OTF-, TTF- oder WOFF-Schrift bis 20 MB wählen.",
          );
        const buffer = await file.arrayBuffer(),
          hash = [
            ...new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
          ]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join(""),
          role = "MKWCustom_" + hash.slice(0, 32);
        if (p.fonts.some((font) => font.role === role)) continue;
        const metadata = studioFontMetadata(
            buffer,
            file.name.replace(/\.[^.]+$/, ""),
          ),
          font = {
            role,
            name: file.name,
            ...metadata,
            custom: true,
            data: await dataURL(file),
          };
        const face = new FontFace(role, buffer);
        await face.load();
        try {
          await studioStoreFont(font);
        } catch {
          storageMessage =
            "Schrift bleibt im Projekt erhalten. Die geräteweite Bibliothek ist in diesem Browser nicht verfügbar.";
        }
        p.fonts.push(font);
        imported++;
      } catch (error) {
        failed.push(
          `${file.name}: ${error?.message?.startsWith("Bitte ") ? error.message : "Diese Schriftdatei konnte nicht gelesen werden."}`,
        );
      }
    }
    if (imported) {
      await loadFonts();
      if (p.carousel) carouselPanel();
      else renderPanel();
    }
    studioRenderFontSettings();
    $("#fontImportStatus").textContent = [
      imported
        ? `${imported} Schrift${imported === 1 ? "" : "en"} hinzugefügt. Verwendete Schriften werden in der MKW-Datei mitgespeichert.`
        : files.length && !failed.length
          ? "Diese Schrift ist bereits vorhanden."
          : "",
      storageMessage,
      ...failed,
    ]
      .filter(Boolean)
      .join("\n");
  } finally {
    $("#addCustomFonts").disabled = false;
    event.target.value = "";
  }
};
