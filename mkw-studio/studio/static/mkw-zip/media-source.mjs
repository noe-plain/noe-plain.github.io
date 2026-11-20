import { crc32, sha256 } from "./zip-reader.mjs?v=80a0a0d9436c";

export function toBase64(bytes) {
  const parts = [];
  for (let i = 0; i < bytes.length; i += 24576)
    parts.push(btoa(String.fromCharCode(...bytes.subarray(i, i + 24576))));
  return parts.join("");
}

export async function verifiedMedia(source) {
  const bytes = new Uint8Array(await source.blob.arrayBuffer());
  if (
    bytes.length !== source.length ||
    crc32(bytes) !== source.crc ||
    (await sha256(bytes)) !== source.hash
  )
    throw Error("Ein Bild in der MKW-ZIP-Datei ist beschädigt. (Prüfsumme)");
  return bytes;
}
