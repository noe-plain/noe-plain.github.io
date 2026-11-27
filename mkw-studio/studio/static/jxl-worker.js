"use strict";
// Single-threaded WASM works on static Pages without cross-origin isolation.
self.onmessage = async ({ data }) => {
  try {
    const { pixels, width, height, quality } = data;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height > 16000000 ||
      pixels.byteLength !== width * height * 4
    )
      throw Error(
        "JPG+ unterstützt bis zu 16 Megapixel pro Bild. Für grössere Bilder JPG oder PNG wählen.",
      );
    const [{ default: encoder }, { default: decoder }] = await Promise.all([
      import("./vendor/jxl-1.3.0/encoder.js"),
      import("./vendor/jxl-1.3.0/decoder.js"),
    ]);
    const enc = await encoder(),
      encoded = enc.encode(new Uint8ClampedArray(pixels), width, height, {
        effort: 5,
        quality: Math.max(10, Math.min(100, quality)),
        progressive: false,
        epf: -1,
        lossyPalette: false,
        decodingSpeedTier: 0,
        photonNoiseIso: 0,
        lossyModular: false,
        lossless: quality === 100,
      });
    if (!encoded?.length) throw Error("JPEG-XL konnte nicht erstellt werden.");
    const buffer = Uint8Array.from(encoded).buffer;
    const dec = await decoder(),
      result = dec.decode(new Uint8Array(buffer));
    if (!result || result.width !== width || result.height !== height)
      throw Error("JPEG-XL konnte nicht überprüft werden.");
    const preview = Uint8ClampedArray.from(result.data).buffer;
    self.postMessage({ buffer, preview, width, height }, [buffer, preview]);
  } catch (error) {
    self.postMessage({
      error: error.message || "JPG+ konnte nicht erstellt werden.",
    });
  }
};
