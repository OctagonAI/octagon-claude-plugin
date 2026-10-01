import assert from "node:assert/strict";
import test from "node:test";
import { contrastRatio } from "../../tools/openai-plugin/lib/validation/support/contrast.mjs";
import { imageInfo } from "../../tools/openai-plugin/lib/validation/support/imageInfo.mjs";
import { pngHeader } from "./helpers.mjs";

test("reads PNG dimensions from the header", () => {
  assert.deepEqual(imageInfo(pngHeader(512, 256)), { format: "png", width: 512, height: 256 });
});

test("reads JPEG dimensions from the first SOF segment", () => {
  const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, // APP0, length 4
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x40, 0x00, 0x80, 0x03, // SOF0: height 64, width 128
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  assert.deepEqual(imageInfo(jpeg), { format: "jpeg", width: 128, height: 64 });
});

test("reads SVG size from width/height or viewBox", () => {
  assert.deepEqual(imageInfo(Buffer.from('<svg width="64px" height="64">')), { format: "svg", width: 64, height: 64 });
  assert.deepEqual(imageInfo(Buffer.from('<svg viewBox="0 0 128 96">')), { format: "svg", width: 128, height: 96 });
  assert.equal(imageInfo(Buffer.from('<svg width="100%">')), null);
});

test("returns null for unsupported data", () => {
  assert.equal(imageInfo(Buffer.from("GIF89a")), null);
});

test("computes WCAG contrast ratios", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(contrastRatio("#FFFFFF", "#FFFFFF"), 1);
  assert.ok(contrastRatio("#7A68AE", "#FFFFFF") >= 2);
  assert.ok(contrastRatio("#9E8DC3", "#212121") >= 2);
});
