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
 * @typedef {{
 *   knownTools: readonly string[],
 *   forbiddenText: readonly import("./ForbiddenTextRule.mjs").ForbiddenText[],
 *   online?: boolean,
 * }} RuleOptions
 */

/**
 * Rules about the skills and text that every target ships, whatever its
 * manifest format.
 *
 * @param {Pick<RuleOptions, "forbiddenText">} options
 * @returns {import("../Rule.mjs").Rule[]}
 */
export function createSharedRules({ forbiddenText }) {
  return [
    new SkillRule(),
    new LinkIntegrityRule(),
    new ForbiddenContentRule(),
    new ForbiddenTextRule(forbiddenText),
    new SecretScanRule(),
  ];
}

/**
 * Rules about the OpenAI directory's manifest, listing, review cases, and ZIP.
 *
 * @param {Pick<RuleOptions, "knownTools" | "online">} options
 * @returns {import("../Rule.mjs").Rule[]}
 */
export function createOpenAIRules({ knownTools, online = false }) {
  return [
    new ManifestShapeRule(),
    new ListingTextRule(),
    new UrlRule({ online }),
    new ImageRule(),
    new BrandColorRule(),
    new ReviewCasesRule({ knownTools }),
    new ArchiveShapeRule(),
  ];
}

/**
 * The full OpenAI rule set, in the order it has always run. New checks are
 * added to one of the two groups above; existing rules don't need to change.
 *
 * @param {RuleOptions} options
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
