// @ts-check
import { IMAGE_FIELDS } from "../../config/PluginConfig.mjs";
import { MANIFEST_PATH } from "../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { imageInfo } from "../support/imageInfo.mjs";

const MAX_BYTES = 5 * 1024 * 1024;
const MIN_ICON = 48;
const MAX_RASTER = 4096;
/** Codex validation requires these two; the portal requires a primary icon. */
const REQUIRED = ["logo", "composerIcon"];

/** Listing images: present, supported format, square icons, size limits. */
export class ImageRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  async check({ pkg }) {
    const listing = pkg.manifestObject()?.interface;
    if (!isPlainObject(listing)) return [];
    const findings = [];

    for (const field of REQUIRED) {
      if (listing[field] === undefined) {
        findings.push(this.error(`interface.${field} is required`, { path: MANIFEST_PATH }));
      }
    }

    for (const field of IMAGE_FIELDS) {
      const value = listing[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || !value.startsWith("./")) {
        findings.push(this.error(`interface.${field} must be a ./-relative path`, { path: MANIFEST_PATH }));
        continue;
      }
      const file = value.slice(2);
      if (!pkg.has(file)) {
        findings.push(this.error(`interface.${field} points to a missing file`, { path: file }));
        continue;
      }
      const bytes = await pkg.readBytes(file);
      if (bytes.length > MAX_BYTES) findings.push(this.error("image exceeds 5 MiB", { path: file }));

      const info = imageInfo(bytes);
      if (!info) {
        findings.push(this.error("image must be PNG, JPEG, WebP, or SVG with readable dimensions", { path: file }));
        continue;
      }
      if (info.width !== info.height) {
        findings.push(this.error(`icon must be square (is ${info.width}×${info.height})`, { path: file }));
      }
      if (Math.min(info.width, info.height) < MIN_ICON) {
        findings.push(this.error(`icon must be at least ${MIN_ICON}×${MIN_ICON}`, { path: file }));
      }
      if (info.format !== "svg" && Math.max(info.width, info.height) > MAX_RASTER) {
        findings.push(this.error(`raster image must be ≤${MAX_RASTER}px per side`, { path: file }));
      }
    }
    return findings;
  }
}
