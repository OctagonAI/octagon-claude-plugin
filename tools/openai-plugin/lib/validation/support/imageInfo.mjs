// @ts-check

/** @typedef {{ format: "png" | "jpeg" | "webp" | "svg", width: number, height: number }} ImageInfo */

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Reads format and pixel dimensions from image bytes without decoding them.
 * Supports the formats the plugin portal accepts: PNG, JPEG, WebP, and SVG.
 *
 * @param {Buffer} bytes
 * @returns {ImageInfo | null} `null` when the format is unsupported or the header is unreadable.
 */
export function imageInfo(bytes) {
  return png(bytes) ?? jpeg(bytes) ?? webp(bytes) ?? svg(bytes);
}

/** @param {Buffer} bytes @returns {ImageInfo | null} */
function png(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  if (bytes.toString("ascii", 12, 16) !== "IHDR") return null;
  return { format: "png", width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** @param {Buffer} bytes @returns {ImageInfo | null} */
function jpeg(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return { format: "jpeg", height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/** @param {Buffer} bytes @returns {ImageInfo | null} */
function webp(bytes) {
  if (bytes.length < 30 || bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }
  const chunk = bytes.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { format: "webp", width: 1 + bytes.readUIntLE(24, 3), height: 1 + bytes.readUIntLE(27, 3) };
  }
  if (chunk === "VP8L") {
    const bits = bytes.readUInt32LE(21);
    return { format: "webp", width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  if (chunk === "VP8 ") {
    return { format: "webp", width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

/** @param {Buffer} bytes @returns {ImageInfo | null} */
function svg(bytes) {
  const text = bytes.toString("utf8", 0, Math.min(bytes.length, 4096));
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return null;

  const attribute = (/** @type {string} */ name) =>
    new RegExp(`\\s${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
  const numeric = (/** @type {string | undefined} */ value) =>
    value && /^\s*[\d.]+\s*(?:px)?\s*$/.test(value) ? Number.parseFloat(value) : undefined;

  const width = numeric(attribute("width"));
  const height = numeric(attribute("height"));
  if (width !== undefined && height !== undefined) return { format: "svg", width, height };

  const viewBox = attribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (viewBox?.length === 4 && viewBox.every(Number.isFinite)) {
    return { format: "svg", width: viewBox[2], height: viewBox[3] };
  }
  return null;
}
