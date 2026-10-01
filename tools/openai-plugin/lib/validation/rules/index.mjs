// @ts-check
import { ArchiveShapeRule } from "./ArchiveShapeRule.mjs";
import { BrandColorRule } from "./BrandColorRule.mjs";
import { ForbiddenContentRule } from "./ForbiddenContentRule.mjs";
import { ForbiddenTextRule } from "./ForbiddenTextRule.mjs";
import { ImageRule } from "./ImageRule.mjs";
import { LinkIntegrityRule } from "./LinkIntegrityRule.mjs";
import { ListingTextRule } from "./ListingTextRule.mjs";
import { ManifestShapeRule } from "./ManifestShapeRule.mjs";
import { ReviewCasesRule } from "./ReviewCasesRule.mjs";
import { SecretScanRule } from "./SecretScanRule.mjs";
import { SkillRule } from "./SkillRule.mjs";
import { UrlRule } from "./UrlRule.mjs";

/**
 * The full rule set. New checks are added here as new `Rule` subclasses;
 * existing rules don't need to change.
 *
 * @param {{
 *   knownTools: readonly string[],
 *   forbiddenText: readonly { regex: RegExp, reason: string }[],
 *   online?: boolean,
 * }} options
 * @returns {import("../Rule.mjs").Rule[]}
 */
export function createRules({ knownTools, forbiddenText, online = false }) {
  return [
    new ManifestShapeRule(),
    new ListingTextRule(),
    new UrlRule({ online }),
    new ImageRule(),
    new BrandColorRule(),
    new SkillRule(),
    new LinkIntegrityRule(),
    new ReviewCasesRule({ knownTools }),
    new ForbiddenContentRule(),
    new ForbiddenTextRule(forbiddenText),
    new SecretScanRule(),
    new ArchiveShapeRule(),
  ];
}
