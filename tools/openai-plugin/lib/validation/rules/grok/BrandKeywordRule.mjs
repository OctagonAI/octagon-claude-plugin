// @ts-check
import { GROK_MANIFEST_PATH } from "../../../manifest/GrokManifestBuilder.mjs";
import { Rule } from "../../Rule.mjs";

/**
 * Terms the marketplace maintainers push back on because they would fire the
 * plugin suggestion on unrelated requests. Venue and vendor names we do not
 * own are included for the same reason.
 */
export const GENERIC_KEYWORDS = Object.freeze([
  "finance",
  "financial",
  "stocks",
  "stock",
  "equities",
  "markets",
  "market data",
  "research",
  "api",
  "mcp",
  "cli",
  "deploy",
  "database",
  "data",
  "sec",
  "sec filings",
  "earnings",
  "odds",
  "forecasting",
  "prediction markets",
  "prediction-markets",
  "kalshi",
  "polymarket",
]);

/**
 * Keywords drive Grok Build's proactive plugin suggestion, so every one must
 * carry the brand and none may be a generic term on its own.
 */
export class BrandKeywordRule extends Rule {
  /** @type {string} */ #brand;

  /** @param {{ brand: string }} options Lowercase brand token every keyword must contain. */
  constructor({ brand }) {
    super();
    this.#brand = brand.toLowerCase();
  }

  /** @param {import("../../Rule.mjs").ValidationContext} context */
  check({ pkg }) {
    const keywords = pkg.manifestObject()?.keywords;
    if (!Array.isArray(keywords)) return [];
    const at = { path: GROK_MANIFEST_PATH };
    const findings = [];
    const seen = new Set();
    for (const raw of keywords) {
      if (typeof raw !== "string") continue;
      const keyword = raw.trim().toLowerCase();
      if (GENERIC_KEYWORDS.includes(keyword)) {
        findings.push(this.error(`keyword "${raw}" is a generic term; the marketplace rejects keywords that would mis-fire the plugin suggestion`, at));
      } else if (!keyword.includes(this.#brand)) {
        findings.push(this.error(`keyword "${raw}" must contain the brand "${this.#brand}"`, at));
      }
      if (seen.has(keyword)) findings.push(this.error(`duplicate keyword "${raw}"`, at));
      seen.add(keyword);
    }
    return findings;
  }
}
