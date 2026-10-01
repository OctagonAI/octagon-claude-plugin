// @ts-check
import { MANIFEST_PATH } from "../../manifest/ManifestBuilder.mjs";
import { isPlainObject } from "../../util/object.mjs";
import { Rule } from "../Rule.mjs";
import { HEX_COLOR, contrastRatio } from "../support/contrast.mjs";

const MIN_CONTRAST = 2;
const CHECKS = [
  { field: "brandColor", background: "#FFFFFF" },
  { field: "brandColorDark", background: "#212121" },
];

/** Brand colors must be `#RRGGBB` with at least 2:1 contrast against the theme background. */
export class BrandColorRule extends Rule {
  /** @param {import("../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const listing = pkg.manifestObject()?.interface;
    if (!isPlainObject(listing)) return [];
    const findings = [];
    for (const { field, background } of CHECKS) {
      const value = listing[field];
      if (value === undefined) continue;
      if (typeof value !== "string" || !HEX_COLOR.test(value)) {
        findings.push(this.error(`interface.${field} must be #RRGGBB`, { path: MANIFEST_PATH }));
        continue;
      }
      const ratio = contrastRatio(value, background);
      if (ratio < MIN_CONTRAST) {
        findings.push(
          this.error(`interface.${field} has ${ratio.toFixed(2)}:1 contrast against ${background}; needs ≥${MIN_CONTRAST}:1`, { path: MANIFEST_PATH }),
        );
      }
    }
    return findings;
  }
}
